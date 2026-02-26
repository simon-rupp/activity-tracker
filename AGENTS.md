# Agent Guide: Activity Tracker

This file is for future Codex/human contributors to ramp up quickly and make safe changes.

## 1) App Summary

Activity Tracker is a Next.js 16 App Router application for authenticated users to log lift and run workouts.

Core product capabilities:

- Email/password auth with verification, resend verification, forgot/reset password
- Optional Google OAuth login/signup
- Lift logging with multi-row exercise entries and reusable muscle groups
- Run logging with distance + duration tracking
- Calendar-first review (`3d`, `week`, `month` on mobile; month grid on desktop)
- Summary analytics (`week`, `month`, `all`)
- PWA installability + offline fallback route

## 2) Read-First File Order

If you are new to the repo, read in this order:

1. `README.md`
2. `architecture.md`
3. `prisma/schema.prisma`
4. `src/lib/auth-session.ts`
5. `src/lib/auth.ts`
6. `src/lib/auth-email.ts`
7. `src/lib/forms.ts`
8. `src/app/(protected)/page.tsx`
9. `src/app/(protected)/summary/page.tsx`
10. `src/app/(protected)/lifts/actions.ts`
11. `src/app/(protected)/runs/actions.ts`

## 3) Project Structure

- `src/app`: route tree
  - `src/app/(protected)`: authenticated app shell and pages
  - `src/app/login`, `signup`, `forgot-password`, `reset-password`, `verify-email`
  - `src/app/auth/google/route.ts`, `src/app/auth/google/callback/route.ts`
  - `src/app/manifest.ts`, `src/app/offline/page.tsx`, `src/app/unlock/page.tsx`
- `src/components`: reusable UI (`LiftForm`, nav, confirm delete, timezone sync, PWA register)
- `src/lib`: auth/session/email/oauth, form parsing, formatting, timezone/date helpers, Prisma client
- `prisma/schema.prisma`: data model
- `prisma/migrations/*`: SQL history
- `public/sw.js`: service worker

## 4) Critical Invariants

Do not violate these invariants:

- Every user-facing data query/mutation must be ownership-scoped (`userId`) unless intentionally global.
- Protected pages should rely on `requireCurrentUser()` from `src/lib/auth.ts`.
- Authenticated user must also be email-verified (`emailVerifiedAt`) to pass `getCurrentUser()`.
- Session token format/signature must remain compatible with `createSessionToken` and `getUserIdFromSessionToken`.
- Dates are stored as `YYYY-MM-DD` strings (not DB date type). Keep lexical range semantics in mind.
- Lift weight is integer tenths (`weightTenths`) and run distance is integer hundredths (`distanceHundredths`).
- Run duration is stored as seconds from validated `mm:ss` or `hh:mm:ss` input.
- Lift create/update should continue to upsert exercise/muscle-group suggestions per user.
- OAuth callback must validate `state` via cookie before exchanging code.
- Token emails use hashed tokens in DB, never raw tokens.

## 5) Auth And Session Model

- Cookie name: `activity_session`
- Session payload: `{ userId, exp }`, base64url-encoded + HMAC SHA-256 signature (`APP_SESSION_SECRET`)
- Login route checks password hash and verified email
- Sign-up sends verification email and does not auto-login
- Forgot-password and resend-verification flows should avoid account enumeration
- Google OAuth behavior:
  - start route sets `google_oauth_state` cookie
  - callback validates state, fetches profile, enforces Google email verification
  - links by `googleSubject`, or by matching email if not already linked elsewhere

## 6) Domain Model Notes

Main tables:

- `User`
- `Exercise` (`@@unique([userId, name])`)
- `MuscleGroup` (`@@unique([userId, name])`)
- `LiftSession` -> `LiftEntry` -> `LiftEntryMuscleGroup`
- `RunSession`
- `EmailVerificationToken`
- `PasswordResetToken`

Migration note:

- `20260219000000_add_users_auth` intentionally drops and recreates workout/auth tables to enforce per-user ownership.

## 7) Routing + UI Responsibilities

- `src/app/(protected)/layout.tsx`: auth gate + top nav + timezone cookie sync
- `src/app/(protected)/page.tsx`: calendar, summaries per day, selected-day details, delete actions
- `src/app/(protected)/summary/page.tsx`: aggregate stats by range
- `src/app/(protected)/lifts/*` + `runs/*`: create/edit screens
- `src/components/lift-form.tsx`: dynamic client lift entries with suggestion UX

## 8) Time Zone Behavior

- Time zone source order:
  1. `activity_tracker_tz` cookie
  2. request headers (`x-time-zone`, `x-vercel-ip-timezone`)
  3. server fallback
- `todayDateString(timeZone)` drives defaults and summary windows.
- `TimeZoneCookieSync` sets cookie from browser and triggers `router.refresh()`.

## 9) PWA / Offline Behavior

- Service worker registered only in production (`PwaRegister`).
- `public/sw.js`:
  - pre-caches offline page + icons + manifest
  - network-first for navigation
  - cache-first for static assets
- Offline fallback route is `/offline`.

## 10) Dev Commands

- `npm install`
- `npm run dev`
- `npm run lint`
- `npm run build`
- `npm run start`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:migrate:deploy`
- `npm run vercel-build`

## 11) Expected Verification Before PR

No automated test suite is configured yet.

Required checks:

- `npm run lint`
- manual smoke tests:
  - sign up, verify email, login/logout
  - resend verification link
  - forgot/reset password
  - Google OAuth flow (if env configured)
  - create/edit/delete lifts and runs
  - calendar view switching (`3d`, `week`, `month`) + day details
  - summary range switching (`week`, `month`, `all`)

## 12) Safe Change Playbooks

When adding/changing features:

- New protected page:
  - place under `src/app/(protected)/...`
  - rely on layout auth gate
  - scope all Prisma queries by `user.id`
- New form payload:
  - add parse/validation in `src/lib/forms.ts`
  - keep strict server-side checks even if client validates
- New auth/email behavior:
  - implement in `src/lib/auth-email.ts`
  - preserve hashed token pattern and TTL cleanup
- New data model fields:
  - update `prisma/schema.prisma`
  - create migration
  - update relevant parse/format/UI logic together

## 13) Security And Config

- Never commit `.env` or secrets.
- Required env vars:
  - `DATABASE_URL`
  - `APP_SESSION_SECRET`
  - `APP_BASE_URL`
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
- Optional:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- Local Resend sender option: `onboarding@resend.dev`

## 14) Practical Gotchas

- PowerShell path handling:
  - paths with `(protected)` and `[id]` may require `-LiteralPath`.
- Avoid editing generated artifacts:
  - `.next/**`, `node_modules/**`, Prisma generated internals unless intentionally regenerated.
- Keep import aliases as `@/*` for `src`.

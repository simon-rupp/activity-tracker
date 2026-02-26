# Architecture Guide: Activity Tracker

This document is a deeper technical map than `README.md` and complements `AGENTS.md`.
Use it when you need to make non-trivial changes safely and quickly.

## 1) Product And Runtime Overview

Activity Tracker is a Next.js App Router application for authenticated users to log lift and run workouts.
Core guarantees are:

- Strict per-user data ownership
- Verified-email-only access to protected app features
- Stable date and numeric storage formats for workout metrics
- Predictable server-validated form handling

Primary stack:

- Next.js 16 + React 19 + TypeScript
- Prisma + PostgreSQL
- Tailwind CSS 4
- Zod for server-side payload validation
- `bcryptjs` for password hashing
- Resend API for auth emails

## 2) High-Level Architecture

The app is organized in three layers:

- Route/UI layer: `src/app/**`, `src/components/**`
- Domain logic and integration layer: `src/lib/**`
- Persistence layer: `prisma/schema.prisma`, migrations

Request lifecycle (protected flows):

1. User request enters a route under `src/app/(protected)/**`.
2. `src/app/(protected)/layout.tsx` calls `requireCurrentUser()`.
3. `requireCurrentUser()` depends on signed cookie parsing and DB user lookup.
4. Page loads user-scoped Prisma data.
5. Form submits invoke server actions in `lifts/actions.ts` or `runs/actions.ts`.
6. Actions parse and validate payloads via `src/lib/forms.ts`.
7. Actions persist with Prisma (always ownership-scoped).
8. Actions `revalidatePath("/")` and redirect back to calendar context.

## 3) Route Boundaries

Public routes:

- `/login`
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/verify-email`
- `/auth/google`
- `/auth/google/callback`
- `/offline`
- `/unlock` (redirects to login)

Protected routes:

- `/` calendar + selected-day details
- `/summary` range analytics
- `/lifts/new`, `/lifts/[id]/edit`
- `/runs/new`, `/runs/[id]/edit`

Auth gate:

- Implemented centrally in `src/app/(protected)/layout.tsx`
- Uses `requireCurrentUser()` from `src/lib/auth.ts`
- Do not re-implement auth checks ad hoc in protected pages

## 4) Auth, Session, And Identity

Session model:

- Cookie name: `activity_session`
- Payload: `{ userId, exp }`
- Token format: `base64url(payload).base64url(hmac_sha256(payload, APP_SESSION_SECRET))`
- Code: `src/lib/auth-session.ts`

Critical behavior:

- Missing `APP_SESSION_SECRET` disables usable auth state (`getCurrentUser()` returns null)
- Session lookup includes email verification check (`emailVerifiedAt` required)
- `setSessionCookie()` and `clearSessionCookie()` live in `src/lib/auth.ts`

Email/password flow:

- Sign-up stores bcrypt hash, sends verification email, no auto-login
- Login requires valid hash and verified email
- Forgot password does not enumerate accounts
- Reset uses one-time hashed token with TTL

Google OAuth flow:

- Start route sets `google_oauth_state` cookie and redirects to Google auth URL
- Callback validates query `state` against cookie before token exchange
- Profile must have verified Google email
- Linking logic:
  - Prefer existing user by `googleSubject`
  - Else find by email and link if not linked elsewhere
  - Else create a new verified user with random generated password hash

## 5) Data Model And Invariants

Core tables:

- `User`
- `Exercise`
- `MuscleGroup`
- `LiftSession`
- `LiftEntry`
- `LiftEntryMuscleGroup`
- `RunSession`
- `SavedLift`
- `EmailVerificationToken`
- `PasswordResetToken`

Ownership model:

- Every user-facing entity includes or is reachable through `userId`
- Query/mutation paths must include ownership constraints
- Never rely on route params alone for ownership safety

Key relations:

- `LiftSession` (1) -> (many) `LiftEntry`
- `LiftEntry` (many) <-> (many) `MuscleGroup` via `LiftEntryMuscleGroup`
- `RunSession` belongs to `User`
- `SavedLift` links `User` to reusable `LiftSession` templates

Uniqueness rules:

- `User.email` unique
- `User.googleSubject` unique (nullable)
- `Exercise` unique by (`userId`, `name`)
- `MuscleGroup` unique by (`userId`, `name`)
- `SavedLift` unique by (`userId`, `liftSessionId`)
- token hash fields unique for verification/reset

Migration context:

- `20260219000000_add_users_auth` intentionally dropped/recreated workout tables to enforce ownership
- `20260219010000_add_google_oauth` added `googleSubject`
- `20260225000000_add_saved_lifts` added reusable saved lifts

## 6) Data Representation Rules

Dates:

- Stored as `YYYY-MM-DD` strings, not SQL date types
- Range filtering relies on lexical ordering (`gte` / `lte`)
- Month values use `YYYY-MM`

Lift weights:

- User input allows whole or one decimal place
- Stored as integer tenths (`weightTenths`)
- Format helper returns fixed one decimal

Run distance:

- User input allows whole or up to two decimals
- Stored as integer hundredths (`distanceHundredths`)

Run duration:

- User input accepts `mm:ss` or `hh:mm:ss`
- Stored as integer seconds (`durationSeconds`)

These conventions are shared between parsers (`src/lib/forms.ts`) and formatters (`src/lib/format.ts`).

## 7) Form Parsing And Server Action Pipelines

Parsing:

- `parseDate`, `parseSessionId`, `parseLiftPayload`, `parseRunPayload` in `src/lib/forms.ts`
- Fail-fast parser strategy: invalid payloads throw, actions redirect with `?error=invalid`
- Client-side checks in UI are convenience only; server parsing is the source of truth

Lift create/update pipeline (`src/app/(protected)/lifts/actions.ts`):

1. Parse payload from `FormData`.
2. Resolve exercise and muscle-group IDs via user-scoped upsert patterns.
3. Create or update parent `LiftSession`.
4. Rebuild child entries for updates (delete then recreate).
5. Revalidate calendar and redirect back into month/day context.

Run create/update pipeline (`src/app/(protected)/runs/actions.ts`):

1. Parse payload from `FormData`.
2. Create/update user-scoped `RunSession`.
3. Revalidate calendar and redirect back into month/day context.

Delete behavior:

- Deletes are ownership-scoped and then redirect to calculated calendar context
- Redirect helper sanitizes month/day/view values before constructing URL

## 8) Calendar And Summary Query Design

Calendar page (`src/app/(protected)/page.tsx`):

- Determines active month/day/mobile view from query params
- Loads month-bounded lifts and runs in parallel
- Builds in-memory day summaries for cell rendering
- Loads selected-day saved-lift state from `SavedLift`
- Supports mobile windows (`3d`, `week`) and full month grid

Summary page (`src/app/(protected)/summary/page.tsx`):

- Supports `week`, `month`, `all` ranges
- Range start is computed from timezone-adjusted "today"
- Aggregates:
  - lift count
  - per-muscle-group set totals
  - run count
  - total and average distance
  - average duration

## 9) Time Zone Behavior

Resolution order (`src/lib/request-timezone.ts`):

1. Cookie `activity_tracker_tz`
2. Headers `x-time-zone`, then `x-vercel-ip-timezone`
3. Server-local fallback if none valid

Propagation model:

- `TimeZoneCookieSync` client component writes browser timezone to cookie
- On timezone change it calls `router.refresh()` to refresh server-rendered defaults
- `todayDateString(timeZone)` is used for:
  - default date on create forms
  - summary range windows
  - calendar default selection behavior

## 10) Email And Token Security Model

Token generation in `src/lib/auth-email.ts`:

- Raw token: cryptographically random base64url
- Persisted token: SHA-256 hash only (raw token never stored)
- One active token per user per flow (verification or reset) via delete-and-create
- TTLs:
  - verification: 24h
  - password reset: 1h

Verification/reset cleanup:

- Expired tokens are deleted when encountered
- Successful verification/reset invalidates related tokens

Account-enumeration resistance:

- Forgot-password and resend-verification return neutral success messaging

## 11) PWA And Offline Strategy

Registration:

- Client component `PwaRegister` registers `/sw.js` only in production

Service worker (`public/sw.js`):

- Pre-caches offline route + icons + manifest
- Navigation requests use network-first with offline fallback
- Static assets use cache-first with network fill
- Cache versioning uses `CACHE_NAME`

Offline route:

- `/offline` provides a retry UI

## 12) Configuration And Environment

Required env vars:

- `DATABASE_URL`
- `APP_SESSION_SECRET`
- `APP_BASE_URL`
- `RESEND_API_KEY`
- `EMAIL_FROM`

Optional:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Base URL behavior (`src/lib/email.ts`):

- Preference order:
  1. `APP_BASE_URL`
  2. `VERCEL_BRANCH_URL`
  3. `VERCEL_URL`
- Values are normalized to URL origin

## 13) Extension Playbooks For Future Agents

Adding a protected page:

1. Place route under `src/app/(protected)/...`
2. Rely on layout auth gate (do not duplicate login checks)
3. Scope all Prisma queries by current `user.id`

Adding/changing form payload:

1. Update parser in `src/lib/forms.ts`
2. Keep strict server checks even if client validates
3. Update formatter/helper functions if representation changes
4. Update UI defaults and edit pages for backward compatibility

Adding auth/email behavior:

1. Implement core flow in `src/lib/auth-email.ts` or OAuth libs/routes
2. Preserve hash-only token storage
3. Preserve non-enumerating user messages where relevant

Changing schema:

1. Update `prisma/schema.prisma`
2. Create migration
3. Update dependent route actions, parser logic, and display formatting together

## 14) Verification Checklist Before Merge

Automated:

- `npm run lint`

Manual smoke:

- sign up -> verify -> login/logout
- resend verification
- forgot/reset password
- Google OAuth login/signup (if configured)
- create/edit/delete lift and run entries
- calendar view switching (`3d`, `week`, `month`) + selected-day details
- summary range switching (`week`, `month`, `all`)

## 15) Known Operational Gotchas

- PowerShell route-path quoting can break on `(protected)` and `[id]`; use `-LiteralPath`
- Keep import aliases as `@/*`
- Avoid editing generated artifacts (`.next/**`, `node_modules/**`)
- Do not change session token shape or signature algorithm without migration strategy

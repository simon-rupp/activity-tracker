# Repository Guidelines

## Project Structure & Module Organization
- `src/app` contains Next.js App Router routes.
- Protected app routes live in `src/app/(protected)`:
  - Calendar and day details: `src/app/(protected)/page.tsx`
  - Summary dashboard: `src/app/(protected)/summary/page.tsx`
  - Lift and run create/edit flows: `src/app/(protected)/lifts/*`, `src/app/(protected)/runs/*`
- Auth and account recovery routes live in `src/app/login`, `src/app/signup`, `src/app/forgot-password`, `src/app/reset-password`, and `src/app/verify-email`.
- Google OAuth routes are in `src/app/auth/google/route.ts` and `src/app/auth/google/callback/route.ts`.
- `src/components` contains reusable UI components (forms, nav, delete confirmation, timezone sync).
- `src/lib` contains business logic and utilities (auth/session, auth email flows, Google OAuth, parsing, formatting, timezone, Prisma client).
- `prisma/schema.prisma` defines data models; SQL migrations are in `prisma/migrations/*`.
- `public` stores static assets.

## Build, Test, and Development Commands
- `npm install`: install dependencies (also runs Prisma client generation via `postinstall`).
- `npm run dev`: run local development server.
- `npm run lint`: run ESLint checks.
- `npm run build`: create production build.
- `npm run start`: run production server.
- `npm run prisma:generate`: regenerate Prisma client.
- `npm run prisma:migrate`: create/apply migration in development.
- `npm run prisma:migrate:deploy`: apply existing migrations (deployment/CI use).
- `npm run vercel-build`: Vercel build pipeline (`prisma generate`, `migrate deploy`, `next build`).

## Coding Style & Naming Conventions
- Use TypeScript with strict typing and explicit payload parsing for forms/actions.
- Use 2-space indentation, semicolons, and consistent import ordering.
- Prefer `@/*` imports for `src` paths.
- Follow Next.js naming conventions: `page.tsx`, `layout.tsx`, `route.ts`, `actions.ts`.
- Use `camelCase` for functions/variables, `PascalCase` for components/types.

## Testing Guidelines
- No automated test framework is configured yet.
- Required pre-PR checks: `npm run lint` and manual smoke tests for:
  - sign up, log in, and log out
  - email verification and resend verification link
  - forgot/reset password flow
  - Google OAuth sign-in (when OAuth env vars are configured)
  - create/edit/delete lifts
  - create/edit/delete runs
  - calendar navigation (`3d`, `week`, `month`) and selected-day detail panel
  - summary range switching (`week`, `month`, `all`)
- If adding tests, place them near the feature (example: `src/lib/date.test.ts`) and add a corresponding npm script.

## Commit & Pull Request Guidelines
- Keep commits short, focused, and imperative (example: `fix timezone fallback`).
- Prefer one logical change per commit.
- PRs should include:
  - what changed and why
  - any migration or env var changes
  - screenshots/GIFs for UI updates
  - verification steps and commands run

## Security & Configuration Tips
- Never commit `.env` files or secrets.
- Required env vars for local development: `DATABASE_URL`, `APP_SESSION_SECRET`, `APP_BASE_URL`, `RESEND_API_KEY`, `EMAIL_FROM`.
- Optional env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (required only for Google sign-in).
- For Resend local testing, `onboarding@resend.dev` is a valid sender for `EMAIL_FROM`.

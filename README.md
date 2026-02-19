# Activity Tracker

Activity Tracker is a Next.js app for tracking lifting and running workouts with account-based data isolation.

## Features

- Email/password auth:
  - Sign up, log in, log out
  - Email verification (with resend support)
  - Forgot password and reset password by email
- Optional Google OAuth sign-in/sign-up
- Lift tracking:
  - Session title, notes, date
  - Multiple exercises per session
  - Sets/reps/weight per exercise
  - Reusable exercise and muscle-group suggestions
- Run tracking:
  - Date, distance, duration, notes
- Calendar workflow:
  - Desktop month grid
  - Mobile `3d`, `week`, and `month` views
  - Per-day detail panel with edit/delete actions
- Summary page with `week`, `month`, and `all` ranges
- Per-user data isolation across all models

## Tech Stack

- Next.js 16 + TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS 4
- Zod for server-side form parsing

## Requirements

- Node.js 20+
- A PostgreSQL database
- A Resend account/API key for verification/reset emails
- Optional: Google Cloud OAuth credentials for Google sign-in

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

3. Set values in `.env`:

- `DATABASE_URL`
- `APP_SESSION_SECRET` (long random string)
- `APP_BASE_URL` (for local: `http://localhost:3000`)
- `RESEND_API_KEY`
- `EMAIL_FROM` (for local testing, `onboarding@resend.dev` works)
- `GOOGLE_CLIENT_ID` (optional)
- `GOOGLE_CLIENT_SECRET` (optional)

4. Apply migrations:

```bash
npm run prisma:migrate
```

5. Start development server:

```bash
npm run dev
```

6. Open `http://localhost:3000/signup` and create an account.

## Environment Variables

- Required for normal local usage:
  - `DATABASE_URL`
  - `APP_SESSION_SECRET`
  - `APP_BASE_URL`
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
- Optional:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`

Notes:

- Google sign-in UI is shown only when both Google env vars are configured.
- In deployed environments, URL resolution can fall back to `VERCEL_BRANCH_URL` / `VERCEL_URL` when `APP_BASE_URL` is not set.

## Scripts

- `npm run dev`: Start local dev server
- `npm run build`: Create production build
- `npm run start`: Run production server
- `npm run lint`: Run ESLint
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:migrate`: Create/apply migrations in development
- `npm run prisma:migrate:deploy`: Apply existing migrations (CI/deploy)
- `npm run vercel-build`: `prisma generate && prisma migrate deploy && next build`

## Deployment (Vercel + Prisma Postgres)

1. Create a Vercel project from this repo.
2. Add Prisma Postgres in Vercel Marketplace and connect it.
3. Configure env vars in Vercel:
   - `DATABASE_URL`
   - `APP_SESSION_SECRET`
   - `APP_BASE_URL` (recommended)
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `GOOGLE_CLIENT_ID` (optional)
   - `GOOGLE_CLIENT_SECRET` (optional)
4. Use build command:

```bash
npm run vercel-build
```

5. Deploy.

## Data/Formatting Rules

- Lift weight: stored as pounds in tenths (`0.1` precision)
- Run distance: stored as miles in hundredths (`0.01` precision)
- Run duration input: `mm:ss` or `hh:mm:ss`

## Manual Smoke Tests

Run these before submitting changes:

- `npm run lint`
- Sign up, verify email, and log in
- Resend verification link flow
- Forgot/reset password flow
- Google OAuth flow (when configured)
- Create/edit/delete lifts
- Create/edit/delete runs
- Calendar navigation and selected-day details
- Summary range switching (`week`, `month`, `all`)

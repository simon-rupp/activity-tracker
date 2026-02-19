# Activity Tracker

Workout tracker for lifts and runs with:

- Email/password authentication (sign up, log in, log out)
- Email verification and password reset by email
- Lift logging with reusable exercises and muscle groups
- Run logging in miles
- Month calendar with per-day summaries
- Edit/delete support from day details
- Per-user data isolation for all workout data

## Tech Stack

- Next.js 16 + TypeScript
- Prisma ORM
- PostgreSQL
- Tailwind CSS 4

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env
```

3. Set values in `.env`:
   - `DATABASE_URL`
   - `APP_SESSION_SECRET` (long random string)
   - `APP_BASE_URL` (example: `http://localhost:3000`)
   - `RESEND_API_KEY`
   - `EMAIL_FROM`

4. Configure Resend (free tier works):
   - Create an API key in Resend.
   - Use `onboarding@resend.dev` for testing sender in development.
   - For production, configure your own verified sender/domain in Resend.

5. Apply migrations:

```bash
npm run prisma:migrate
```

6. Start the app:

```bash
npm run dev
```

7. Open the app and create an account on `/signup`.

## Deploying To Vercel + Prisma Postgres

1. Create a Vercel project from this repo.
2. Add Prisma Postgres through the Vercel Marketplace and connect it to the project.
3. Configure environment variables in Vercel:
   - `DATABASE_URL`
   - `APP_SESSION_SECRET`
   - `APP_BASE_URL` (your Vercel URL or custom domain)
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
4. Set build command to:

```bash
npm run vercel-build
```

5. Deploy. Build runs:
   - `prisma generate`
   - `prisma migrate deploy`
   - `next build`

Recommended environment split:
- Production environment uses a production DB.
- Preview environment uses a separate preview DB.

## Precision Rules

- Lift weight is stored in pounds with 1 decimal precision (`0.1` step).
- Run distance is stored in miles with 2 decimal precision (`0.01` step).
- Run duration accepts `mm:ss` or `hh:mm:ss`.

## Notes

- Multiple lifts and runs are allowed on the same date.
- New entries default to today, but date is editable.
- Delete operations are hard deletes.

# Activity Tracker

Single-user workout tracker for lifts and runs with:

- Passcode lock screen
- Lift logging with reusable exercises
- Run logging in miles
- Month calendar with per-day summaries
- Edit/delete support from day details

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

3. Set `DATABASE_URL` in `.env` to a PostgreSQL database.

4. Generate a passcode hash:

```bash
npm run hash:passcode -- your-passcode
```

5. Put the escaped output line into `.env` as `APP_PASSCODE_HASH`.
   Next.js expands `$` in env files, so bcrypt hashes must use `\$`.

6. Set a long random `APP_SESSION_SECRET` in `.env`.

7. Apply migrations:

```bash
npm run prisma:migrate
```

8. Start the app:

```bash
npm run dev
```

## Deploying To Vercel + Prisma Postgres

1. Create a Vercel project from this repo.
2. Add Prisma Postgres through the Vercel Marketplace and connect it to the project.
3. Configure environment variables in Vercel:
   - `DATABASE_URL`
   - `APP_PASSCODE_HASH`
   - `APP_SESSION_SECRET`
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

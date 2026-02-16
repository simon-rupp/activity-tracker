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
- SQLite (local dev)
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

3. Generate a passcode hash:

```bash
npm run hash:passcode -- your-passcode
```

4. Put the output into `.env` as `APP_PASSCODE_HASH`.

5. Set a long random `APP_SESSION_SECRET` in `.env`.

6. Run the initial migration:

```bash
npm run prisma:migrate -- --name init
```

7. Start the app:

```bash
npm run dev
```

## Precision Rules

- Lift weight is stored in pounds with 1 decimal precision (`0.1` step).
- Run distance is stored in miles with 2 decimal precision (`0.01` step).
- Run duration accepts `mm:ss` or `hh:mm:ss`.

## Notes

- Multiple lifts and runs are allowed on the same date.
- New entries default to today, but date is editable.
- Delete operations are hard deletes.

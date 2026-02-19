# Repository Guidelines

## Project Structure & Module Organization
- `src/app` contains Next.js App Router routes. Protected screens live in `src/app/(protected)`, and auth entry is `src/app/unlock/page.tsx`.
- `src/components` contains reusable UI components (forms, nav, buttons).
- `src/lib` contains business logic and utilities (auth/session, parsing, formatting, timezone, Prisma client).
- `prisma/schema.prisma` defines data models; SQL migrations are in `prisma/migrations/*`.
- `public` stores static assets. `scripts/hash-passcode.mjs` is a setup utility.

## Build, Test, and Development Commands
- `npm install`: install dependencies (also runs Prisma client generation).
- `npm run dev`: run local development server.
- `npm run lint`: run ESLint checks.
- `npm run build`: create production build.
- `npm run prisma:migrate`: create/apply migration in development.
- `npm run prisma:migrate:deploy`: apply existing migrations (deployment/CI use).
- `npm run vercel-build`: Vercel build pipeline (`prisma generate`, `migrate deploy`, `next build`).
- `npm run hash:passcode -- <passcode>`: generate escaped bcrypt hash for `.env`.

## Coding Style & Naming Conventions
- Use TypeScript with strict typing and explicit payload parsing for forms/actions.
- Use 2-space indentation, semicolons, and consistent import ordering.
- Prefer `@/*` imports for `src` paths.
- Follow Next.js naming conventions: `page.tsx`, `layout.tsx`, `actions.ts`.
- Use `camelCase` for functions/variables, `PascalCase` for components/types.

## Testing Guidelines
- No automated test framework is configured yet.
- Required pre-PR checks: `npm run lint` and manual smoke tests for:
  - unlock flow
  - create/edit/delete lifts
  - create/edit/delete runs
  - calendar navigation
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
- Required env vars: `DATABASE_URL`, `APP_PASSCODE_HASH`, `APP_SESSION_SECRET`.
- In `.env`, escape bcrypt `$` characters as `\$`.

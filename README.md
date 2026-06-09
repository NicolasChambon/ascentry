# Ascentry

Ascentry is a SaaS that lets Strava athletes go further than the official app: it syncs your activities, builds a gallery of your Strava photos, and (later) surfaces advanced training stats and AI coaching.

Built on top of the Strava API, with production-grade security, testing and CI from day one.

## Features

**MVP**

- Account management — sign up, log in, log out (hashed passwords, JWT access + refresh tokens).
- Sync your full Strava activity history into your Ascentry account.
- Browse a gallery of all your Strava photos.

**Beyond MVP**

- Advanced statistics dashboard.
- AI coaching assistant (training advice & session feedback) — isolated behind a feature flag.

## Tech stack

| Area | Choices |
|---|---|
| **Backend** | NestJS, Prisma 7 (Postgres driver adapter), PostgreSQL, Zod (`nestjs-zod`), Pino |
| **Frontend** | React 19 + Vite, TypeScript, Tailwind CSS v4, shadcn/ui |
| **Shared** | `@ascentry/shared` — Zod schemas + inferred types, dual CJS/ESM build (tsup) |
| **Tooling** | pnpm workspaces, TypeScript (strict), ESLint (type-checked), Prettier, Vitest |
| **Infra** | Docker (dev database), Render (hosting), Neon (managed Postgres), GitHub Actions (CI/CD) |

## Repository structure

```
ascentry/
├─ apps/
│  ├─ api/        # NestJS API (REST, /api prefix)
│  └─ web/        # React + Vite single-page app
├─ packages/
│  └─ shared/     # Zod schemas + types shared between api and web
├─ compose.yaml   # Dev infrastructure (PostgreSQL)
└─ docs/local/    # Local-only notes (not pushed)
```

The single source of truth for data contracts lives in `@ascentry/shared`: define a Zod schema once, infer the TypeScript type from it, and consume both on the API and the web app.

## Prerequisites

- **Node 24** (via [fnm](https://github.com/Schniz/fnm) or nvm — the version is pinned in `.nvmrc`)
- **pnpm** via Corepack (`corepack enable`)
- **Docker** (for the local PostgreSQL container)

## Getting started

```bash
pnpm setup   # .env, dependencies, Postgres, Prisma client, migrations
pnpm dev     # starts the API (:3000), the web app (:5173) and database GUI (:5555)
```

- API health: http://localhost:3000/api/health
- Web app: http://localhost:5173
- Database GUI (Prisma Studio): http://localhost:5555

`pnpm setup` is a one-time bootstrap; `pnpm dev` is your everyday command. Only the database runs in Docker — the API and web app run on the host for fast hot-reload and full IDE support.

## Available scripts

Run from the repository root:

| Command | Description |
|---|---|
| `pnpm setup` | One-time bootstrap (env, deps, DB, Prisma client, migrations) |
| `pnpm dev` | Run database + API + web + Prisma Studio in parallel |
| `pnpm test` | Run the test suites of every package |
| `pnpm lint` / `pnpm lint:fix` | ESLint across the monorepo |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm typecheck` | Type-check every package |
| `pnpm check` | `format:check` + `lint` + `typecheck` (what CI runs) |

Database tasks (Prisma) on the API package:

```bash
pnpm --filter @ascentry/api db:migrate    # create/apply a migration (dev)
pnpm --filter @ascentry/api db:generate   # regenerate the Prisma client
pnpm --filter @ascentry/api db:studio     # open Prisma Studio
```

## Environment variables

Each app documents its variables in a committed `.env.example`. Copy it to `.env` (done automatically by `pnpm setup`) and fill in the values. `.env` files are git-ignored and never contain production secrets.

API (`apps/api/.env`):

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (required) |
| `NODE_ENV` | `development` \| `test` \| `production` |
| `PORT` | API port (default `3000`) |
| `LOG_LEVEL` | Pino log level (default `info`) |

Environment variables are validated with Zod at startup — the API fails fast with a clear error if a required one is missing.

## Testing

Tests run on [Vitest](https://vitest.dev/) and live next to the code they cover (`*.test.ts`).

```bash
pnpm test                              # everything
pnpm --filter @ascentry/web test       # one package
pnpm --filter @ascentry/api test:watch # watch mode
```

Front-end component tests use React Testing Library (jsdom). End-to-end tests (Playwright) and API integration tests (Supertest) are added on critical paths as features land.

## Code quality

The project targets a "professional startup" level of strictness:

- TypeScript `strict` plus `noUncheckedIndexedAccess`, `noImplicitReturns`, and more.
- ESLint `strictTypeChecked` — `any` and type assertions (`as`) are disallowed; the documented escape hatch is an `eslint-disable` with a required justification.
- Data crossing the HTTP boundary is always validated with Zod; Prisma models never leak to the API surface.

`pnpm check` mirrors the CI pipeline — run it before pushing.

## Deployment

Two environments, hosted on **Render** (API as a Docker web service, web as a static site) with **Neon** for managed Postgres (one branch per environment).

| Environment | Trigger |
|---|---|
| **Staging** | Automatic on merge to `main` (migrations applied via GitHub Actions, app redeployed by Render) |
| **Production** | Push a release tag, then approve the run in GitHub Actions |

Releasing to production:

```bash
git checkout main && git pull
git tag v0.1.0
git push origin v0.1.0
```

Then open **Actions → Deploy Production**, click **Review deployments → Approve**. The workflow applies migrations to Neon production and deploys the tagged commit to Render.

## Development workflow

Trunk-based: branch → pull request → CI (lint, typecheck, test, build) → merge to `main`. `main` is protected and requires a green CI run before merging.

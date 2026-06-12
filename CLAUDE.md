# CLAUDE.md

Guidance for AI agents working in this repo. Follow these conventions; keep changes consistent with the existing code.

## Project

**Ascentry** — a SaaS that extends Strava for athletes (sync activities, photo gallery; later: advanced stats, AI coaching). Built on the Strava API.

## Stack & structure

pnpm workspaces monorepo:

- `apps/api` — NestJS API (**CommonJS**), all routes under `/api`.
- `apps/web` — React 19 + Vite + Tailwind v4 + shadcn/ui.
- `packages/shared` — Zod schemas + inferred types shared by api and web (dual CJS/ESM build via tsup).

## Commands

- `pnpm dev` — run db + api + web + Prisma Studio. `pnpm setup` — one-time bootstrap.
- `pnpm test` — all tests. `pnpm lint`, `pnpm typecheck`, `pnpm check` (= format:check + lint + typecheck, mirrors CI).
- DB (Prisma): `pnpm --filter @ascentry/api db:migrate | db:generate | db:studio`.

**Before considering a task done, run `pnpm check` and the relevant tests.**

## Architecture

- **Modular monolith.** One module per domain (`auth`, `strava-integration`, `activities`, `photos`, `stats`, `coaching`). Each: `controller → service`.
- **No repository layer.** Inject `PrismaService` directly into services. Extract a repository only when a service accumulates heavy/complex queries — earned, not by default.
- **Never leak a Prisma model to the API.** Services map to Zod DTOs at the boundary.
- **Ports for external/volatile integrations** (interfaces): a `StravaClient` and a `CoachingProvider` (LLM) behind interfaces. Light hexagonal, not dogmatic DDD.
- **Coaching module is isolated and disabled behind a feature flag** (legal gray area on sending Strava data to an external LLM — must be cuttable via one env var).

## Types & validation

- TypeScript `strict` + `noUncheckedIndexedAccess`, `noImplicitReturns`, etc.
- **No `any`, no `as`** (`consistent-type-assertions: 'never'`). Escape hatch: an `eslint-disable` line **with a required justification**.
- **Zod is the single source of truth** for runtime validation AND static types (schema → `z.infer`). In Nest: `nestjs-zod` (`createZodDto` + global `ZodValidationPipe`). Validate env vars at startup → fail fast. Share schemas via `@ascentry/shared`.

## Front-end

- **Server state → TanStack Query** (introduced with the auth feature). **Client state → Zustand**, only when a real need appears. **Never** store server data in Zustand.
- Tailwind v4 (CSS-first config). shadcn components live in `apps/web/src/components/ui` — vendored code; ESLint is relaxed there, don't refactor it to satisfy lint.

## Database (Prisma 7)

- Prisma 7 has **no Rust engine** → it uses a **driver adapter** (`@prisma/adapter-pg`). The connection URL is passed to `PrismaClient` via the adapter, taken from the Zod-validated `ConfigService`.
- Generated client lives in `apps/api/src/generated/prisma` (git-ignored), generator `moduleFormat = "cjs"` (the api is CommonJS).
- Migrations: `prisma migrate dev` locally, `prisma migrate deploy` in CI/prod.

## Tests

- **Vitest**, colocated as `*.test.ts` next to the code. React Testing Library (jsdom) for components. Tests are expected for new logic.
- Lint is relaxed in `*.{test,spec}.*` files (mocks/fixtures/assertions are allowed there).

## Code review (when tagged with `@claude`)

Act as a concise, constructive senior reviewer. Prioritize — don't drown the signal.

Focus on what tooling can't catch (lint, format, typecheck and tests already run via
husky and CI):

- Correctness bugs and unhandled edge cases.
- Prisma models leaking to the API instead of being mapped to a Zod DTO.
- Missing input validation, or a missing Zod schema at a boundary.
- New logic shipped without tests.
- Strava data leaving the coaching module or bypassing its feature flag (legal boundary).
- `eslint-disable` lines whose justification is weak or bogus (the linter forces a
  justification but can't judge whether it's legitimate).

Skip style and formatting (Prettier + ESLint own that) and subjective preferences.

Format: a short summary, then findings tagged 🔴 blocking / 🟡 consider / 🟢 nice-to-have,
each pointing at `file:line`. If nothing notable, say so in one sentence. Comment only;
don't push commits.

## Deployment

- **Render** (api as a Docker web service, web as a static site) + **Neon** (managed Postgres, one branch per environment).
- **Staging**: automatic on merge to `main`. **Production**: push a tag `vX.Y.Z`, then approve the **Deploy Production** run in GitHub Actions (migrations on Neon prod + Render deploy of the tagged commit).

## Workflow

- Trunk-based: branch → PR → CI (lint, typecheck, test, build) → merge to `main`. `main` is protected; CI must be green to merge.
- Conventional Commits.

## See also

- `docs/local/todo.md` — deferred decisions & tech debt (not pushed).
- `README.md` — human-facing setup & overview.

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
- **Colors are semantic role tokens — never a raw palette index.** Use `bg-background`, `text-foreground`, `text-muted-foreground`, `border-input`, `text-destructive`, `bg-card`/ text-card-foreground`… (defined in `apps/web/src/index.css`). No `slate-_`/`red-_`in a component. If a role is missing, add a role-named token in`index.css`, not a hardcoded color. Keeps dark mode automatic (the `.dark` block already maps every token).
- **Reach for an existing shadcn component before hand-rolling markup**; add new ones with `pnpm dlx shadcn@latest add <name>` rather than reimplementing (e.g. an icon button is `Button variant="ghost" size="icon"`, not a styled `<button>`). Exception: don't adopt shadcn's `form` (it forces react-hook-form) — keep the manual `useState` + Zod `safeParse`.

## Database (Prisma 7)

- Prisma 7 has **no Rust engine** → it uses a **driver adapter** (`@prisma/adapter-pg`). The connection URL is passed to `PrismaClient` via the adapter, taken from the Zod-validated `ConfigService`.
- Generated client lives in `apps/api/src/generated/prisma` (git-ignored), generator `moduleFormat = "cjs"` (the api is CommonJS).
- Migrations: `prisma migrate dev` locally, `prisma migrate deploy` in CI/prod.

## Tests

- **Vitest**, colocated as `*.test.ts` next to the code. React Testing Library (jsdom) for components. Tests are expected for new logic.
- Lint is relaxed in `*.{test,spec}.*` files (mocks/fixtures/assertions are allowed there).

## Code review (when tagged with `@claude-review`)

Act as a concise, constructive senior reviewer. Prioritize — don't drown the signal.

Focus on what tooling can't catch (lint, format, typecheck and tests already run via
husky and CI):

- Correctness bugs and unhandled edge cases.
- Prisma models leaking to the API instead of being mapped to a Zod DTO.
- Missing input validation, or a missing Zod schema at a boundary.
- New logic shipped without tests.
- Strava data leaving the coaching module or bypassing its feature flag (legal boundary).
- `eslint-disable` lines whose justification is weak or bogus (the linter forces a justification but can't judge whether it's legitimate).

Skip style and formatting (Prettier + ESLint own that) and subjective preferences.

**Out of scope — never report findings here:** vendored shadcn components under
`apps/web/src/components/ui/`. It's third-party code we don't own or hand-edit; treat it as a black box even when a diff touches it.

Tag every finding with a severity label:

- 🔴 **Blocking** — a bug, correctness issue, or legal-boundary breach; must be fixed before merge.
- 🟡 **Recommended** — should be addressed, but not a merge blocker.
- 🟢 **Nit** — minor or optional polish; take it or leave it.

Format: leave **inline comments on the exact lines** for localized findings, then post a single PR comment with a short overall summary plus any cross-cutting points. Each finding
points at `file:line` and carries its severity label. If nothing notable, say so in one sentence. Comment only; don't push commits.

## Deployment

- **Render** (api as a Docker web service, web as a static site) + **Neon** (managed Postgres, one branch per environment).
- **Staging**: automatic on merge to `main`. **Production**: push a tag `vX.Y.Z`, then approve the **Deploy Production** run in GitHub Actions (migrations on Neon prod + Render deploy of the tagged commit).
- **A new _required_ env var (no Zod default) must be provisioned in _every_ environment, or the app refuses to boot.** `validateEnv` fails fast at startup, so adding the var to the Zod schema + local `.env` is not enough — set it in **all four** places: `.env.example` (template), the CI job `env:` block in `.github/workflows/ci.yml` (tests boot a Nest module → `ConfigModule` validates `process.env`), the **Render staging** service, and the **Render prod** service **before** that environment runs the new code. Adding it only to your local `.env` passes locally but breaks CI, then staging, then prod (each surfaces the same `Invalid environment variables` boot error). Use real per-environment values for secrets; **an encryption key must stay stable for the life of the data it encrypts** (rotating it makes existing ciphertext undecryptable).

## Workflow

- Trunk-based: branch → PR → CI (lint, typecheck, test, build) → merge to `main`. `main` is protected; CI must be green to merge.
- Conventional Commits.

## See also

- `docs/local/todo.md` — deferred decisions & tech debt (not pushed).
- `README.md` — human-facing setup & overview.

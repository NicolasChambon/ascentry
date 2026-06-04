# Ascentry — Project Overview

Ascentry is a SaaS that extends Strava for athletes. It relies on the
Strava API. MVP scope: email/password auth (JWT + refresh), import of the
user's activities, and a gallery of their Strava photos. Post-MVP: advanced
stats dashboard and an AI coaching assistant.

## Monorepo (pnpm workspaces, Node 24 LTS)

- apps/api → NestJS backend
- apps/web → React + Vite frontend
- packages/shared → Zod schemas and types shared by api and web
- packages/config → reserved for future shared tooling config (currently unused)

ESLint, TypeScript, and Prettier are configured at the monorepo root and
apply to all workspaces globally.

## Stack

- Backend: NestJS, Prisma (PostgreSQL), nestjs-zod, Pino logging
- Frontend: React, Vite, TailwindCSS, shadcn/ui, Zustand
- Validation: Zod everywhere (single source of truth)
- Tests: Vitest, React Testing Library, Supertest, Playwright
- Package manager: pnpm (pinned via packageManager field). Never use npm or yarn.

## Hard constraints

- Always use pnpm for any install/script command.
- Never introduce a dependency without a clear reason; prefer the stack above.

# Testing Strategy

Follow the test pyramid. Every feature ships with tests.

- Unit + integration: Vitest (backend and frontend, single runner).
- Frontend components: Vitest + React Testing Library.
- API integration: Supertest against the Nest app.
- Repository / DB-touching tests: run against a REAL Postgres
  (Testcontainers locally, or a Neon branch in CI) — do not mock the DB.
- E2E (browser): Playwright, reserved for critical flows (login, refresh,
  Strava OAuth, activity sync).
- A task is not "done" until lint, typecheck, and the relevant tests pass.

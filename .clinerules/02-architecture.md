# Architecture

NestJS as a MODULAR MONOLITH. No microservices.

## Layering

- Each domain is a Nest feature module (auth, strava-integration,
  activities, photos, stats, coaching).
- Flow inside a module: Controller -> Service.
- Inject PrismaService DIRECTLY into services. Do NOT add a repository
  layer by default. Only extract a repository for a specific module if its
  data access becomes genuinely complex (heavy aggregations). Abstraction
  must earn its place.

## Boundaries

- DTOs live at the HTTP boundary and are Zod-based.
- NEVER leak a Prisma model to the API response. Services always map to a
  DTO before returning outward.
- External, volatile integrations go behind a port (interface):
  - StravaClient for the Strava API.
  - CoachingProvider for the LLM. The coaching module MUST be fully
    isolated and toggled by a feature flag (Strava terms risk).

## Shared code

- Zod schemas and inferred types that both api and web need go in
  packages/shared. Import from there, never duplicate.

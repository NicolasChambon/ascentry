# Validation & Types (Zod)

- Zod is the single source of truth for runtime validation AND static types.
- In NestJS use nestjs-zod: define a schema, create the DTO with
  createZodDto, and validate with the global ZodValidationPipe.
- Validate environment variables with a Zod schema at startup. The app must
  fail fast (throw) if any required env var is missing or malformed.
- Reuse the same schema across api and web by importing from packages/shared.

# Coding Standards

- TypeScript strict mode is mandatory (strict, noUncheckedIndexedAccess,
  exactOptionalPropertyTypes, noImplicitOverride).
- NEVER use `any`. If a type is unknown, use `unknown` and narrow it.
- NEVER use `as` type assertions. Model types correctly or validate with
  Zod and infer. The only allowed escape is a documented `// eslint-disable`
  with a one-line justification.
- Prefer type inference from Zod schemas over hand-written interfaces for
  anything that crosses a boundary.
- All code must pass ESLint (typescript-eslint strictTypeChecked) and
  Prettier before being considered done.
- Functions stay small and single-purpose. No dead code, no commented-out
  blocks left behind.

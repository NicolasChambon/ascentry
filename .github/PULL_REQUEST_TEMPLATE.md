## ❓ What & why

<!-- Two or three sentences of context. What problem / need does this solve? Link the issue: Closes #… -->

## 🚧 Changes

<!-- Bullet list of the notable changes (not a copy-paste of the diff) -->

-

## 🧪 How to test

<!-- Steps to verify locally: commands, user flow, edge cases -->

1.

## 🖼️ Screenshots (if UI)

<!-- Before / after for any visual change -->

## 📋 Checklist

- [ ] `pnpm check` passes (format + lint + typecheck)
- [ ] Tests added/updated, `pnpm test` green
- [ ] DB change → migration created **and** committed
- [ ] New env var → added to the Zod schema **and** `.env.example`
- [ ] No Prisma model exposed as-is by the API (mapped to a Zod DTO)
- [ ] Shared schemas live in `@ascentry/shared` if used by both api **and** web
- [ ] README.md and CLAUDE.md updated if needed

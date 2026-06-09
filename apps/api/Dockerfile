# syntax=docker/dockerfile:1

# ---- Base : Node 24 + pnpm via Corepack ----
FROM node:24-slim AS base
RUN corepack enable
WORKDIR /app

# ---- Build : install + build shared + Prisma + api ----
FROM base AS build
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @ascentry/shared build
# Fake DATABASE_URL to make prisma generate work
ENV DATABASE_URL="postgresql://user:password@localhost:5432/db"
RUN pnpm --filter @ascentry/api exec prisma generate
RUN pnpm --filter @ascentry/api build
RUN pnpm --filter @ascentry/api deploy --prod --legacy /prod

# ---- Runtime : minimal image ----
FROM node:24-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /prod ./
EXPOSE 3000
CMD ["node", "dist/main"]
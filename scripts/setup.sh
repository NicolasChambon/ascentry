#!/usr/bin/env bash
set -euo pipefail

echo "▶ 1/5 - .env file (created from .env.example if absent)"
[ -f apps/api/.env ] || cp apps/api/.env.example apps/api/.env

echo "▶ 2/5 - Dependencies installation"
pnpm install

echo "▶ 3/5 - Starting Postgres (wait for it to be ready)"
docker compose up -d --wait postgres

echo "▶ 4/5 - Shared package build + Prisma client generation"
pnpm --filter @ascentry/shared build
pnpm --filter @ascentry/api exec prisma generate

echo "▶ 5/5 - Apply migrations"
pnpm --filter @ascentry/api exec prisma migrate deploy

echo "✅ Setup completed. Launch 'pnpm dev' to start the app."
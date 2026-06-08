## Getting started

**Prerequisites:** Node 24 (via [fnm](https://github.com/Schniz/fnm) or nvm), pnpm via Corepack (`corepack enable`), and Docker.

```bash
pnpm setup   # .env, dependencies, Postgres, Prisma client, migrations
pnpm dev     # starts the API (:3000) and the web app (:5173)
```

- API health: http://localhost:3000/api/health
- Web app: http://localhost:5173
- Database GUI: pnpm --filter @ascentry/api db:studio

import { execFileSync } from 'node:child_process';
import { PrismaClient } from '../generated/prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { PrismaPg } from '@prisma/adapter-pg';
import { createServer } from 'node:net';

const POSTGRES_PORT = 5432;
const MAX_START_ATTEMPTS = 5;

export interface TestDatabase {
  prisma: PrismaClient;
  stop: () => Promise<void>;
}

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const adress = server.address();
      if (adress === null || typeof adress === 'string') {
        server.close();
        reject(new Error('Failed to acquire a free port'));
        return;
      }
      const { port } = adress;
      server.close(() => {
        resolve(port);
      });
    });
  });
}

async function startContainer(): Promise<StartedPostgreSqlContainer> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_START_ATTEMPTS; attempt += 1) {
    const hostPort = await getFreePort();
    try {
      return await new PostgreSqlContainer('postgres:17-alpine')
        .withExposedPorts({ container: POSTGRES_PORT, host: hostPort })
        .start();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Failed to start the Postgres test container');
}

export async function startTestDatabase(): Promise<TestDatabase> {
  const container = await startContainer();
  const connectionString = container.getConnectionUri();

  execFileSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: {
      ...process.env,
      DATABASE_URL: connectionString,
    },
    stdio: 'inherit',
  });

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  await prisma.$connect();

  return {
    prisma,
    stop: async () => {
      await prisma.$disconnect();
      await container.stop();
    },
  };
}

export async function truncateAll(prisma: PrismaClient): Promise<void> {
  const rows = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (rows.length === 0) return;

  const list = rows.map((row) => `"${row.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

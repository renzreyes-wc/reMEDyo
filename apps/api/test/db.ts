import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma.service';

/**
 * Puts the database back to an empty state.
 *
 * Called before each test rather than after, so a test that fails partway —
 * leaving rows behind — does not change the next test's starting point. That is
 * what makes a repeated run give the same result, and what makes a single test
 * pass on its own.
 *
 * Truncation rather than a rolled-back transaction: the application owns its
 * connection pool, so its queries run on connections this process does not
 * control and would not be inside any transaction started here.
 */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);

  const database = await prisma.$queryRaw<Array<{ name: string }>>`
    SELECT current_database() AS name
  `;
  const name = database[0]?.name ?? '';

  // The second of two guards — `test/setup.ts` checks the configured URL before
  // the application starts. Both exist because the failure mode is silent data
  // loss, and this one costs three lines.
  if (!name.includes('test')) {
    throw new Error(
      `Refusing to truncate: connected to the database "${name}", which does not contain "test".`,
    );
  }

  // Discovered rather than listed, so a new Prisma model is covered without
  // anyone remembering to add it here. Migrations are left alone; the schema is
  // not the test's to rebuild.
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) return;

  const list = tables.map((table) => `"${table.tablename}"`).join(', ');

  // One statement with CASCADE: the tables reference each other, and several
  // relations deliberately do not cascade, so order would otherwise matter.
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

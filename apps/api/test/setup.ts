import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Prepares the environment the integration suite runs in.
 *
 * Two jobs: give the process the variables the application reads, and make it
 * impossible for the suite to point at anything but a test database.
 */

/**
 * A few lines rather than a dependency: this reads one file, for one process,
 * and `dotenv` is not resolvable from this package. Vitest does not put a
 * `.env` into `process.env`, and the application reads `process.env`, so
 * without this a local run would need every variable exported by hand.
 */
function loadEnvFile(path: string): void {
  let contents: string;
  try {
    contents = readFileSync(path, 'utf8');
  } catch {
    return; // No .env is the normal case in CI, not an error.
  }

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed
      .slice(separator + 1)
      .trim()
      .replace(/^(['"])(.*)\1$/, '$2');

    // A variable already in the environment wins, so CI and an explicit
    // override both behave as expected.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(join(__dirname, '..', '.env'));

// Pinned rather than inherited. The suite covers the disabled path — the one
// every deployment gets by default — and a run that behaved differently because
// a shell happened to export LLM_ENABLED=true would not be repeatable.
process.env.LLM_ENABLED = 'false';

const testDatabaseUrl = process.env.DATABASE_URL_TEST;

if (!testDatabaseUrl) {
  throw new Error(
    [
      'DATABASE_URL_TEST is not set, and the integration suite will not run without it.',
      '',
      'These tests truncate tables between cases, so they are deliberately',
      'pointed at a database of their own rather than at DATABASE_URL:',
      '',
      '  createdb remedyo_test',
      '  DATABASE_URL="postgresql://remedyo:remedyo@localhost:5432/remedyo_test" \\',
      '    pnpm --filter api exec prisma migrate deploy',
      '',
      'Then set DATABASE_URL_TEST in apps/api/.env.',
    ].join('\n'),
  );
}

// The application reads DATABASE_URL — that is what PrismaService connects
// with. Redirecting it here is what puts the suite on the test database, and
// the guard below is what keeps that from being able to point anywhere else.
process.env.DATABASE_URL = testDatabaseUrl;

const databaseName = (() => {
  try {
    return new URL(testDatabaseUrl).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
})();

if (!databaseName.includes('test')) {
  throw new Error(
    `Refusing to run: DATABASE_URL_TEST names the database "${databaseName}", which does not contain "test". ` +
      'These tests truncate every table they touch, so the target has to be recognisably a test database.',
  );
}

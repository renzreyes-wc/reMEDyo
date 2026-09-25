import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/common/prisma.service';
import { closeTestApp, createTestApp } from './harness';
import type { TestApp } from './harness';
import { resetDatabase } from './db';

/**
 * The isolation guarantee.
 *
 * The second test is the point: the first one deliberately leaves a row behind,
 * and the second asserts it is gone. If the reset ever stops running between
 * cases, this is what fails — rather than a behavioural test failing later for
 * a reason that looks like a product bug.
 */
describe('database isolation between tests', () => {
  let harness: TestApp;
  let prisma: PrismaService;

  beforeAll(async () => {
    harness = await createTestApp();
    prisma = harness.app.get(PrismaService);
  });

  afterAll(async () => {
    await closeTestApp(harness);
  });

  beforeEach(async () => {
    await resetDatabase(harness.app);
  });

  it('leaves a row behind, on purpose, with no cleanup', async () => {
    await prisma.user.create({
      data: {
        email: 'leaked@example.com',
        passwordHash: 'not-a-real-hash',
        role: 'PATIENT',
      },
    });

    expect(await prisma.user.count()).toBe(1);
  });

  it('starts from an empty database despite the previous test', async () => {
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.appointment.count()).toBe(0);
  });

  it('refuses to truncate a database that is not recognisably a test one', async () => {
    // The guard is in resetDatabase itself, and setup.ts has already refused
    // anything whose name lacks "test" — so this asserts the arrangement rather
    // than the guard firing. Worth pinning: it is the difference between a
    // test run and a wiped development database.
    const [{ name }] = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT current_database() AS name
    `;

    expect(name).toContain('test');
  });
});

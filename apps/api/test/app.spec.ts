import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeTestApp, createTestApp } from './harness';
import type { TestApp } from './harness';

/**
 * The harness itself, and the application configuration it applies.
 *
 * These are the tests that say the suite is testing the deployed application
 * rather than a lookalike: if the shared configuration ever stops being applied
 * here, this file is what fails first, before the behavioural tests start
 * failing for reasons that look like product bugs.
 */
describe('the integration harness', () => {
  let harness: TestApp;

  beforeAll(async () => {
    harness = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(harness);
  });

  it('serves the application over HTTP', async () => {
    const response = await harness.http.get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('mounts routes under the global prefix, and only under it', async () => {
    // The prefix is applied by configureApp. Without it this route would be at
    // the root, and the suite would be exercising a differently-routed
    // application from the one that is deployed.
    expect((await harness.http.get('/api/health')).status).toBe(200);
    expect((await harness.http.get('/health')).status).toBe(404);
  });

  it('rejects an unknown body field rather than ignoring it', async () => {
    // The ValidationPipe's whitelist + forbidNonWhitelisted, which would be
    // absent from an application built from AppModule alone.
    const response = await harness.http
      .post('/api/auth/login')
      .send({ email: 'someone@example.com', password: 'correct-horse', unexpected: 'field' });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toContain('unexpected');
  });

  it('refuses an unauthenticated request to a protected route', async () => {
    // The guards reach the application through module providers, so this also
    // holds for a test application — worth pinning, because the tests below
    // depend on it.
    expect((await harness.http.get('/api/appointments')).status).toBe(401);
  });
});

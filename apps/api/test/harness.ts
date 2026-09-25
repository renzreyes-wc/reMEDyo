import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { SuperTest, Test as SuperTestRequest } from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.config';

/**
 * Boots the application for an integration test.
 *
 * The application is configured through `configureApp` — the same function
 * `main.ts` calls — rather than through a restatement of its settings. That is
 * the point of the extraction: a suite that configures its own application
 * verifies that application, not the deployed one.
 *
 * The HTTP client is supertest bound to the Nest HTTP server. It opens a socket
 * on an ephemeral port for the duration of each request, so the requests are
 * real ones over real HTTP rather than calls into a controller instance.
 */
export interface TestApp {
  app: INestApplication;
  http: SuperTest<SuperTestRequest>;
}

export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  configureApp(app);

  // onModuleInit() connects Prisma and the routers are mounted here; without it
  // the server answers nothing.
  await app.init();

  return { app, http: request(app.getHttpServer()) };
}

export async function closeTestApp({ app }: TestApp): Promise<void> {
  await app.close();
}

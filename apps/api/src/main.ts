import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { API_GLOBAL_PREFIX, configureApp } from './app.config';
import { createOpenApiDocument } from './openapi';

/**
 * The interactive API documentation is off unless this is exactly `true`.
 *
 * It is a request builder pointed at a clinical prototype, so it is opt-in:
 * a deployment that wants it says so, and one that does not gets a 404 on the
 * route. Turning it on grants nothing — every request the UI sends is checked
 * by the same global guards as any other client, and the session cookie is
 * httpOnly, so the page cannot attach one it was not already sent.
 */
const SWAGGER_UI_ENABLED = process.env.SWAGGER_UI === 'true';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Shared with the test harness, so a test runs the application as it is
  // really configured rather than a differently-configured copy of it.
  configureApp(app);

  app.enableShutdownHooks();

  // Built from the running application, so it cannot drift from the routes
  // that are actually mounted. Skipped entirely when the UI is off: it is only
  // ever consumed here, and walking every controller is not free.
  if (SWAGGER_UI_ENABLED) {
    const document = createOpenApiDocument(app);
    SwaggerModule.setup(`${API_GLOBAL_PREFIX}/docs`, app, document);
  }

  const port = Number(process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API listening on http://localhost:${port}/api`, 'Bootstrap');

  if (SWAGGER_UI_ENABLED) {
    Logger.log(
      `API documentation on http://localhost:${port}/${API_GLOBAL_PREFIX}/docs`,
      'Bootstrap',
    );
  }
}

void bootstrap();

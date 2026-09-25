import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

/**
 * The global prefix every route is mounted under.
 *
 * It lives here, with the code that applies it, because more than one caller
 * needs to agree on it: the emitted OpenAPI document encodes it, since the
 * paths in openapi.json are the paths a client actually calls. One constant is
 * how the document and the running application cannot disagree.
 */
export const API_GLOBAL_PREFIX = 'api';

/**
 * Applies the configuration every instance of this application runs with.
 *
 * This is deliberately not inline in main.ts. The application's guards reach it
 * through module providers, but its prefix, cookie parsing, validation pipe,
 * CORS policy and exception filter do not — so an instance built from AppModule
 * alone, as a test would build it, is a different application from the one that
 * is deployed: requests to it carry no prefix, no body is validated, and no
 * cookie is parsed, which makes every authenticated route fail regardless of
 * the session. Calling this is what makes a test exercise the real thing.
 *
 * Anything that only makes sense for a long-running process (shutdown hooks)
 * or for one deployment (mounting the interactive documentation) stays in
 * main.ts.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_GLOBAL_PREFIX);
  app.use(cookieParser());

  // The session cookie is httpOnly, so the browser only sends it when the
  // frontend origin is explicitly allowed with credentials.
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      // One message per field rather than every rule that failed: a missing
      // field should read "Enter the dosage.", not three overlapping notes
      // about type and length.
      stopAtFirstError: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}

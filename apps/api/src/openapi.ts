import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DiscoveryService, MetadataScanner, ModulesContainer } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject, OperationObject } from '@nestjs/swagger';
import { SESSION_COOKIE_NAME } from '@remedyo/shared';
import type { Role } from '@prisma/client';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { IS_PUBLIC_KEY } from './common/decorators/public.decorator';
import { ROLES_KEY } from './common/decorators/roles.decorator';

/**
 * Every route is mounted under this prefix. It lives here, rather than in
 * main.ts, because the emitted OpenAPI document encodes it: the paths in
 * openapi.json are the paths a client actually calls. One constant means the
 * document and the running application cannot disagree about them.
 */
export const API_GLOBAL_PREFIX = 'api';

/** The cookie the session token rides in, named as the security scheme. */
export const SESSION_SECURITY_SCHEME = 'session';

const API_VERSION = '0.1.0';

const DESCRIPTION = [
  'The HTTP interface of reMEDyo, a fictional telehealth prototype.',
  '',
  'Every route requires an authenticated session unless it is marked otherwise, ',
  'because authentication is applied globally and opted out of per route. Routes ',
  'restricted to a role carry that restriction in `x-roles`.',
  '',
  'This document is generated from the running application, not written by hand.',
].join('\n');

interface RouteAuth {
  isPublic: boolean;
  roles: Role[];
}

/**
 * Reads the authorization decision the guards will actually make, so the
 * document describes the real rule rather than a second copy of it.
 *
 * `@Roles()` and `@Public()` are already on every controller and handler, and
 * the guards resolve them with method-level metadata winning over class-level.
 * This walks the same metadata with the same precedence.
 */
function collectRouteAuth(app: INestApplication): Map<string, RouteAuth> {
  // DiscoveryService is only registered by DiscoveryModule, which the
  // application does not import. Its dependencies are in the container
  // already — ModulesContainer comes from Nest's own core module — so it is
  // built here rather than by adding a module to the application for the sake
  // of a build script.
  const discovery = new DiscoveryService(app.get(ModulesContainer, { strict: false }));
  const scanner = new MetadataScanner();
  const routes = new Map<string, RouteAuth>();

  for (const wrapper of discovery.getControllers()) {
    const { instance, metatype } = wrapper;
    if (!instance || !metatype) continue;

    const prototype = Object.getPrototypeOf(instance) as object;
    const controllerKey = metatype.name;
    const controllerIsPublic = Reflect.getMetadata(IS_PUBLIC_KEY, metatype) === true;
    const controllerRoles = (Reflect.getMetadata(ROLES_KEY, metatype) as Role[] | undefined) ?? [];

    for (const methodKey of scanner.getAllMethodNames(prototype)) {
      const handler = (prototype as Record<string, unknown>)[methodKey];
      if (typeof handler !== 'function') continue;

      const isPublic = Reflect.getMetadata(IS_PUBLIC_KEY, handler);
      const roles = Reflect.getMetadata(ROLES_KEY, handler) as Role[] | undefined;

      routes.set(`${controllerKey}_${methodKey}`, {
        isPublic: isPublic === undefined ? controllerIsPublic : isPublic === true,
        roles: roles ?? controllerRoles,
      });
    }
  }

  // DiscoveryService hands back metadata for every method the class defines,
  // but only the ones the Swagger explorer turned into operations have an
  // operationId this map is keyed against. Membership is checked there.
  return routes;
}

/**
 * Writes the authorization rule onto every operation, derived from the guard
 * metadata rather than from a hand-kept list beside it.
 *
 * Operations left unmatched keep the document-level default of "session
 * required", which is the same direction the guards default in: a route whose
 * decorators the reader cannot place is described as protected, not open.
 */
function applyRouteAuth(document: OpenAPIObject, routes: Map<string, RouteAuth>): string[] {
  const unmatched: string[] = [];

  for (const pathItem of Object.values(document.paths)) {
    for (const operation of Object.values(pathItem) as OperationObject[]) {
      const operationId = operation.operationId;
      if (!operationId) continue;

      const auth = routes.get(operationId);
      if (!auth) {
        unmatched.push(operationId);
        continue;
      }

      if (auth.isPublic) {
        // An empty requirement list is how OpenAPI says "no session needed",
        // overriding the document-level default for this operation.
        operation.security = [];
        continue;
      }

      operation.security = [{ [SESSION_SECURITY_SCHEME]: [] }];
      if (auth.roles.length > 0) {
        // A vendor extension: OpenAPI has no field for "which roles", and the
        // operation object's type reflects the specification rather than the
        // x- keys it also permits.
        (operation as OperationObject & { 'x-roles'?: Role[] })['x-roles'] = auth.roles;
      }
    }
  }

  return unmatched;
}

/**
 * The OpenAPI document for the application, under its real routes and real
 * authorization rules.
 *
 * The caller must have configured the application in the same way main.ts
 * does — in particular the global prefix — before calling this, since both
 * are read off the application.
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('reMEDyo API')
    .setDescription(DESCRIPTION)
    .setVersion(API_VERSION)
    .addCookieAuth(
      SESSION_COOKIE_NAME,
      { type: 'apiKey', in: 'cookie' },
      SESSION_SECURITY_SCHEME,
    )
    .addSecurityRequirements(SESSION_SECURITY_SCHEME)
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // The default factory returns the bare method name, which repeats across
    // controllers — five of them have a `list`. Nothing downstream can tell
    // those apart, so the controller names the operation.
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      `${controllerKey}_${methodKey}`,
  });

  const unmatched = applyRouteAuth(document, collectRouteAuth(app));
  if (unmatched.length > 0) {
    Logger.warn(
      `No route metadata for ${unmatched.length} operation(s): ${unmatched.join(', ')}`,
      'OpenAPI',
    );
  }

  return document;
}

/**
 * Builds the document without serving it and writes it to `apps/api/openapi.json`.
 *
 * Run through the compiled output, never through ts-node or tsx: the
 * `@nestjs/swagger` CLI plugin is a TypeScript transformer, so it only takes
 * effect during `nest build`. Emitting from source would silently drop every
 * DTO schema the plugin infers from the class-validator decorators.
 */
async function emit(): Promise<void> {
  // Warnings and errors only: the route-mapping chatter is not worth printing
  // on every build, but a warning from createOpenApiDocument must not be lost.
  const app = await NestFactory.create(AppModule, { logger: ['warn', 'error'] });

  // Must match how main.ts configures the application before it builds the
  // document, or the emitted paths would not be the paths clients call.
  app.setGlobalPrefix(API_GLOBAL_PREFIX);

  // onModuleInit() connects Prisma; createDocument needs the routes registered.
  await app.init();

  const document = createOpenApiDocument(app);
  const outputPath = join(__dirname, '..', 'openapi.json');
  await writeFile(outputPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');

  const routeCount = Object.values(document.paths).reduce(
    (total, pathItem) => total + Object.keys(pathItem).length,
    0,
  );
  // Deliberately not Nest's Logger: this is a build script's result, and it
  // should reach CI output even at the quiet log level set above.
  console.log(`openapi:emit — wrote ${routeCount} routes to ${outputPath}`);

  await app.close();
  process.exit(0);
}

// Only when run as the entrypoint (`node dist/openapi.js`). main.ts imports
// the builder above and must not trigger an emit by doing so.
if (require.main === module) {
  void emit().catch((error: unknown) => {
    // Nest's logger is switched off for the emit, so without this a failed
    // run would surface to CI as a bare exit code and nothing else.
    console.error(error);
    process.exit(1);
  });
}

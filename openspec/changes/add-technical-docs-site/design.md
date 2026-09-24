# Design

## Context

See proposal.md — Why. The constraints that actually shape the approach:

- **pnpm workspace globs `apps/*` and `packages/*`.** A site at `apps/docs` is picked up automatically; a top-level `docs/` would need a workspace edit. Node 26.9.0, pnpm 12.5.1.
- **The repository is `renzreyes-wc/reMEDyo` with no `.github/` directory.** Project Pages serve from `https://renzreyes-wc.github.io/reMEDyo/`, so the site is published under a path prefix rather than at a domain root.
- **`PrismaService.onModuleInit()` calls `$connect()`.** Any process that instantiates `AppModule` — including one that only wants to read its routes — opens a database connection and fails without one. This is the single most constraining fact for how the OpenAPI document gets emitted in CI.
- **DTOs already carry `class-validator` decorators** across every module, and `main.ts` already runs a `ValidationPipe` with `whitelist` and `forbidNonWhitelisted`. The validation rules that belong in an OpenAPI schema are therefore already written; the question is how to read them rather than how to author them.
- **`main.ts` sets a global `/api` prefix** and a single-origin CORS policy from `WEB_ORIGIN`.
- **Two deployment shapes exist and both must be documented:** `docker compose` (postgres, ollama, api, web) and Fly.io (`remedyo-api`, `remedyo-web`, region `sin`, plus a private-network ollama).

## Goals / Non-Goals

**Goals:**
- One build pipeline produces both the prose site and the API reference, so a route change and a diagram change travel the same path to publication.
- The OpenAPI document is a build artifact of the API, never a file anyone edits.
- Diagrams are reviewable as diffs.
- Adding Swagger metadata changes no handler logic and no authorization.

**Non-Goals:**
- No custom domain, no docs versioning, no search beyond what the site generator gives for free.
- No attempt to document internal classes or private methods; the unit of documentation is the module and the route.
- No change to the README's role — it stays the quick-start and gains one link.

## Decisions

### D1 — Docusaurus at `apps/docs`, not a top-level `docs/`

`apps/*` already matches, so the site becomes `@remedyo/docs` with no `pnpm-workspace.yaml` edit and the same `pnpm --filter` ergonomics as every other package. With GitHub Actions deployment the on-disk location is free: the workflow uploads a build directory, so the old "Pages serves from `/docs`" convention does not apply.

*Alternatives:* top-level `docs/` (needs a workspace entry, and reads as "loose files" next to a monorepo); serving docs from the Next.js web app (couples documentation availability to the product deployment, and puts internal architecture behind the same origin as the product).

### D2 — Mermaid for C4, with plain flowcharts where Mermaid's C4 support is weak

Mermaid renders natively in Docusaurus via `@docusaurus/theme-mermaid`, and the source is text, which satisfies the versioned-diagram requirement.

Mermaid does ship `C4Context` / `C4Container` / `C4Component` / `C4Deployment` block types, and they map onto the four required views exactly. They are also still marked experimental and their layout control is poor. The decision is to **use the C4 block types for the Level 1 and Level 2 views**, where the shapes are simple and the semantic labelling is worth having, and to **fall back to a styled `flowchart` for the Level 3 component view and the deployment view**, where the node count is higher and layout matters more than the C4 vocabulary. Each fallback diagram keeps C4 naming in its node labels so the levels still read as C4.

*Alternatives:* Structurizr DSL (the proper C4 tool, but introduces a JVM toolchain and a second rendering pipeline); committed PNG/SVG exports (rejected by the spec — not reviewable as a diff).

### D3 — Emit the OpenAPI document from a standalone script, with Postgres available in CI

`@nestjs/swagger`'s `SwaggerModule.createDocument(app, config)` needs a real `INestApplication`, which means `AppModule` is instantiated, which means `PrismaService.onModuleInit()` runs `$connect()`. There is no way to read the routes without paying that cost.

So `apps/api/src/openapi.ts` builds the app with `NestFactory.create()`, calls `app.init()` **without** `listen()`, writes `openapi.json`, and exits. CI gives it a database by running a Postgres **service container** — six lines of workflow YAML, and the same image the compose file already uses.

*Alternatives considered and rejected:*
- *Nest preview mode* (`NestFactory.create(AppModule, { preview: true })`) skips provider instantiation, which avoids the connection — but it also does not register controllers, so there are no routes to document.
- *Making `onModuleInit` tolerate a failed connect.* This would weaken a real production guarantee (fail fast on a bad database) to serve a build script. Wrong trade.
- *Committing `openapi.json`.* Directly contradicts the "cannot drift" requirement.

### D4 — `@nestjs/swagger`'s CLI plugin, so DTOs are not decorated twice

The plugin reads the existing `class-validator` decorators and TypeScript types and infers `@ApiProperty` automatically. Without it, every field of every DTO needs a hand-written `@ApiProperty`, which is both a large diff and a second source of truth that can disagree with the validator already on the line above.

This holds for request bodies, which are classes carrying validators. It does not extend to responses, which are interfaces in another package — see D7 for how those are modelled and why the plugin cannot do it.

Controllers still get explicit `@ApiTags`, `@ApiOperation` and `@ApiResponse` decorators — those carry intent the code cannot infer. The existing `@Roles(...)` metadata is read to mark role-restricted routes, so the "authentication stated per route" requirement is satisfied from the guard metadata rather than from a second hand-maintained list.

### D5 — Redocusaurus for the API reference

Point it at the emitted `openapi.json` and it renders the whole reference as a site page. The alternative, `docusaurus-plugin-openapi-docs`, generates one MDX page per route with more control and considerably more configuration; for an API this size the single rendered reference is the simpler thing that satisfies the requirement.

### D6 — `/api/docs` is configuration-gated and off unless enabled

`SWAGGER_UI=true` mounts the interactive UI; anything else does not mount the route at all. Default off, including in local development, so that nothing is exposed by accident — enabling it is one environment variable.

This matters because the interactive UI is a credentialed request builder pointed at a healthcare prototype. The spec requires that it grants no access, and it does not: every request from it goes through the same `JwtAuthGuard` and `RolesGuard` as any other client, and the session cookie is `httpOnly` so the UI cannot attach one it was not already sent. Gating the route is defence in depth, not the control.

### D7 — Response models are DTO classes in the API that `implements` the shared types

D4 assumed the CLI plugin would make the document "accurate rather than merely present". It does, for requests: every body DTO already carries `class-validator` decorators, and the plugin reads them. Responses are a different situation, and the assumption did not survive contact with the code.

Two facts about the plugin decide this:

- **It dispatches per file by filename suffix.** `dtoFileNameSuffix` (default `.dto.ts`, `.entity.ts`) sends a file to the model visitor; `controllerFileNameSuffix` (default `.controller.ts`) sends it to the controller visitor. Only the model visitor writes `@ApiProperty` metadata. A DTO class declared inline in a `.controller.ts` file is therefore visible to the plugin and still gets no schema — it emits as `{ "type": "object", "properties": {} }`. Four DTOs in this repository are declared that way.
- **It has no interface support.** Every response type in this system is an `interface` in `@remedyo/shared`, a separately compiled workspace package. The plugin's model visitor handles classes only, so an interface return type yields a bare `{ "type": "object" }` with no properties. Until this is addressed, the document would state nothing about what any route returns.

The decision: **response DTO classes in `apps/api`, one file per module under `dto/`, each declared `implements` the `@remedyo/shared` type it mirrors**, and referenced from `@ApiResponse({ type: ... })` on the routes that return it. The `implements` clause is the mechanism that makes this safe rather than a second source of truth: if a shared type gains, loses or changes a field, the API stops compiling until the DTO is brought back in line. Drift becomes a build error instead of a stale page.

The four inline DTOs move into `dto/` files as part of the same work, since the alternative is a schema that silently describes an empty object.

*Alternatives considered and rejected:*
- *Decorating the shared types themselves.* The shared package is consumed by the Next.js web app; adding `@nestjs/swagger` there puts a server-side documentation library in the browser bundle, and the plugin would still not process the file unless the shared sources joined the API's compilation.
- *Hand-written JSON Schema per response via `@ApiResponse({ schema: ... })`.* A second source of truth that can disagree with the TypeScript the handlers actually return, which is the failure this change exists to remove.
- *Leaving responses as bare objects and describing shapes in prose.* Directly contradicts the requirement that the description state what each route returns.

The cost is roughly two dozen small classes and a wider diff in section 2. The benefit is that the API reference becomes something a reader can use without opening the controller.

## Risks / Trade-offs

- **Eleven controllers get decorator edits at once** → Additive metadata only; no handler body changes. The API's 56 existing tests plus `pnpm -r typecheck` and a build gate the change, and the diff is reviewed per module rather than as one commit.
- **Response DTOs are code written for the documentation's benefit** (D7) → They are `implements`-checked against the shared types, so they cannot state something the API does not return; the maintenance they add is paid only when a response shape genuinely changes, and the compiler collects the debt at build time rather than a reader finding a stale page.
- **The CLI plugin infers schemas silently, so a wrong inference is invisible** → The emitted `openapi.json` is diffed once by hand against the route inventory (11 controllers) before the first publish, and any route whose inferred shape is wrong gets an explicit decorator.
- **CI now needs a database to build documentation** → A Postgres service container, pinned to the `postgres:18-alpine` image the compose file already uses. If it becomes a nuisance, the fallback is to cache the emitted document as a workflow artifact between runs.
- **Pages publishes the internal architecture of the system publicly** → This is a prototype with fictional data and the repository is already public; the documentation describes structure, not secrets. Worth stating explicitly rather than discovering later: no credentials, connection strings, or seed passwords go into the site.
- **Documentation drifts for everything that is prose rather than generated** → The API reference and the diagrams-as-code cannot drift silently, but the module narratives can. Mitigated only by scope: per-module prose stays short and points at the code.
- **A broken docs build blocks nothing else** → The workflow is separate from any product deployment, so a failed site build never blocks an API or web release. It also means a red docs build can be ignored; the workflow runs on `main` so it stays visible.

## Migration Plan

Nothing to migrate — the change is additive. Deployment order matters only in that the OpenAPI emit must precede the site build within the workflow.

1. Land the API instrumentation first, with `SWAGGER_UI` unset, so production behaviour is unchanged and the emit script can be verified locally.
2. Land the site and the workflow. The first successful run on `main` publishes.
3. Enable GitHub Pages for the repository with **GitHub Actions** as the source. This is a one-time repository setting and cannot be done from the codebase.

**Rollback:** disable the Pages source, or revert the workflow — the published site goes stale but nothing in the product is affected. Reverting the API instrumentation is an independent revert of the decorator commits.

## Open Questions

- Whether `/api/docs` should be enabled on the deployed Fly API or left off there permanently. Deferrable: the route is configuration-gated by D6, so this is an environment variable decision at deploy time and changes no spec, no approach, and no task.

# Tasks

## 1. OpenAPI generation in the API

- [x] 1.1 Add `@nestjs/swagger` to `apps/api/package.json` and verify `pnpm install` succeeds and `pnpm --filter api build` still passes
- [x] 1.2 Enable the `@nestjs/swagger` CLI plugin in `apps/api/nest-cli.json` so DTO schemas are inferred from the existing `class-validator` decorators, and verify the build emits without new type errors
- [x] 1.3 Build the OpenAPI document in `apps/api/src/main.ts` (title, version, cookie-based security scheme, the existing global `/api` prefix) and verify the document object is constructed at boot without changing any existing startup log
- [x] 1.4 Mount interactive docs at `/api/docs` only when `SWAGGER_UI=true`, and verify that with the variable unset the route returns 404 while every existing route behaves exactly as before
- [x] 1.5 Write `apps/api/src/openapi.ts` that creates the app, calls `app.init()` without `listen()`, writes `openapi.json`, and exits; add an `openapi:emit` script to `apps/api/package.json` and verify it produces a file containing every one of the API's routes
- [x] 1.6 Add `openapi.json` to `.gitignore` and verify it is not tracked, since the spec requires it be a build artifact rather than a committed file

## 2. Per-controller OpenAPI accuracy

Each task: add `@ApiTags`, `@ApiOperation` and `@ApiResponse` decorators, then re-run `openapi:emit` and verify that controller's routes appear with correct request/response shapes and correct auth annotation.

Authentication is not annotated by hand. `openapi.ts` reads the `@Roles(...)` and `@Public()` metadata the guards already resolve, with the same precedence, and writes the result onto each operation — so a route's stated rule cannot drift from the rule it enforces.

- [x] 2.1 Move the four DTOs declared inline in controllers into their module's `dto/` directory, since the `@nestjs/swagger` CLI plugin dispatches per file by filename suffix and gives a DTO in a `.controller.ts` file no schema: `CreateWindowDto` and `CreateExceptionDto` (`availability`), `SendMessageDto` (`consultations`), `MatchIntakeDto` (`matching`). Verify each now emits its properties in `openapi.json`
- [x] 2.2 Add response DTO classes under `dto/`, one per shared type a module returns, each declared `implements` the `@remedyo/shared` type it mirrors, per design D7. Verify the emitted document states each route's response instead of `{ "type": "object" }`, and that altering a mirrored shared type fails the build
- [x] 2.3 `auth.controller.ts` — including that `@Public()` routes are the only ones marked unauthenticated
- [x] 2.4 `users.controller.ts` and `health.controller.ts`
- [x] 2.5 `doctors.controller.ts` and `availability.controller.ts`
- [x] 2.6 `appointments.controller.ts`
- [x] 2.7 `consultations.controller.ts`
- [x] 2.8 `records.controller.ts` — the largest surface; confirm the draft and assist routes are annotated doctor-only
- [x] 2.9 `matching.controller.ts` and `notifications.controller.ts`
- [x] 2.10 `admin.controller.ts`
- [x] 2.11 Diff the emitted `openapi.json` route list by hand against the 11 controllers, and verify no route is missing, none is invented, and every role-restricted route names its roles

## 3. Documentation site scaffold

- [x] 3.1 Scaffold Docusaurus as `@remedyo/docs` at `apps/docs`, with `baseUrl: '/reMEDyo/'` and the repository's GitHub Pages URL, and verify `pnpm --filter @remedyo/docs build` succeeds
- [x] 3.2 Enable `@docusaurus/theme-mermaid` and verify a throwaway page containing a Mermaid diagram renders as a diagram in `pnpm --filter @remedyo/docs serve`
- [x] 3.3 Configure Redocusaurus against the emitted `openapi.json` and verify the API reference page renders every tag from the generated document
- [x] 3.4 Fail the build on broken internal links (`onBrokenLinks: 'throw'`) and verify a deliberately broken link aborts the build
- [x] 3.5 Define the sidebar for all five top-level sections and verify every entry resolves to a page that exists

## 4. Technical Overview

- [x] 4.1 Write the landing page, stating the fictional-prototype status, and verify it is the site's root page
- [x] 4.2 Write **Context** — the problem the product addresses, its users (patient, doctor, admin), and its boundaries — and verify it names no component that does not exist in the repository
- [x] 4.3 Write **Features** from the 12 capability specs in `openspec/specs/`, and verify every capability is represented

## 5. High-level Architecture

- [x] 5.1 Write the C4 **L1 System Context** diagram (Mermaid `C4Context`: patient, doctor, admin, the system, the self-hosted model runtime) and verify it renders
- [x] 5.2 Write the C4 **L2 Container** diagram (Mermaid `C4Container`: Next.js web, NestJS api, Postgres, Ollama) and verify each container's stated responsibility matches the code
- [x] 5.3 Write the C4 **L3 Component** diagram as a styled flowchart per design D2, covering the API's guard/controller/service/Prisma layering, and verify it renders
- [x] 5.4 Write the **Deployment** diagram covering both the `docker compose` shape and the Fly.io shape (`remedyo-api`, `remedyo-web`, region `sin`, private-network Ollama), and verify both match `docker-compose.yml` and the two `fly.toml` files

## 6. Detailed Architecture — per module

Each task: module overview, an L2 container-level diagram, and the module's slice of the data model. Verify each against the module's source and against the capability spec it implements.

- [x] 6.1 Write the module overview table covering all 12 modules with one-line responsibilities, and verify it matches `apps/api/src/modules/`
- [x] 6.2 `auth` and `users` — session cookie, JWT, guards; `users` kept brief per the agreed depth
- [x] 6.3 `doctors` and `availability` — directory, approval state, slot derivation
- [x] 6.4 `appointments` — booking, rescheduling, cancellation, state machine
- [x] 6.5 `consultations` — full depth: session lifecycle, messaging, the join rules as they now stand
- [x] 6.6 `records` — full depth: notes, prescriptions, drafts, summaries, and the authoring-doctor rule
- [x] 6.7 `llm` — full depth: provider abstraction, timeouts, the disabled and unreachable paths
- [x] 6.8 `matching` — full depth: symptom rules, weighting, emergency indication, and that it is deterministic
- [x] 6.9 `admin`, `notifications` and `health` — `health` kept brief per the agreed depth
- [x] 6.10 Add the prototype-status statement to the `records` and `llm` pages as the spec requires, and verify it appears on every page describing a clinical surface

## 7. Data model

- [x] 7.1 Write the entity-relationship diagram covering all 16 Prisma models and verify every model in `schema.prisma` appears
- [x] 7.2 Document the 10 enums and their meanings, and verify each value matches `schema.prisma`
- [x] 7.3 Document the constraints the schema enforces — uniques, cascades, and the one-to-one appointment relations — and verify each against the schema rather than from memory

## 8. Publishing

- [x] 8.1 Write `.github/workflows/docs.yml` triggered on push to `main`: a `postgres:18-alpine` service container, `openapi:emit`, then the site build, then deploy to Pages — and verify the workflow parses with `gh workflow view` or `actionlint`
- [ ] 8.2 Verify the emit step succeeds in CI against the service container, since this is the step design D3 identifies as most likely to fail
- [ ] 8.3 Verify a failing site build deploys nothing and leaves the previously published site intact
- [ ] 8.4 Add the published-site link to `README.md` and verify it resolves once Pages is live

## 9. Acceptance

- [x] 9.1 Run `pnpm -r typecheck`, `pnpm --filter api test` and `pnpm build`, and verify all pass with the API instrumentation in place
- [x] 9.2 Start the stack with `SWAGGER_UI=true` and verify a protected route invoked from `/api/docs` without a session is refused exactly as from any other client
- [x] 9.3 Change one route's DTO, re-run the pipeline, and verify the published API reference reflects the change with no prose edited by hand
- [x] 9.4 Read the published site end to end and verify every section in the agreed outline is present, every diagram renders, and no internal link is broken

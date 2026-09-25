# Proposal

## Why

Everything a technical reader needs to understand reMEDyo is currently either in a 389-line README that is really a getting-started guide, or in the source itself. There is no architecture diagram anywhere in the repository, no documented data model for the 16 Prisma models, and no API reference at all — the only way to learn that `PUT /api/records/appointments/:id/note` exists, what it accepts, and who may call it, is to open `records.controller.ts` and follow it into the service.

That is workable for the person who wrote it and expensive for everyone else: a reviewer, a new contributor, or an integrator has to reconstruct the system's shape from twelve API modules and twenty-three web routes before they can make a judgement about any of it. This change publishes that shape as a documentation site, and makes the API describe itself so the reference cannot quietly drift from the code.

## What Changes

- **A published technical documentation site** built with Docusaurus from a new `apps/docs` workspace package and deployed to GitHub Pages by a GitHub Actions workflow on every push to `main`. No `.github/` workflows exist today; this introduces the first one.
- **A Technical Overview section** — what the product is, the context it operates in, and its feature set, written for a technical reader.
- **A High-level Architecture section** carrying four C4 diagrams as Mermaid: a Level 1 System Context, a Level 2 Container diagram, a Level 3 Component diagram, and a Deployment diagram covering both the `docker compose` shape and the Fly.io shape.
- **A Detailed Architecture section** covering all twelve API modules — `admin`, `appointments`, `auth`, `availability`, `consultations`, `doctors`, `health`, `llm`, `matching`, `notifications`, `records`, `users`. Each gets a module overview, a Level 2 container diagram, and its slice of the data model. Depth is proportional to weight: `records`, `consultations`, `llm` and `matching` are treated in full, `health` and `users` briefly.
- **A documented data model** derived from `schema.prisma`: 16 models and 10 enums, their relations, and the invariants the schema enforces.
- **A generated OpenAPI description of the API.** `@nestjs/swagger` is added to `apps/api`, controllers and DTOs across all twelve modules are decorated, response DTO classes describe what each route returns, an interactive Swagger UI is served at `/api/docs`, and the emitted `openapi.json` is rendered as the site's API reference. This is the one part of the change that edits production API code.
- **Prose register**: plain English sentences, with technical vocabulary kept rather than softened. The reader is assumed to be technical; the writing is not assumed to be their second job.

Non-goals: no change to any runtime behaviour of the product itself beyond the new documentation routes, no rewrite of the README (it keeps its quick-start role and gains a link to the site), and no custom domain.

## Capabilities

### New Capabilities

- `technical-documentation`: The published technical documentation for the system — what the site must contain and keep accurate, how it is produced from the repository rather than maintained by hand, and the machine-readable OpenAPI description the running API serves about itself, including who may reach it.

### Modified Capabilities

None. The documentation surfaces are additive: `identity-access` already scopes its authorization rules to protected endpoints and is unaffected by a new unprotected documentation route, and `product-website` covers the public marketing face rather than developer documentation.

## Impact

**New**
- `apps/docs` — Docusaurus site as a workspace package (`@remedyo/docs`), picked up by the existing `apps/*` glob so `pnpm-workspace.yaml` needs no change.
- `apps/api/src/openapi.ts` — a script that builds the OpenAPI document and writes it to disk without starting a server.
- `.github/workflows/` — first workflow in the repository; emits the OpenAPI document, builds the site, and deploys to GitHub Pages.

**Modified**
- `apps/api/package.json` — adds `@nestjs/swagger`, plus a script to emit the document.
- `apps/api/src/main.ts` — OpenAPI document construction and the configuration-gated `/api/docs` route.
- `apps/api/src/modules/*/*.controller.ts` (11 controllers) and their DTOs — route, body and response decorators so the generated document is accurate rather than merely present.
- `apps/api/src/modules/*/dto/*.response.ts` — response DTO classes, one per shared type a module returns, each `implements` the `@remedyo/shared` interface it mirrors. The plugin cannot derive a schema from an interface in another package, so these are what let a route state what it returns; the `implements` clause makes any divergence from the shared type a compile error rather than a stale page.
- Four DTOs currently declared inline in controllers move into their module's `dto/` directory. The plugin dispatches per file by filename suffix and gives a DTO in a `.controller.ts` file no schema.
- `README.md` — a link to the published site.

**Operational**
- GitHub Pages must be enabled for `renzreyes-wc/reMEDyo` with GitHub Actions as its source.
- The deployed API gains a publicly reachable `/api/docs` route; whether that route is exposed in production is settled by a requirement in the new capability rather than left to the deployment.

**Risk**
- Swagger decorators across eleven controllers are a wide, shallow edit to production code. They are additive metadata and change no handler logic, but the surface is large enough that the API's existing tests and a build must pass before the change is considered done. The response DTO classes go slightly deeper — they are new declarations rather than annotations — but each is pinned to the shared type it mirrors by an `implements` clause, so they cannot describe a response the API does not produce.

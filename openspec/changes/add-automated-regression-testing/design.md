# Design

## Context

See proposal.md — Why. The constraints that shape the approach:

- **The application is configured in `main.ts`, not in `AppModule`.** The global `/api` prefix, `cookieParser`, the CORS policy, the `ValidationPipe` and the `AllExceptionsFilter` are all applied in `bootstrap()` and nowhere else. Only the two guards reach the application through module providers (`APP_GUARD`), so they are present in any instance built from `AppModule`; nothing else is.
- **`PrismaService.onModuleInit()` calls `$connect()`.** Any process that instantiates the application opens a database connection, so an integration suite needs a real database — the same fact that shaped how the OpenAPI document is emitted (`openspec/changes/archive/2026-09-25-add-technical-docs-site/design.md`, D3).
- **Two rules are enforced by the database rather than by code.** The booking race is arbitrated by partial unique indexes on `Appointment` (`(doctorId, startsAt)` and `(patientId, startsAt)`, both `WHERE state = 'SCHEDULED'`), and the API translates the resulting violation into a `409`. The service-layer check that precedes them loses the race by construction.
- **The existing 56 tests are pure functions.** `slot-derivation`, `llm/output`, `records/draft` and `records/summary` import nothing but their own module and `vitest`. They run in under half a second and need no database.
- **`docs.yml` already establishes the CI patterns this change reuses**: a `postgres:18-alpine` service container with a `pg_isready` health check, `pnpm install --frozen-lockfile`, and a single job gating a dependent one.
- **Deploys are manual.** `apps/api/fly.toml` and `apps/web/fly.toml` are deployed by hand with `fly deploy`; there is no workflow, and nothing checks a revision before it ships.

## Goals / Non-Goals

**Goals:**
- A test suite that can fail for the right reasons — one that exercises the application as configured, not a re-configured copy of it.
- Two layers with different costs: the pure-function tests stay fast and database-free; the integration tests are slower and cover the rules that only exist end to end.
- Gates that hold without a person remembering to honour them.

**Non-Goals:**
- **No web or documentation tests.** `apps/web` holds no business rules of its own, and `apps/docs` is generated. Neither has test tooling today, and adding it here would widen the change without covering a rule the API does not already own.
- **No coverage threshold.** See D6.
- **No assertion either way about the four known spec/behaviour divergences** (no consultation join window; cancellation has no start-time limit; a rejected doctor cannot resubmit; matching ignores duration and severity). This change builds the harness and covers behaviour the specs and the code agree on. Each divergence needs its own change, where the prior question — is the code or the spec wrong? — is settled first. Encoding either side now would either cement a defect or ship a failing test.
- **No change to the release cadence.** The deploy gate is built; whether deploys become automatic is left open (see Open Questions).

## Decisions

### D1 — Extract the bootstrap configuration so tests run the real application

`apps/api/src/app.config.ts` will export a single function that applies the application's global configuration — prefix, cookie parsing, CORS, validation pipe, exception filter — and `main.ts` will call it. The integration harness calls the same function.

Without this, `Test.createTestingModule({ imports: [AppModule] })` produces an application that is *not* the deployed one: requests would not carry the `/api` prefix, `@Public()` and role metadata would still be enforced (the guards are module providers) but the `ValidationPipe` would not run, so a test asserting that an unknown body field is rejected would fail against a correctly-behaving application, and `cookieParser` would be absent so every authenticated route would return `401` regardless of the session. A suite that passes against that application proves nothing about the deployed one.

*Alternatives considered and rejected:*
- **Restate the configuration in a test helper.** It works until it drifts, and it drifts silently — which is precisely the failure class this change exists to make visible.
- **Move the configuration into `AppModule` providers.** `useGlobalPipes` and `useGlobalFilters` have module-provider equivalents (`APP_PIPE`, `APP_FILTER`), but `setGlobalPrefix`, `cookieParser` and `enableCors` do not. Moving only part of it leaves the rest to be restated in tests, so the problem survives in reduced form.

### D2 — Integration tests drive HTTP against a real PostgreSQL database

The suite boots the application, listens on an ephemeral port, and makes real requests with `supertest`, against a real database.

The rules under test live behind the guards, the pipes and the router, so a test that calls a service directly bypasses most of what is worth checking. And two of the rules cannot be tested any other way: the double-booking guarantee is a database constraint, so the only honest test is two concurrent bookings against a real index — a mock cannot produce the violation the API translates into a `409`, and could only assert that the service calls a method.

*Alternatives considered and rejected:*
- **A mocked Prisma client.** It verifies the mock. The constraint-enforced rules are untestable against it, which is the part of the system most likely to break unnoticed.
- **An in-memory or SQLite database.** Prisma's own guidance is against it, and the partial unique indexes have no portable equivalent — the behaviour would differ in exactly the place being tested.

**Booting the application in-process requires a transform vitest does not apply by default.** This was not anticipated, and it is the one thing about this approach that had to be discovered by trying it. Vitest transforms TypeScript with esbuild, which supports `experimentalDecorators` but does not emit `design:paramtypes` — the decorator metadata Nest's injector reads to decide what to construct a class with. Under vitest every constructor-injected dependency therefore arrives `undefined`, and the first request through a guard fails with `Cannot read properties of undefined`. The application is unaffected in production because `nest build` uses tsc, which does emit the metadata; the gap is specific to the test transform, and the existing pure-function tests never hit it because they construct nothing through injection.

The fix is `unplugin-swc` with `@swc/core`, configured for the integration project with `legacyDecorator` and `decoratorMetadata` both enabled. The alternatives were to run the compiled server as a child process — faithful, but it costs a build before every run and gives the tests no access to the container — or to add the Babel metadata plugins, which achieve the same thing as SWC with more configuration.

### D3 — Isolation by reset, not by rollback

Each test starts from a known state: a reset helper truncates the domain tables, and the test creates the fixtures it needs. The reset runs per test, not per suite.

A transaction-per-test that rolls back is the faster idiom, and it is unavailable here: the application owns its connection pool, so its queries run on connections the test does not control and would not be inside the rollback.

*Alternatives considered and rejected:*
- **Uniquely-named data per test with no reset.** No teardown cost, but rows accumulate; a second run does not start where the first did, and the spec requires a repeated run to give the same result.
- **One seeded database for the whole suite.** Fastest, and order-dependent — a test that mutates shared fixtures changes other tests' outcomes.

Truncation is slower than either. It is chosen because determinism is the property the suite is for.

**Which database it resets is a separate decision, and a destructive one.** Truncation pointed at `DATABASE_URL` would wipe the developer's own database — locally that is the seeded development database, so running the suite would delete the demonstration data. The suite therefore reads `DATABASE_URL_TEST` and never `DATABASE_URL`, and the reset helper refuses to run against a database whose name does not contain `test`. Two guards, because the failure mode is silent data loss and the cost of the second one is three lines.

This means a test database has to exist. In CI the service container provides it as cheaply as the one `docs.yml` already starts; locally it is a one-time `createdb` and a migration run. That is a real setup step and is called out in the tasks rather than left to be discovered when the suite refuses to start.

### D4 — Two layers, two configurations, one command

The existing pure-function tests keep the default include pattern and stay database-free. The integration suite gets its own vitest project: `test/**/*.spec.ts`, a longer per-test timeout, no parallelism across test files (they share one database), and a required `DATABASE_URL`.

`pnpm test` runs both, so the spec's "runs from one command" holds. `pnpm --filter api test:unit` and `test:integration` run one layer each, so a developer without a database is not blocked, and so CI can report which layer failed.

*Alternative considered:* one configuration with the integration tests guarded at runtime by skipping when no database is present. Rejected: a suite that silently skips is a suite that silently stops checking, which is the failure this change exists to prevent.

### D5 — The deploy gate refuses rather than skips

`.github/workflows/deploy.yml` is triggered by hand (`workflow_dispatch`). Its first job runs the test suite against the revision being deployed; the deploy job declares `needs:` on it and so cannot run when the tests fail.

Gating at the *deploy* workflow rather than relying only on branch protection means a direct push, or a deploy started from a laptop-shaped shortcut, still cannot ship a revision its tests rejected — which is what the capability requires.

The workflow needs a `FLY_API_TOKEN` repository secret. It is additive: the existing manual `fly deploy` path is unaffected until the workflow is used.

*Alternatives considered and rejected:*
- **Automatically deploying the default branch on a green run.** It changes when releases happen, which is a product decision rather than a testing one. Left as an open question.
- **Branch protection alone.** It stops a merge, not a deploy. A revision can reach `main` by another route and be shipped without the check ever running.

### D6 — No coverage threshold

The suite asserts behaviour; it does not chase a percentage. A coverage gate measures which lines ran, not whether anything was verified — it is satisfied by a test that calls a route and asserts nothing — and it creates pressure to write tests for the sake of the number. The spec's coverage requirement is written as *what must be covered*, not how much.

### D7 — Tests are not weakened to pass

This is a policy rather than a mechanism, and it is the one most likely to be tested in practice, so it is written down: if the first green run uncovers a genuine defect, the defect is reported and fixed, or the area is left uncovered and recorded as a gap. A test is never made to pass by loosening its assertion, and a failing behavioural assertion is not deleted to get a merge through. The suite's value is exactly its willingness to fail.

## Risks / Trade-offs

- **The first green run may surface real defects** → This is the intended outcome, not a complication. Any defect found is reported with its evidence rather than absorbed; if fixing it is out of scope for this change, the affected area is left untested and the gap is recorded in the tasks file rather than hidden behind a weakened test (D7).
- **Integration tests are slow, so developers will not run them** → Keep the fast layer as the default for the inner loop, and make the whole suite the one command CI runs. The slow layer is the one a reviewer waits for, not the one an author waits for.
- **Truncation between tests slows the suite further** → Accepted in exchange for determinism (D3). If it becomes painful, the reset can move to per-file with fixtures that no test mutates — a change to the helper, not to any test.
- **A required check can block merges when a test is flaky** → No retries: a retry converts a nondeterministic test into a passing one and hides what made it nondeterministic. A flaky test is a defect in the test and is fixed as one.
- **A red default branch blocks shipping a fix** → Intended. The gate is on the revision, so a revert restores deployability immediately, and the deploy workflow remains triggerable by hand once the suite is green.
- **Adding the required check before the suite is green would block all merges** → Sequencing: land the harness and the tests, confirm green on the default branch, and only then enable the required check (see Migration Plan).
- **The deploy workflow needs a token this repository does not yet have** → The workflow is additive and inert until `FLY_API_TOKEN` is set; a missing secret fails that workflow, not any other.

## Migration Plan

Nothing to migrate — the change is additive, and no product behaviour changes.

Order matters in one direction only: the suite must be green on the default branch *before* the check is made required. Enabling it first would block every merge for as long as the suite took to stabilise.

1. Extract the shared configuration and confirm the existing suites still pass.
2. Land the integration harness and the tests; confirm the whole suite is green locally and in CI.
3. Add the test workflow, running but not yet required.
4. Enable the required check on the default branch, and confirm a failing change is refused.
5. Add the deploy workflow and set `FLY_API_TOKEN`; confirm a red revision is refused.

**Rollback:** disable the required check and delete the two workflows. The tests themselves are additive and affect nothing at runtime, so reverting the gates leaves the suite in place and the product untouched.

## Open Questions

- **Whether deploys become automatic on a green default branch, or stay a manually triggered workflow that the tests gate.** Deferrable: the workflow is built either way and the difference is its trigger, so this changes no spec, no decision above, and no task.

# Proposal

## Why

Every authorization decision and business rule in reMEDyo lives in the API, and almost none of it is verified automatically. The suite's 56 tests cover four pure functions — slot derivation, model-output parsing, draft assessment and summary staleness. No route, guard, service or database interaction is tested at all: nothing exercises the authoring-doctor rule, the booking race, the participant scoping of a consultation, or the role gates that decide who may call what.

Nothing runs those tests either. `docs.yml` is the only workflow in the repository, and it publishes documentation; it does not run a test. A change can therefore break a rule the product depends on and be merged and deployed with nothing objecting.

That matters more now than it did a week ago. The API is deployed, the documentation is published, and the codebase has accumulated behaviour nobody has checked: writing the module documentation surfaced four places where the code and its spec disagree. None of those was caught by a test, because no test could have caught them. A regression suite is what makes the next one visible.

## What Changes

- **An integration suite for the API.** Tests that boot the real Nest application and drive it over HTTP against a real PostgreSQL database — the same shape the application actually runs in, not a mock of it. This is where the untested rules live: role and ownership authorization, booking and the double-booking race, consultation join and completion, the records authoring rule, and session handling.
- **The application's bootstrap configuration becomes shared.** The global prefix, cookie parsing, validation pipe, CORS policy and exception filter are configured in `main.ts` and nowhere else, so a test that instantiates `AppModule` gets an application that is not the one production runs. That configuration moves into a function both bootstrap and tests call, so a test cannot pass against a misconfigured application.
- **A test workflow.** `.github/workflows/test.yml`, running on pull requests and on the default branch, with a PostgreSQL service container — the same image and health-check pattern `docs.yml` already uses, for the same reason.
- **The suite becomes a gate.** A failing test blocks a merge to the default branch, and the deploy path to Fly.io requires a green run before it ships. Deploys are currently manual `fly deploy` invocations from a laptop with nothing checking them.
- **Supporting tooling.** `@nestjs/testing` and `supertest` as development dependencies, an integration-test script, and a root script that runs the whole suite.

## Capabilities

### New Capabilities

- `regression-testing`: The automated check on the system's behaviour — what the suite must cover, that it exercises the application as it is really configured, that it runs on every proposed change and on the default branch, and that a failure stops a change from being merged or deployed.

### Modified Capabilities

None. This change adds a check on existing behaviour rather than altering it. No requirement of any existing capability changes; `technical-documentation` already governs how the documentation publishes and is untouched by a test suite beside it.

## Impact

**New**
- `apps/api/test/` — the integration suite, with helpers for booting the application and seeding the fixtures each test needs.
- `.github/workflows/test.yml` — the test workflow; `.github/workflows/deploy.yml` — the deploy path that requires it.
- `apps/api/src/app.config.ts` (or similar) — the shared bootstrap configuration.

**Modified**
- `apps/api/src/main.ts` — calls the shared configuration instead of configuring the application inline.
- `apps/api/package.json`, root `package.json` — integration-test scripts and the two new development dependencies.
- `apps/api/vitest.config.ts` — the integration suite needs its own environment and a longer timeout than the pure-function tests.

**Operational**
- Branch protection on the default branch must be configured to require the test check. This is a repository setting and cannot be done from the codebase.
- The deploy workflow needs a `FLY_API_TOKEN` repository secret, and a decision about whether it deploys automatically on a green run or stays a manual trigger that the tests merely gate.

**Risk**
- Integration tests need a database, so they are slower and cannot run as a pre-commit check. The unit layer stays fast and stays first.
- Gating deploys means a red suite on the default branch blocks shipping a fix. The mitigation is that the deploy workflow remains manually triggerable once tests are green.
- Adding a gate that did not exist can surface failures that were previously invisible; the first green run may require fixing genuine defects the tests uncover. Any such defect is reported rather than papered over by weakening the test.

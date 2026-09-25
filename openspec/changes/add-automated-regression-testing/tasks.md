# Tasks

## 1. Shared application configuration

- [x] 1.1 Extract the global configuration out of `apps/api/src/main.ts` — the `/api` prefix, `cookieParser`, CORS, the `ValidationPipe` and the `AllExceptionsFilter` — into a function in a new `apps/api/src/app.config.ts`, and verify the API still boots and `GET /api/health` returns `{"status":"ok","database":"up"}`
- [x] 1.2 Have `main.ts` call that function instead of configuring the application inline, and verify the startup log is unchanged and that `SWAGGER_UI` gating still behaves (`/api/docs` 404 without it, 200 with it)

## 2. Test tooling

- [x] 2.1 Add `@nestjs/testing`, `supertest` and `@types/supertest` as development dependencies to `apps/api`, and verify `pnpm install` succeeds and the existing 56 tests still pass
- [x] 2.2 Add a vitest project for the integration suite (`test/**/*.spec.ts`, a longer per-test timeout, no parallelism across files), including a TypeScript transform that emits decorator metadata (`unplugin-swc` with `@swc/core`) — esbuild does not, so Nest's injector receives no constructor types and every guard fails — and verify `pnpm --filter api test:unit` and `test:integration` each run only their own layer
- [x] 2.3 Make the root `pnpm test` run both layers as one command, and verify it reports a pass or fail for each
- [x] 2.4 Point the integration suite at `DATABASE_URL_TEST` and never at `DATABASE_URL`, so it cannot truncate a development database, and verify it refuses to start when `DATABASE_URL_TEST` is unset
- [x] 2.5 Provision the test database — create one locally, apply the migrations to it, and verify `pnpm --filter api test:integration` runs against it

## 3. Integration harness

- [x] 3.1 Write a helper that boots the application through the shared configuration from 1.1, listens on an ephemeral port and returns an HTTP client, and verify a request through it reaches `GET /api/health`
- [x] 3.2 Write a reset helper that truncates the domain tables, refusing to run unless the target database's name contains `test`, and verify a test that creates data and fails to clean up still passes on a second run
- [x] 3.3 Write fixture builders for the states tests need — a patient, a doctor pending and a doctor approved, a booked appointment, a completed consultation — and verify a test can create each and read it back through the API
- [x] 3.4 Verify the harness applies the real configuration rather than a copy: confirm a request without the `/api` prefix is not routed, and that an unknown body field is rejected by the validation pipe

## 4. Authorization coverage

- [x] 4.1 Cover the role gates: for each role-restricted route, verify a caller without the role is refused with `403`
- [x] 4.2 Cover authentication: verify every non-public route refuses an unauthenticated caller with `401`, and that the `@Public()` routes (sign-in, registration, health) do not
- [x] 4.3 Cover ownership: verify a non-participant receives `404` — not `403` — for an appointment, a consultation and a record entry, and that the refusal body does not confirm the record exists
- [x] 4.4 Cover account status: verify a suspended account is refused on its next request even while holding a session that has not expired

## 5. Scheduling coverage

- [x] 5.1 Verify booking a slot the doctor currently offers succeeds, and the appointment appears in the patient's own list
- [x] 5.2 Verify booking a slot the doctor does not offer — outside a window, on a blocked date, off the 30-minute grid, or in the past — is refused, and that no appointment row is written
- [x] 5.3 Verify two concurrent bookings of the same slot produce exactly one appointment: one request succeeds and the other receives `409`
- [x] 5.4 Verify rescheduling to a slot that is taken leaves the original appointment untouched, with its original slot still held
- [x] 5.5 Verify either participant may cancel, that `cancelledBy` records which of them did, and that cancelling a completed appointment is refused
- [x] 5.6 Verify slot derivation over HTTP reflects a dated exception: the blocked day's slots are absent while the rest of the week is unaffected

## 6. Consultation coverage

- [x] 6.1 Verify joining records the caller's own arrival, and that a second join does not move the session state backwards
- [x] 6.2 Verify a patient cannot complete a consultation
- [x] 6.3 Verify a doctor who did not hold the consultation cannot complete it
- [x] 6.4 Verify completing requires having joined, and that the refusal names that rule
- [x] 6.5 Verify sending a message before joining is refused, and that the thread is read-only once the consultation is completed, for both participants

## 7. Records coverage

- [x] 7.1 Verify only the doctor who held the consultation may write its note or issue its prescription; another doctor and the patient are both refused
- [x] 7.2 Verify writing requires the consultation to be completed, for both a note and a prescription
- [x] 7.3 Verify a patient reads only their own record, and that another patient's record is not reachable by identifier
- [x] 7.4 Verify a doctor reads a patient's record only where an appointment relationship exists, and receives `404` where it does not
- [x] 7.5 Verify no delete route exists for a note or a prescription, so retention is enforced by the absent route

## 8. Clinical assist coverage, disabled path

- [x] 8.1 Verify that with generation disabled the assist surface reports itself disabled rather than failing
- [x] 8.2 Verify a draft request against a transcript too thin to draft from is refused as an ordinary outcome — a success status carrying the refusal — rather than an error
- [x] 8.3 Verify no generated content can reach the medical record without a doctor's save: requesting a draft writes no `ConsultationNote`

## 9. Admin and profile coverage

- [x] 9.1 Verify the administrator routes refuse a caller who is not an administrator
- [x] 9.2 Verify an administrator cannot change another administrator's account status
- [x] 9.3 Verify a status change writes an audit entry while reading the audit log writes none
- [x] 9.4 Verify the patient profile routes act only on the caller, and that one patient cannot read or modify another's profile or history

## 10. Continuous integration

- [x] 10.1 Write `.github/workflows/test.yml` triggered on pull requests and on the default branch, with a `postgres:18-alpine` service container, and verify it parses with `actionlint`
- [ ] 10.2 Verify the workflow runs both layers, by pushing a deliberately failing test and confirming the job fails, then removing it and confirming the job passes

## 11. Gates

- [x] 11.1 Write `.github/workflows/deploy.yml` as a manually triggered workflow whose deploy job requires a passing test run against the revision being deployed, and verify a revision with a failing test is refused rather than deployed
- [ ] 11.2 Set a `FLY_API_TOKEN` repository secret and verify the deploy workflow can run against a green revision
- [ ] 11.3 Enable the test check as required on the default branch, and verify a change with a failing test cannot be merged

## 12. Acceptance

- [x] 12.1 Run the whole suite twice in succession and verify both runs report the same outcome
- [x] 12.2 Run a single integration test on its own, without any other test having run first, and verify it passes
- [x] 12.3 Verify the suite needs no manual setup beyond an installed dependency set and a reachable database, from a clean checkout
- [x] 12.4 Verify a change that alters behaviour the suite already asserts fails at least one test, and that the failure names the behaviour that changed

## 13. Findings recorded, not fixed

Faults the suite surfaced that are outside this change's remit. Each is reported
with its evidence rather than asserted around, per design D7.

- **The generated API description stated the wrong success status for nine POST routes — FIXED.** `apps/api/openapi.json`, and therefore the published reference at `renzreyes-wc.github.io/reMEDyo/api/`, declared `200` for the appointment reschedule and cancel routes, both consultation session routes, the note-draft route, the three administrator account-status routes, and the administrator appointment cancel. All nine return `201`, which is Nest's default for POST; only `login`, `logout` and `matching` carry `@HttpCode(200)` and so already agreed. Found by assertion in `test/authorization.spec.ts`, which was first written expecting `200` and failed. Resolved by changing the nine decorators to `@ApiCreatedResponse` — the description was the new thing and it was wrong, so it moved rather than the HTTP contract. The draft route's operation text, which also said the refusal was a `200`, was corrected with it. No runtime behaviour changed.
- **The "no draft" response is an empty body where the description says `null`.** `GET /api/records/appointments/:id/draft` returns `200` with no body and no `content-type` when no draft exists, rather than the JSON `null` the generated description declares via `oneOf: [NoteDraftDto, { type: "null" }]`. Nest sends no payload when a handler resolves to `null`. Not a live defect: the web client reads the body as text and maps empty to `null`, which is the contract the type expresses, so its only consumer is correct. Asserted as it actually is in `test/assist.spec.ts` rather than papered over. Fixing it would mean serialising `null` explicitly — a wire change with no benefit to the one client.

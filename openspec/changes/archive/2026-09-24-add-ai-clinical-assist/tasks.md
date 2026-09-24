# Tasks

Order follows design.md: the shared runtime first, then Feature B (patient
summary, whose input is a clinician-approved document), then Feature A (the
doctor's draft). Every group leaves the application working with
`LLM_ENABLED=false`, which is the mode `pnpm test` runs in.

## 1. Shared runtime and configuration

- [x] 1.1 Add assist tunables to `packages/shared/src/constants.ts` — generation timeout, token cap, and the thin-transcript thresholds (minimum message count, minimum messages from each participant, minimum total length) — and verify `pnpm --filter shared build` succeeds and the new names are exported from `dist/index.d.ts`
- [x] 1.2 Add the `ollama` service to `docker-compose.yml` with a `remedyo-models` named volume, no published host port, and its own healthcheck; verify `docker compose config` resolves and that `api` has **no** `depends_on` entry for it (D1)
- [x] 1.3 Add an entrypoint for the model service that starts the server and pulls `llama3.2:3b` only when the tag is absent; verify a second `docker compose up` does not re-pull (the volume is reused)
- [x] 1.4 Create `apps/api/src/modules/llm/llm.config.ts` reading `LLM_ENABLED`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT_MS`, `LLM_MAX_TOKENS` through `@nestjs/config`, with defaults that make an unset environment equivalent to disabled; verify `pnpm --filter api typecheck` passes
- [x] 1.5 Define the `LlmProvider` interface — `generate({ prompt, system, maxTokens, signal }) → { text, model }` — plus the shared unavailability outcome type in `apps/api/src/modules/llm/llm.provider.ts`; verify typecheck passes (D2)
- [x] 1.6 Implement the HTTP-backed provider over `fetch` with `AbortSignal.timeout` and Ollama's `format: "json"` option, and the disabled implementation that reports unavailability without a call; verify both are selected by `LLM_ENABLED` and that the disabled one performs no network access
- [x] 1.7 Implement structural output validation as a pure function — parse JSON, drop unknown keys, treat missing required keys as a failed generation, truncate each field to the `UpsertNoteDto` limits (4000 / 2000 / 4000 / 1000); verify with unit tests in `apps/api/src/modules/llm/output.spec.ts` covering malformed JSON, missing keys, extra keys, and over-length fields (D8)
- [x] 1.8 Create `LlmModule` exporting the provider and register it in `apps/api/src/app.module.ts`; verify the API boots with `LLM_ENABLED=false` and `/api/health` still responds

## 2. Schema and migration

- [x] 2.1 Add `ConsultationNoteDraft` to `apps/api/prisma/schema.prisma` — unique on `appointmentId`, the four draft fields, `extractionCandidates` JSON, `model`, `generatedAt` — following the existing cascade-on-appointment pattern (D4)
- [x] 2.2 Add `ConsultationNoteSummary` — unique on `appointmentId`, the summary body, `noteUpdatedAt` (the staleness marker), `model`, `generatedAt` (D3)
- [x] 2.3 Add `aiAssisted Boolean @default(false)` to `ConsultationNote` (D7)
- [x] 2.4 Extend the `AuditAction` enum with `NOTE_DRAFT_GENERATED` and `RECORD_SUMMARY_GENERATED`
- [x] 2.5 Generate one additive migration and verify `pnpm db:migrate` applies cleanly against a fresh database and that `pnpm db:seed` still completes — no backfill, existing notes take `aiAssisted = false` from the default

## 3. Feature B — patient plain-language summary (API)

- [x] 3.1 Add the summary prompt builder as a pure function taking the saved note and the appointment's prescriptions and returning the prompt string, explicitly excluding the transcript and any draft; verify with a unit test asserting no transcript text can reach the prompt
- [x] 3.2 Add a summary generation routine to `apps/api/src/modules/records/` that generates, validates, stores the row with `noteUpdatedAt` copied from the note, and writes the `RECORD_SUMMARY_GENERATED` audit entry with the acting doctor, appointment and model name
- [x] 3.3 Start summary generation after the `upsertNote` transaction commits, **not awaited** by the request; verify by test or instrumentation that the note save returns without waiting and that a failing generation leaves the saved note and its patient notification untouched (D3)
- [x] 3.4 Implement the staleness comparison as a pure function (`summary.noteUpdatedAt === note.updatedAt`) and cover it with unit tests for current, stale, and absent summaries
- [x] 3.5 Return the summary through `recordsForPatient`, `recordForAppointment` and `myRecords` only when current, as an optional field that is `null` otherwise; verify the records read issues no model call and its latency is unchanged (D9)
- [x] 3.6 Schedule a detached regeneration when a read finds the summary missing or stale and generation is enabled, without the read waiting on it; verify a read still returns immediately and that a summary lost to a restart is recovered by the next read
- [x] 3.7 Extend the `MedicalRecordEntry` DTO in `packages/shared/src/dto.ts` with the optional summary (text, model, generatedAt); verify `pnpm typecheck` passes across all three packages
- [x] 3.8 Verify the patient cannot alter a summary — confirm no create, update or delete route exists for it on `RecordsController`, matching the controller's existing no-DELETE posture

## 4. Feature B — patient-facing surface (web)

- [x] 4.1 Render the summary in `apps/web/features/records/record-entry.tsx` beside the clinical note, never replacing it, with the full note still visible; verify against a record that has both
- [x] 4.2 Label the summary as a generated plain-language summary and state that it is not the clinical record; verify the label is present in every state in which the summary renders
- [x] 4.3 Render the records page unchanged when the summary is absent — no placeholder, no error, no loading state; verify with `LLM_ENABLED=false` that `/patient/records` looks exactly as it does today

## 5. Feature A — consultation note draft (API)

- [x] 5.1 Expose the appointment's transcript and the doctor's `clinicalContext` from `ConsultationsService` for drafting, reusing the existing `context()` assembly rather than rebuilding it, and export it from `ConsultationsModule`; verify typecheck passes
- [x] 5.2 Implement thin-transcript detection as a pure function over the loaded messages using the group 1 constants; verify with unit tests in `apps/api/src/modules/records/draft.spec.ts` covering empty, one-sided, too-short, and sufficient transcripts (D6)
- [x] 5.3 Add the draft prompt builder as a pure function over the transcript, clinical context and appointment metadata; verify with a unit test that a second appointment's messages cannot enter the prompt
- [x] 5.4 Add a doctor-only `POST /records/appointments/:appointmentId/draft` route returning a discriminated result — a draft, or a refusal carrying `transcript-empty`, `transcript-too-thin`, or `unavailable`; verify a non-authoring doctor receives 403 and nothing is generated
- [x] 5.5 Run the thin-transcript check before any model call so refusal is deterministic and free; verify no model request is made for an empty transcript
- [x] 5.6 Require `COMPLETED` state for the draft route, mirroring `upsertNote`'s existing guard; verify a scheduled appointment is rejected
- [x] 5.7 Store the draft, one per appointment, overwriting on regeneration, with its `model` and `generatedAt`, and add no delete route; verify a reload returns the stored draft without a second generation (D4)
- [x] 5.8 Write the `NOTE_DRAFT_GENERATED` audit entry per generation with actor, appointment and model name; verify the entry appears and that no route can alter or remove it
- [x] 5.9 Add the optional `aiAssisted` boolean to `UpsertNoteDto` and persist it on the note in `upsertNote`; verify a note saved without the flag stores `false` (D7)
- [x] 5.10 Add the authenticated assist-availability endpoint reporting whether generation is enabled; verify it returns disabled with `LLM_ENABLED=false` (D9)
- [x] 5.11 Add draft, refusal and availability DTO types to `packages/shared/src/dto.ts`; verify `pnpm typecheck` passes

## 6. Feature A — prescription extraction guard (API)

- [x] 6.1 Implement candidate verification as a pure function: the `sourceMessageId` belongs to this appointment, that message was sent by the doctor, and the `excerpt` occurs verbatim in its body — discarding any candidate that fails, silently; verify with unit tests covering a fabricated excerpt, a patient-authored source message, and a foreign appointment's message id (D5)
- [x] 6.2 Store verified candidates as JSON on the draft row with their structured fields, `sourceMessageId` and `excerpt`, and return only verified candidates from the draft route; verify an unverifiable candidate never reaches the client
- [x] 6.3 Verify no code path creates a `Prescription` from a generation — confirm `addPrescription` remains the only writer and that a draft with candidates creates nothing until the doctor submits the prescription form

## 7. Feature A — doctor-facing surface (web)

- [x] 7.1 Add the "Draft from this consultation" action to `apps/web/app/(doctor)/doctor/consultations/[id]/page.tsx`, rendered only when the availability endpoint reports generation enabled and the appointment is `COMPLETED`; verify the action is absent with `LLM_ENABLED=false`
- [x] 7.2 Pre-fill the four note fields from the draft and label the form as holding generated content awaiting the doctor's review; verify the label appears whenever a draft has pre-filled the form and not on a hand-typed note
- [x] 7.3 Render the loading state and the refusal states — empty transcript, too thin, unavailable — as one absent-assistance surface with the reason shown, leaving the form editable and saveable by hand throughout; verify each state
- [x] 7.4 Declare `aiAssisted` on save when the form was pre-filled from a draft; verify the saved note records it and that clearing the fields and typing by hand is still saved as assisted only if the doctor started from the draft
- [x] 7.5 Pre-fill the prescription form from verified extraction candidates, showing the message the values came from and labelling them as extracted and awaiting confirmation; verify the form stays empty when there are no candidates

## 8. Cross-cutting verification

- [x] 8.1 Run `pnpm test` with `LLM_ENABLED=false` and verify every pre-existing test still passes with no model present and no database required
- [x] 8.2 Bring up `docker compose up --build` from a clean checkout and verify the application is usable and every non-assist behaviour works while the model is still pulling
- [x] 8.3 With the model service stopped and `LLM_ENABLED=true`, verify the doctor can still save a note, the patient's records page still renders notes and prescriptions, and both surfaces report assistance unavailable rather than erroring
- [x] 8.4 Verify matching, emergency indication, availability derivation and scheduling are byte-identical with generation enabled and disabled — confirm no model call originates from `matching`, `availability`, `appointments`, or the guards
- [x] 8.5 Verify a note revision hides the previous summary from the patient immediately and that a regenerated summary explains the revised note

## 9. Documentation

- [x] 9.1 Document the fourth compose service, the model volume, the first-boot pull and the new environment variables in `README.md` — including `LLM_ENABLED=false` as the supported escape hatch for a small laptop
- [x] 9.2 Add an honest paragraph to *Known limitations* on what a 3B local model is and is not good for, and record that `aiAssisted` is a client-declared provenance marker rather than an integrity control (D7)

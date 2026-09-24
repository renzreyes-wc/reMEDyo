# Proposal

## Why

Two of the three places reMEDyo asks a human to write prose are unassisted, and they sit at opposite ends of the same document. The doctor writes the consultation note from a blank form — `upsertNote` requires the appointment to be `COMPLETED`, so the clinician finishes the session and then re-derives from memory what was just said in a transcript the application already holds. The patient then reads that note raw: `findings`, `diagnosis`, `recommendations` rendered verbatim to a layperson by `RecordEntryCard`.

Both tasks are summarisation of material the system already has. Neither asks a model to originate clinical judgement, which is exactly what makes them the two defensible places to put a model in a medical product.

**This does not amend the standalone-runtime constraint.** The original proposal commits that "no SaaS, BaaS, or external runtime API is used for any product feature. Open-source libraries are permitted; hosted services are not." A self-hosted model is an open-source library with a process around it, not a hosted service. It runs as a fourth container in this project's own `docker-compose.yml`; `docker compose up --build` remains the whole setup story; the deployed runtime makes no outbound call to a vendor, and no patient data leaves the compose network. The distinction is written down here because "we added AI" reads like a constraint violation until it is.

## What Changes

**A first-party LLM runtime, shared by both features**

- A fourth compose service running a local model server, reachable only on the compose network with no port published to the host, its model cached in a named volume. The `api` service is **not** health-gated on it: a model that is still pulling, slow, or absent must not delay or break application startup.
- A NestJS `llm` module exposing one narrow provider interface — generate text from a prompt, under a token cap and a hard timeout. Configured by environment: base URL, model name, timeout, token cap, enabled flag. No feature module imports an HTTP client directly.
- `LLM_ENABLED=false` is a first-class supported configuration in which the application behaves exactly as it does today, with the assist surfaces **absent rather than broken**. The test suite runs in that mode, so every existing test keeps passing without a model present.

**Feature A — consultation note draft (doctor-facing)**

- A doctor-initiated "Draft from this consultation" action on the post-consultation note form, available only once the appointment is `COMPLETED`. Explicitly not automatic on `complete()`: a session with two messages has nothing to summarise, and generation should follow the clinician's intent rather than a state transition.
- Input is strictly the `Message` rows for that appointment, the `clinicalContext` already computed for that doctor by `ConsultationsService.context()`, and the appointment's own metadata. No other patient's data may enter a prompt, ever.
- Output pre-fills the four existing note fields. The doctor edits and saves; `upsertNote` remains the only writer of `ConsultationNote`. The model never writes to the record.
- **Refusal is a first-class outcome.** If the transcript is empty or too thin to support a summary, the system says so and drafts nothing. A confidently invented note is the worst possible output here.
- The draft is stored (one per appointment, carrying the generating model and timestamp) so it survives a reload and is auditable. It is never visible to the patient and is not part of the medical record.
- `ConsultationNote` gains a provenance flag recording whether the saved note began from a generated draft, set at save time by the authoring interface.

**Prescriptions are not generated** — carried as a prohibition, not a preference. A note summarises what was said; a prescription is a new clinical decision that is not in the transcript. The one permitted case is *extraction*: where a doctor's own `Message` states a medication, dose, frequency and duration, those may pre-fill the prescription form, and the system must be able to point at the message the values came from. Absent such a message, the prescription form stays empty.

**Feature B — plain-language record summary (patient-facing)**

- After the doctor saves a note, a plain-language rendering of it is generated and stored, one per appointment, with the generating model, the generation time, and a marker of which version of the note it explains.
- Input is the signed `ConsultationNote` and that appointment's `Prescription` rows — **not** the transcript and **not** the AI draft. The input is the clinician-approved document only.
- **Staleness is enforced.** Notes are revisable; a summary whose note has moved on MUST NOT be shown. Revising a note invalidates its summary and triggers regeneration.
- Displayed in `RecordEntryCard` beside the clinical note, never replacing it, labelled as a plain-language summary, with the clinician's note left visible so the patient can always compare the summary to its source.
- **Bounded content**: the summary introduces no clinical claim, instruction, dose or recommendation absent from the note and prescriptions it was generated from. It explains; it does not add.

**Cross-cutting rules**, landing as testable requirements rather than design prose:

1. No AI output enters the medical record without a clinician's authenticated save.
2. Every AI-generated surface is labelled as such at the point of display, in both interfaces.
3. AI never participates in authorization, matching, emergency detection, or scheduling. The symptom-rules emergency indicators stay deterministic — a missed emergency flag is the one failure in this product that actually harms someone.
4. Every generation is audited: actor, appointment, kind of generation, model used. Insert-only, like every other audit entry.
5. Every feature degrades cleanly. With the model down, slow, or disabled, the doctor writes the note by hand as today and the records page renders the note without a summary. Neither surface blocks, errors, or loses data.
6. Prompts carry only the data the feature needs, scoped to one appointment and its two participants.

## Capabilities

### New Capabilities

- `clinical-assist`: The cross-cutting contract for model-generated content — where generation is permitted at all, the clinician-sign-off rule, mandatory labelling at the point of display, auditing of every generation, clean degradation when the runtime is absent or disabled, prompt data minimisation, and the standing prohibition on any model participating in authorization, matching, emergency detection or scheduling.

### Modified Capabilities

- `medical-records`: **Consultation notes** gains draft generation from the session transcript, the refusal-on-thin-transcript rule, and a provenance marker on the saved note. A new requirement covers the patient-facing plain-language summary — its clinician-approved inputs, the staleness rule tying a summary to the note version it explains, its bounded content, and its non-authoritative status beside the note. **Prescriptions** gains the prohibition on generated prescriptions and the narrow, traceable extraction exception.
- `consultation-session`: **In-session text exchange** gains the statement that the stored transcript is an input to the doctor's own note drafting after completion, and that this use is confined to that appointment's clinician.

### Explicitly Unchanged

- `doctor-matching`: its requirement that the system "MUST NOT call any external service to perform matching" stands untouched, and matching stays rule-based here. Semantic or embedding-based matching is a separate future change and is out of scope.

## Impact

- **`docker-compose.yml`** — a fourth service for the model runtime and a named volume for the model cache, following the existing health-gated pattern for its own readiness but never gating `api`.
- **`apps/api/prisma/schema.prisma`** — a note-draft model, a patient-summary model, a provenance field on `ConsultationNote`, and new `AuditAction` values; one migration.
- **`apps/api/src/modules/llm/`** — new module: provider interface, HTTP-backed implementation, config, prompt builders, and the disabled-mode no-op.
- **`apps/api/src/modules/records/`** — draft generation endpoint, summary generation on note save, staleness handling on read, assist-availability status.
- **`apps/api/src/modules/consultations/`** — transcript and clinical-context access for drafting.
- **`packages/shared`** — DTO types for the draft, the extraction candidates and the summary; assist tunables alongside the existing constants.
- **`apps/web/features/records/record-entry.tsx`** — the labelled summary surface beside the note.
- **`apps/web/app/(doctor)/doctor/consultations/[id]/page.tsx`** — the draft action with its loading, refusal and unavailable states, plus the extraction pre-fill of the prescription form.
- **`README.md`** — the compose service, the new environment variables, and an honest paragraph in *Known limitations* on what a small local model is and is not good for.
- **No change** to authentication, the guards, matching, scheduling, availability derivation, notifications, or the admin console.

# Design

## Context

See proposal.md — *Why* for motivation. The constraints that shape the approach:

- **The standalone-runtime rule stands.** A model server is a container in this repo's own compose file, on the compose network, with no outbound call to a vendor. Nothing about the rule changes; what changes is that the rule now has to be argued for rather than assumed, because a reviewer's first reading of "AI" is "hosted API".
- **A reviewer's laptop is the target machine.** `docker compose up --build` from a clean checkout is the whole setup story today. A fourth service must not turn that into a twenty-minute wait or an out-of-memory kill, and must not make the application unusable while the model is still pulling.
- **The write path is already correct and must stay that way.** `RecordsService.upsertNote` is a single authenticated doctor-only write inside a transaction that also emits the patient notification. Anything added here hangs off it; nothing reaches inside it.
- **`ConsultationsService.context()` already assembles `clinicalContext`** — age, allergies, medications, conditions — for the doctor only. The drafting prompt needs exactly that, so the shape exists; it needs to be reachable from the records module rather than rebuilt.
- **Nothing is hard-deleted.** Notes are revised, audit entries are insert-only. Generated artefacts inherit that.
- **The test suite has one spec file and no database.** `apps/api` runs Vitest over pure functions (`slot-derivation.spec.ts`). New logic should be shaped so its testable parts — prompt assembly, thin-transcript detection, extraction verification, staleness comparison — are pure functions that need neither Postgres nor a model.

## Goals / Non-Goals

**Goals:**

- One narrow seam between the application and any model, so that swapping the runtime, the model, or the transport touches one file.
- A disabled mode that is genuinely a supported configuration rather than a degraded one: `LLM_ENABLED=false` is what CI and the test suite run, and what a reviewer with a slow laptop can set.
- Failure paths that are boring: a model that is down, slow, still pulling, or returning nonsense produces an absent surface, never a broken one and never a corrupted record.
- The parts worth testing are pure and testable without a model or a database.

**Non-Goals:**

- Streaming, token-by-token UI, or any realtime channel. The existing polling posture stands.
- Retry queues, background job infrastructure, or a scheduler. Generation is either in-request or a fire-and-forget after commit; there is no durable work queue.
- Quality benchmarking or evaluation harnesses for the model's output. The safety argument here rests on the clinician's sign-off and the labelling, not on the model being good.
- GPU support, quantisation tuning, or model warm-up orchestration.

## Decisions

### D1 — Ollama as the runtime, `llama3.2:3b` as the model

**Decision.** A fourth compose service `ollama` running `ollama/ollama`, on the compose network only, with the model cached in a named `remedyo-models` volume. Default model `llama3.2:3b` (~2 GB, 4-bit quantised, instruction-tuned), pulled on first boot by a small entrypoint that starts the server and then pulls if the tag is absent.

**Why.** Ollama is Apache-2.0, ships a single container, needs no GPU, and exposes a plain HTTP JSON API — no SDK, no client library, no vendor account. A 3B instruction-tuned model is the smallest size that reliably follows a "summarise this, add nothing" instruction, and 2 GB is a tolerable first-boot pull and a tolerable resident footprint next to Postgres, the API and Next.js on a laptop.

**Alternatives.** `qwen2.5:7b-instruct` (~4.7 GB) summarises noticeably better and would be the choice on a workstation, but doubles the pull and can push an 8 GB laptop into swap — it stays available by changing one environment variable. `llama.cpp` with a hand-mounted GGUF avoids the Ollama layer but moves model acquisition into the reviewer's lap. A Node-embedded runtime inside the `api` container was rejected: it couples model memory to API memory and makes `LLM_ENABLED=false` a code path rather than a deployment shape.

**Consequence for compose.** The `ollama` service gets its own healthcheck, but `api` **must not** `depends_on` it with `condition: service_healthy`. The whole point of degradation is that the application boots and serves while a 2 GB pull is still running. `web` keeps depending on `api` as it does today.

### D2 — One provider interface, one transport, one disabled implementation

```
LlmProvider.generate({ prompt, system, maxTokens, signal }) → { text, model }
```

A single `llm` module exports that interface plus its configuration (`LLM_ENABLED`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT_MS`, `LLM_MAX_TOKENS`). Transport is `fetch` with an `AbortSignal.timeout`, because Node 20 has both and adding an HTTP client for one POST is not worth a dependency. When `LLM_ENABLED` is false the module provides an implementation that reports unavailability without attempting a call; feature code takes the same branch it takes for a dead runtime, so disabled and down share one path and one set of tests.

Feature modules import the provider, never `fetch`. Prompt builders live beside the provider as pure functions taking already-loaded rows and returning a string — that is what the unit tests exercise.

### D3 — The summary is generated eagerly after the note-save commit, off the request path, with a repair on read

*(Resolves the open question "eager on save vs lazy on read".)*

**Decision.** `upsertNote` commits exactly as it does today. After the transaction returns, summary generation is started and **not awaited** by the request. Separately, the records read is pure: it returns the stored summary only when that summary's recorded note version matches the note's current `updatedAt`, and otherwise returns none. If a read finds the summary missing or stale while generation is enabled, it starts a regeneration the same detached way and still returns immediately.

**Why not eager-and-awaited.** Awaiting a 10-second generation inside the doctor's save turns the most important write in the product into the slowest, and couples a clinical record write to a model's mood. Unacceptable.

**Why not purely lazy.** A lazy-on-read design puts a loading state and a model timeout on the patient's records page, which is a list — one slow generation would stall the whole list or force per-card async rendering.

**Why both halves.** Eager-after-commit means the summary is usually there by the time the patient looks. The read-side repair means a generation lost to a restart, a timeout, or a runtime that was down at save time is not lost forever — the next read schedules it. The read itself never waits, so the records page keeps exactly today's latency.

**Cost accepted.** A doctor who revises a note three times causes three generations. At this scale that is fine, and it is the correct trade against showing a patient a summary of a superseded note.

**Staleness mechanism.** The stored summary carries `noteUpdatedAt` copied from the note it explains. Display requires `summary.noteUpdatedAt === note.updatedAt`. This needs no version counter, no invalidation hook, and no cleanup job: revising the note moves `updatedAt` and the comparison fails on the next read. Deleting nothing, as the system requires.

### D4 — One draft per appointment, superseded on regeneration; history lives in the audit log

*(Resolves the open question "draft per note revision or single latest draft".)*

**Decision.** `ConsultationNoteDraft` is unique on `appointmentId`. Regenerating overwrites it. There is no delete endpoint.

**Why.** The draft is scaffolding, not a record — it is not part of the medical record, never reaches the patient, and has no reader other than the doctor's own form. Versioning it would create a second, near-identical history alongside the note's own revisions with nothing reading it. The auditability requirement is met by the insert-only `AuditLog` entry written per generation, which is where "who generated what, when, with which model" belongs. The draft row exists so the form survives a reload, and carries its own `model` and `generatedAt` so any draft on screen can be traced.

### D5 — Prescription extraction: a `Message` reference *and* a verbatim excerpt, verified server-side

*(Resolves the open question on traceability representation.)*

**Decision.** Extraction candidates are stored on the draft row as JSON — each candidate carrying the structured fields (`medication`, `dosage`, `frequency`, `durationDays`, optional `instructions`), the `sourceMessageId`, and the `excerpt` the values were read from. Before a candidate is stored or returned, the API verifies deterministically that (a) `sourceMessageId` belongs to this appointment, (b) that message was sent by the **doctor**, and (c) the `excerpt` occurs verbatim in that message's body. A candidate failing any check is discarded silently.

**Why both.** The id alone makes the UI join to a message to show provenance and proves the message is the doctor's own, but cannot show that the extracted dose is actually in it. The excerpt alone is unverifiable — a model can produce a plausible quotation of something never said. Requiring both makes the verification a string containment check against a row the system already holds: a fabricated dose cannot survive it, because the fabricated excerpt will not be found. That deterministic guard is what turns "prescriptions are not generated" from a prompt instruction into an enforced property.

**Why JSON on the draft row rather than a table.** Candidates are transient pre-fill material with no independent identity, no reader outside the one form, and no lifecycle beyond the draft that carries them. A table would imply they are records; they are not.

### D6 — Refusal is a typed outcome, not an exception

The draft endpoint returns a discriminated result: a draft, or a refusal with a reason (`transcript-empty`, `transcript-too-thin`, `unavailable`). Thin-transcript detection runs **before** any model call and is a pure function over the loaded messages — a minimum count of messages, a minimum count from each participant, and a minimum total length, expressed as constants in `packages/shared`. Checking before calling means the refusal is deterministic, is testable without a model, and costs nothing.

"Unavailable" (disabled, unreachable, timed out, or unparseable output) is the same shape, so the client renders one absent-assistance state regardless of cause.

### D7 — Provenance is declared by the authoring interface, and is a marker rather than a control

`UpsertNoteDto` gains an optional boolean; `ConsultationNote` gains `aiAssisted`. Only the form knows whether the doctor actually started from the draft — the presence of a draft row does not tell you that, because a doctor may generate one and then ignore it. So the client declares it and the server stores what was declared.

This is honest but not a security control: a doctor posting directly to the API can set either value. It is a provenance marker in a prototype where the doctor is the accountable author of the note either way. Recorded here so nobody later mistakes it for an integrity guarantee, and stated as such in the README's *Known limitations*.

### D8 — Output handling: constrained decode, then structural validation

Both features ask for JSON with a fixed set of keys, requested through Ollama's `format: "json"` option and a system prompt that states the schema and forbids adding anything not present in the input. The response is parsed and validated structurally before use: unknown keys dropped, missing required keys treated as a failed generation, and every field truncated to the limits `UpsertNoteDto` already enforces (4000 / 2000 / 4000 / 1000) so a generated draft can never be a draft the form cannot save.

Nothing here validates *clinical* content — no automated check can, and claiming one would be the dishonest move. The safety argument is the clinician's sign-off for Feature A, and for Feature B the fact that the input is already a clinician-approved document. The bounded-content requirement is carried by the prompt and by the labelling; the design does not pretend otherwise.

### D9 — Assist availability is advertised, not inferred

A small authenticated endpoint reports whether assistance is enabled, so the web can decide whether to render the draft action at all rather than rendering a button that always fails. With `LLM_ENABLED=false` the surfaces are genuinely absent, which is what the spec requires. The records payload gains an optional summary field that is simply `null` when there is none — no separate call, no loading state on the patient's list.

## Risks / Trade-offs

- **A 3B model writes a mediocre clinical note.** → The doctor edits before signing, and the note form is unchanged from today: the worst case is that the doctor clears four fields and types what they would have typed anyway. The README says plainly that the local model is for shaping prose, not for clinical accuracy.
- **A model fabricates a finding the transcript never contained.** → Not automatically detectable. Mitigated by refusal on thin transcripts (the case where fabrication is most likely), by a prompt that forbids addition, by mandatory review-before-save, and by the doctor's authenticated save being the only writer. The prescription path, where fabrication is most dangerous, is additionally guarded by the deterministic excerpt verification in D5.
- **First boot pulls 2 GB and the reviewer thinks the app is broken.** → `api` is not gated on the model service, so the application is fully usable during the pull; the assist surfaces report unavailable until it completes; the README says to expect it.
- **Memory pressure on a small laptop with four containers.** → 3B/4-bit keeps the model near 2–3 GB resident. `LLM_ENABLED=false` (and skipping the service) is documented as the escape hatch, and it is the mode the test suite already runs in.
- **Detached generation is lost on a restart mid-flight.** → Accepted, and covered: the read-side repair in D3 reschedules on the next records read. No queue, no durability guarantee, no orphaned state — the stored summary is either current or absent.
- **Regeneration on every note revision costs a generation each time.** → Accepted (D3). Cheap at this scale, and the alternative is showing a patient the plain-language version of a note that has since been corrected.
- **`aiAssisted` is client-declared.** → Stated as a marker, not a control (D7), in the design and in the README.
- **The prompt is the only thing keeping the patient summary bounded.** → Reduced but not eliminated: the input is already the clinician's approved note, the summary is displayed beside that note rather than instead of it, and it is labelled as non-authoritative, so a patient always has the source text next to the rendering of it.

## Migration Plan

One additive migration: two new tables, one nullable-with-default boolean column on `ConsultationNote`, and new `AuditAction` enum values. No backfill — existing notes get `aiAssisted = false` from the column default, which is correct, and existing appointments simply have no draft and no summary until one is generated. Nothing is rewritten and nothing is dropped.

Rollback is `LLM_ENABLED=false`: the assist surfaces disappear, the compose service can be removed, and the application is exactly what it is today. The two tables and the column are inert in that state — no reader, no writer, no behaviour. A schema rollback is therefore never on the critical path.

Order of work follows the proposal: runtime first, then Feature B, then Feature A. Feature B's input is a clinician-approved document and its output is explicitly non-authoritative, so it is the lower-risk place to prove the compose service, the generate-and-store pattern, the labelling and the degradation path — before a generated draft is put in front of a clinician.

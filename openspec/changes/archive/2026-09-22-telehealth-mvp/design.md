# Design

## Context

Greenfield: the repository contains only OpenSpec scaffolding. See proposal.md — Why for motivation, and `specs/` for the behavior contract.

The binding constraints are the brief's, not ours:

- Next.js or React+Vite frontend, NestJS backend, TypeScript throughout, pnpm, Prisma + PostgreSQL, REST/JSON.
- **Standalone runtime.** No SaaS, BaaS, or external runtime API for authentication, matching, notifications, messaging, file storage, scheduling, conferencing, or medical records. Open-source libraries are fine; hosted services are not. This single rule decides more of the design than any other.
- Docker Compose must bring the whole system up locally.
- Under four hours of build time, judged on a working core journey, product sense, code quality, and how well it is explained.

The time budget is the real architectural constraint. Every decision below is biased toward "obvious and explainable in a 15-minute video" over "sophisticated".

## Goals / Non-Goals

**Goals:**

- The core journey — register, find a doctor, book, consult, read the notes — works end to end on a fresh `docker compose up` with no manual setup.
- Server-side enforcement of every access rule, so the API is safe independently of what the UI chooses to render.
- Feature-aligned module boundaries that read the same on both sides of the API, so the architecture explains itself.
- A demo that boots with believable seeded data rather than an empty screen.

**Non-Goals:**

- Horizontal scale, caching layers, read replicas, or background job infrastructure.
- Real-time transport. Polling is sufficient at prototype scale and removes a whole class of failure from the demo.
- Audio/video streaming — explicitly not required by the brief.
- Test coverage as a target. A thin band of tests over the booking conflict rules, which are the only genuinely tricky logic, is the correct investment at this budget.
- Bonus features. Deliberately deferred; see proposal.md.

## Decisions

### Monorepo layout — pnpm workspace, feature-aligned on both sides

```
reMEDyo/
├─ pnpm-workspace.yaml
├─ docker-compose.yml               web · api · postgres
├─ packages/shared/                 enums, DTO types, zod schemas
└─ apps/
   ├─ web/          Next.js App Router, no src/
   │  ├─ app/(marketing)|(auth)|(patient)|(doctor)|(admin)/
   │  ├─ features/<feature>/{components,hooks,api.ts,types.ts}
   │  ├─ components/ui/             shared primitives only
   │  └─ lib/                       api client, session, utils
   └─ api/          NestJS, src/ per Nest convention
      ├─ prisma/schema.prisma
      └─ src/modules/<feature>/{controller,service,dto}
```

`features/` on the web and `modules/` on the api use **the same feature names**: `auth`, `users`, `doctors`, `availability`, `appointments`, `consultations`, `records`, `matching`, `notifications`, `admin`. A reviewer who understands one side can navigate the other without a map, and the capability list in `specs/` maps onto both.

*Alternatives:* two separate repositories — rejected, Docker Compose and shared types both get worse. A single Next.js app with API routes — rejected, NestJS is mandated. Layer-first folders (`controllers/`, `services/`, `models/`) — rejected; it scatters one feature across four directories and reads worse in a demo.

`packages/shared` holds only types, enums, and zod schemas. No runtime logic, so it needs no build step beyond TypeScript path aliases.

### Next.js App Router over React + Vite

The landing page is a trust surface. Server-rendering it gives an instant first paint with no loading skeleton, which matters more on a public healthcare page than anywhere else in the product. Route groups map one-to-one onto the brief's four modules, and one container serves the marketing site and all three role interfaces — exactly the container diagram in the brief.

*Alternative:* React + Vite behind nginx. Smaller image, faster HMR, less framework to explain. Rejected because the landing page would be client-rendered, which is the one page where that is most visible.

Data fetching is client-side against the NestJS API for all authenticated views — the marketing pages are the only server-rendered ones. This keeps exactly one path to data (the REST client) rather than two, which is worth more at this budget than per-page optimisation.

### Authentication — JWT in an httpOnly cookie

A signed JWT carrying `{ sub, role }`, set as an httpOnly, SameSite=Lax cookie, verified by a Nest guard. Passwords hashed with argon2 (bcrypt is an acceptable substitute).

*Why not a session table:* one extra round trip and a table for no benefit a prototype can observe.
*Why not localStorage:* it is readable by any script on the page, which is the wrong default for medical data and the wrong thing to defend in a video.
*Accepted cost:* no server-side revocation, so suspending an account cannot kill a live token instantly. Mitigated by a short token lifetime and by the guard re-reading account status on each request — which is what actually satisfies the identity-access spec's suspension scenario.

Authorization is two Nest guards, `RolesGuard` (coarse: is this user a doctor?) and per-service ownership checks (fine: is this *their* appointment?). Ownership cannot live in a guard because it needs the record; putting it in the service keeps it next to the query that loads it.

### Booking conflicts — database constraint plus a transaction

The scheduling spec's hardest requirement is that two patients booking the same slot produce exactly one appointment. Application-level "check then insert" loses that race.

Instead: a **unique index on `(doctorId, startsAt)` filtered to active appointments**, with booking performed inside a transaction that inserts and lets the constraint arbitrate. The loser catches the unique-violation error and returns 409 Conflict. Rescheduling is the same transaction shape — release and re-hold atomically — so a failed reschedule cannot orphan the original slot.

*Alternative:* `SELECT ... FOR UPDATE` on the doctor's row. Correct, but serialises all booking for a doctor and is harder to explain than a unique index. *Alternative:* optimistic retry. More code, same outcome.

Slots are **derived, never stored**. Availability is stored as recurring weekly windows plus date-level exceptions; bookable slots are computed on read by expanding windows over a date range and subtracting exceptions and held appointments. Storing materialised slots would mean a generation job and a drift problem — real cost for no prototype benefit.

### Consultation session — polled state machine, no WebSockets

The session is a row with a state column moving `scheduled → joined → in_progress → completed`, transitions guarded server-side. The workspace polls every few seconds for state and new messages.

*Why not WebSockets:* a gateway, a connection lifecycle, and reconnect handling — real complexity, and the failure mode in a live demo is a dead screen. Polling at this scale is invisible to the user and cannot break in a way the audience notices. This is a deliberate trade named in the video, not an oversight.

The text channel is an ordinary table of messages scoped to the appointment, which doubles as the transcript the consultation-session spec requires to survive completion.

### Matching — a rules table, not a model

Symptoms map to specializations through seeded rows of `(symptom, specialization, weight)`. Score each approved doctor by summing weights for their specializations against the submitted symptoms; rank by score, then availability within seven days, then experience. Ties broken by doctor id so ranking is stable.

Deterministic, explainable in one sentence, trivially seeded, and it satisfies both the "no external AI service" rule and the spec's requirement that every suggestion carry a reason — the matched rows *are* the reason. Free text is matched by keyword against the same symptom catalogue; anything unmatched falls back to general practice, labelled as such.

### Notifications — rows written in the same transaction as the event

A `Notification` table with `(userId, type, payload, readAt)`. Creation happens inside the transaction that causes it, so a booking that rolls back cannot leave a phantom notification. The client polls for unread count alongside its other requests.

Upcoming-appointment reminders are **computed on read**, not delivered by a scheduler — a query for appointments starting inside the imminent window. No cron, no worker, and a cancelled appointment stops reminding automatically because it falls out of the query.

### Data model

Fourteen tables. `User` holds credentials, role, and status; `PatientProfile` and `DoctorProfile` hang off it one-to-one, keeping role-specific fields out of a sparse shared table.

```
User ──1:1── PatientProfile ──1:N── MedicalHistoryEntry
  │                │
  │                └──1:N── Appointment ──1:1── ConsultationSession ──1:N── Message
  │                              │                      │
  └──1:1── DoctorProfile ────────┘                      ├──0:1── ConsultationNote
             │                                          └──0:N── Prescription
             ├──1:N── AvailabilityWindow
             └──1:N── AvailabilityException

User ──1:N── Notification          AuditLog ──N:1── User (actor)
SymptomRule  (seeded reference data)
```

Notes and prescriptions reference the appointment, not the patient, so "who may read this" is always answered by the appointment's two participants — which is precisely how the medical-records spec defines access. Nothing is hard-deleted: appointments carry a cancelled state, notes and prescriptions are revised rather than removed, and audit entries are insert-only.

### Seed data

The seed is a deliverable, not a convenience. On first boot: one admin, ~8 approved doctors spread across specializations with realistic availability, one pending doctor so the approval queue is demonstrable, 2–3 patients with history, and a mix of appointments — upcoming, imminent, and completed with notes and a prescription already attached. A demo that opens on a populated dashboard reads as a product; one that opens empty reads as a scaffold.

### Docker Compose

Three services: `postgres` (with a healthcheck), `api` (waits for the healthcheck, runs `prisma migrate deploy` and the seed on start), `web`. A single `docker compose up` must reach a working, populated app — no second terminal, no manual migrate step. That is the setup instruction the brief asks for, and the shortest path to a reviewer seeing it work.

## Risks / Trade-offs

- **Four hours is not enough for ten capabilities at full depth** → Tasks are ordered so the patient spine (register → discover → book → consult → notes) is complete before doctor tooling, and admin last. If the clock runs out, what is missing is breadth at the edges, not a hole in the middle.
- **JWT cannot be revoked server-side** → Short expiry plus a status re-check in the guard. Named openly in the video rather than hidden.
- **Polling instead of realtime** → Invisible at demo scale; the failure mode is a slightly stale panel rather than a dead connection. A deliberate, defensible trade.
- **Derived slots recompute on every read** → Bounded by a date range of at most a few weeks over a handful of windows. Trivial at this size; would need materialising at real scale.
- **Prescriptions look real** → Every prescription is labelled as fictional and non-dispensable in the UI, and the landing page carries the prototype disclaimer. This is a product-safety decision, not decoration.
- **Docker image build time eats the clock** → Develop against `pnpm dev` with Postgres alone in Compose; build the full Compose stack once, early enough to debug it, not in the final ten minutes.
- **Scope creep into bonus features** → Explicitly excluded in the proposal. The bar for adding anything is that the core journey is already demonstrable end to end.

## Migration Plan

Greenfield; there is nothing to migrate. Deployment is `docker compose up --build`, which runs `prisma migrate deploy` and the idempotent seed before the API accepts traffic. Rollback is discarding the stack and its volume.

Optional bonus deployment to Fly.io as three first-party components — web, api, and Fly Postgres — which introduces no SaaS feature dependency and stays inside the standalone-runtime rule. Attempted only after the local Compose deliverable is complete and recorded.

## Open Questions

- Consultation slot duration — 30 minutes assumed. Changing it alters no spec and no task, only a seeded constant.
- Join window bounds — 15 minutes before start, 15 after scheduled end, assumed. Same: a constant.
- Whether the Fly.io deployment is attempted at all depends entirely on time remaining once the required deliverables are recorded.

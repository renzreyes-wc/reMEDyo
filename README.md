# reMEDyo

A telehealth prototype: find the right doctor for what is actually worrying you,
book a consultation, meet online, and keep every note and prescription in one
place.

> **This is a fictional prototype.** Every doctor, credential, appointment,
> consultation note and prescription in this application is invented. Nothing
> here is medical advice, and no prescription issued by it is valid for
> dispensing. Built for the 10x Onboarding exercise.

---

## Quick start

**Prerequisites:** Docker Desktop (with Compose v2). Nothing else — Node, pnpm
and Postgres all run inside the containers.

```bash
git clone <your-repo-url> reMEDyo
cd reMEDyo
docker compose up --build
```

Then open **http://localhost:3000**.

That single command starts Postgres, waits for it to be genuinely healthy,
applies the migrations, seeds demonstration data, and serves the app. There is
no second terminal and no manual migrate step.

| Service  | URL                             |
| -------- | ------------------------------- |
| Web      | http://localhost:3000           |
| API      | http://localhost:4000/api       |
| Health   | http://localhost:4000/api/health |
| Postgres | `localhost:5433` (user/pass/db: `remedyo`) |

### Demo accounts

The seed creates a populated system, so the app opens on real content rather
than empty screens.

| Role        | Email                     | Password       |
| ----------- | ------------------------- | -------------- |
| Patient     | `jose@remedyo.test`       | `Password123!` |
| Patient     | `ana@remedyo.test`        | `Password123!` |
| Doctor      | `dr.cruz@remedyo.test`    | `Password123!` |
| Doctor      | `dr.reyes@remedyo.test`   | `Password123!` |
| Admin       | `admin@remedyo.test`      | `Admin123!`    |

Every seeded doctor uses `Password123!`. One doctor (`dr.aquino@remedyo.test`)
is deliberately left **pending approval** so the admin review queue has
something in it on first boot, and `ana@remedyo.test` has a consultation
starting within the join window so the consultation room is immediately
demonstrable.

### A two-minute tour

1. Sign in as **jose@remedyo.test** → *Find a doctor* → **Help me choose** →
   tick “Chest pain or tightness” → see cardiology ranked first, with the reason
   and an emergency warning.
2. Open a doctor, pick a slot, book. Try booking the same slot in another
   browser as `ana@remedyo.test` — exactly one booking survives.
3. Sign in as **dr.reyes@remedyo.test**, open the imminent consultation, and
   watch the session move to *Both present*.
4. End the consultation, write the notes and a prescription.
5. Back as the patient: the record is in *Medical records*, and the notification
   arrived in-app.
6. Sign in as **admin@remedyo.test** → *Doctor review* → approve Dr. Aquino and
   watch him appear in the patient directory. Then check the *Audit log*.

---

## Local development (without Docker)

You need Node 20+, pnpm 10+, and a PostgreSQL 14+ instance.

```bash
pnpm install
cp .env.example .env                # adjust DATABASE_URL if needed
cd apps/api
cp ../../.env.example .env
pnpm prisma migrate deploy
pnpm seed
cd ../..
pnpm dev                            # web on :3000, api on :4000
```

Useful scripts:

```bash
pnpm test         # API unit tests (slot derivation + booking conflict rules)
pnpm typecheck    # every workspace
pnpm build        # shared -> api -> web
pnpm db:studio    # Prisma Studio
```

---

## Architecture

```
                       ┌──────────────────────────────┐
  Browser  ──────────► │  web · Next.js (App Router)  │
                       │  marketing + patient +       │
                       │  doctor + admin interfaces   │
                       └──────────────┬───────────────┘
                                      │ REST/JSON over HTTP
                                      │ (session = httpOnly cookie)
                       ┌──────────────▼───────────────┐
                       │  api · NestJS                │
                       │  auth · users · doctors ·    │
                       │  availability · appointments │
                       │  consultations · records ·   │
                       │  matching · notifications ·  │
                       │  admin                       │
                       └──────────────┬───────────────┘
                                      │ Prisma
                       ┌──────────────▼───────────────┐
                       │  postgres                    │
                       └──────────────────────────────┘
```

Everything runs in-application. No SaaS, BaaS, or external runtime API is used
for authentication, matching, notifications, messaging, scheduling, the
consultation session, or medical records. The landing page renders completely
with no outbound internet access.

### Repository layout

```
reMEDyo/
├─ docker-compose.yml          web · api · postgres
├─ apps/
│  ├─ web/                     Next.js (App Router, no src/)
│  │  ├─ app/
│  │  │  ├─ (marketing)/       landing, terms, privacy
│  │  │  ├─ (auth)/            login, register/patient, register/doctor
│  │  │  ├─ (patient)/         overview, find-doctor, appointments, records
│  │  │  ├─ (doctor)/          overview, consultations, schedule, profile
│  │  │  ├─ (admin)/           dashboard, doctors, users, appointments, audit
│  │  │  └─ consultation/[id]/ the shared consultation workspace
│  │  ├─ features/             feature-first: auth, doctors, appointments,
│  │  │                        records, notifications, shell
│  │  ├─ components/ui/        shared primitives only
│  │  └─ lib/                  api client, formatting
│  └─ api/                     NestJS
│     ├─ prisma/               schema, migrations, seed
│     └─ src/modules/          one module per feature
└─ packages/shared/            enums, DTO types, tunable constants
```

The feature names match on both sides of the API — `appointments` in
`apps/web/features` maps one-to-one to the `appointments` module in
`apps/api/src/modules`. Knowing one side means you can navigate the other.

---

## Three decisions worth knowing

**Booking races are settled by the database, not by application code.** A
partial unique index on `(doctorId, startsAt)` restricted to `SCHEDULED`
appointments makes Postgres the referee: two concurrent bookings both insert,
one commits, the loser takes a unique violation that becomes a `409`. A
check-then-insert in the service would lose that race. The index is filtered
so a *cancelled* appointment stops reserving its slot and the time can be
rebooked. There is a second index on `(patientId, startsAt)` so a patient
cannot hold two consultations at once.

**Bookable slots are derived, never stored.** Availability is kept as recurring
weekly windows plus date-level exceptions; slots are computed on read by
expanding those over a date range and subtracting blocked dates, past times, and
slots an active appointment holds. Storing materialised slots would mean a
generation job and a drift problem. The derivation is a pure function
(`apps/api/src/modules/availability/slot-derivation.ts`) and is where the test
budget went.

**The consultation room polls; it does not use WebSockets.** A gateway,
connection lifecycle and reconnect handling are real complexity, and the failure
mode in a live demo is a dead screen. Polling every three seconds is invisible
at this scale and degrades to a slightly stale panel. A deliberate trade, not an
oversight.

---

## Security and access

- Passwords are stored only as argon2 hashes, and are never returned by any
  endpoint.
- The session is a JWT in an **httpOnly, SameSite=Lax** cookie, so no script on
  the page can read it. It expires after two hours.
- A stateless JWT cannot be revoked, so the auth guard **re-reads the account
  row on every request**. Suspending an account takes effect on that user's very
  next request, even though their token is still signed and unexpired.
- Role checks are a guard; ownership checks live in the services, next to the
  query that loads the record — answering "is this *your* appointment?" needs
  the record.
- A doctor can read a patient's history only where they hold at least one
  appointment with that patient. The relationship *is* the authorisation.
- Consultation notes, prescriptions and audit entries are never hard-deleted.
  There is no DELETE route for any of them; corrections are revisions.

---

## Known limitations

Named openly, because they were choices rather than accidents:

- **No audio or video.** The brief marks streaming as not required. The
  consultation room is a first-party, state-tracked workspace with a text
  channel and full clinical context.
- **No server-side token revocation.** Mitigated by a short token lifetime plus
  the per-request status re-read described above.
- **Polling, not realtime.** See above.
- **Prescriptions are fictional** and labelled as not dispensable everywhere
  they appear. That is a product-safety decision, not decoration.
- **Slot derivation recomputes on every read.** Bounded by a few weeks over a
  handful of windows; it would need materialising at real scale.
- **Matching is rules, not intelligence.** Symptoms map to specialties through
  seeded `(symptom, specialization, weight)` rows. Deterministic, explainable,
  and the matched rows *are* the explanation shown to the patient.

## Possible next steps

- WebRTC audio/video in the existing consultation room.
- Refresh tokens with a revocation list.
- Doctor-side patient search across their own caseload.
- Structured prescription templates and drug interaction warnings.
- Server-Sent Events to replace polling without the WebSocket lifecycle.

---

## Optional: deploying to Fly.io

Three first-party components — api, web, and Fly Postgres — so no SaaS or
external feature API enters the runtime. Configs live at `apps/api/fly.toml`
and `apps/web/fly.toml`; run everything **from the repository root**, because
the Dockerfiles copy the pnpm workspace manifests.

Order matters: the web build bakes the API's public URL in at build time, so
the api must exist first.

```bash
# 1. API, with its database
fly launch --no-deploy --config apps/api/fly.toml
fly postgres create --name remedyo-db
fly postgres attach remedyo-db --app remedyo-api          # sets DATABASE_URL
fly secrets set JWT_SECRET="$(openssl rand -hex 32)" --app remedyo-api
fly deploy . --config apps/api/fly.toml

# 2. Web, pointed at the deployed API
fly launch --no-deploy --config apps/web/fly.toml
fly deploy . --config apps/web/fly.toml \
  --build-arg NEXT_PUBLIC_API_URL=https://remedyo-api.fly.dev

# 3. Close the CORS loop so the session cookie travels
fly secrets set WEB_ORIGIN="https://remedyo-web.fly.dev" --app remedyo-api
```

The api container applies migrations and runs the idempotent seed on start, so
the deployed app comes up populated exactly as it does locally.

---

## Tech stack

TypeScript throughout · Next.js 16 (App Router) · React 19 · Tailwind CSS 4 ·
NestJS 12 · Prisma 6 · PostgreSQL 18 · pnpm workspaces · Vitest · Docker Compose

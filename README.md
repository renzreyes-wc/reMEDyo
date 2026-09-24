# reMEDyo

A telehealth prototype: find the right doctor for what is actually worrying you,
book a consultation, meet online, and keep every note and prescription in one
place.

> **This is a fictional prototype.** Every doctor, credential, appointment,
> consultation note and prescription in this application is invented. Nothing
> here is medical advice, and no prescription issued by it is valid for
> dispensing. Built for the 10x Onboarding exercise.

---

**Technical documentation:** <https://renzreyes-wc.github.io/reMEDyo/> — the
context and feature set, the architecture at four levels, every API module, the
data model, and an API reference generated from the running application. This
README stays what it is: the quick start.

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
applies the migrations, seeds demonstration data, starts a local language model
for the clinical-assist features, and serves the app. There is no second
terminal and no manual migrate step.

**On first boot the model service downloads about 2 GB.** The application does
not wait for it: everything works immediately, and the two assist surfaces
report that assistance is unavailable until the download finishes. The model is
cached in a named volume, so this happens once. To skip it entirely, run with
`LLM_ENABLED=false docker compose up --build` — see *Clinical assist* below.

| Service  | URL                             |
| -------- | ------------------------------- |
| Web      | http://localhost:3000           |
| API      | http://localhost:4000/api       |
| Health   | http://localhost:4000/api/health |
| Postgres | `localhost:5433` (user/pass/db: `remedyo`) |
| Model    | internal to the compose network; no port published |

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

## Clinical assist

Two places in this product ask a human to write prose, and both are
summarisation of material the system already holds. Neither asks a model to
originate clinical judgement, which is what makes them the two defensible
places to put one in a medical product.

- **Note drafting (doctor).** After a consultation is completed, its clinician
  can draft the four note fields from that session's own transcript. The draft
  pre-fills the form; the doctor edits and signs it. Their save is the only
  thing that ever writes a note.
- **Plain-language summary (patient).** After a note is saved, a plain-language
  rendering of it is generated from the signed note and its prescriptions —
  never the transcript — and shown beside the note, never instead of it.

**This does not amend the standalone-runtime rule.** The model is a fourth
container in this repo's own `docker-compose.yml`, on the compose network, with
no port published. No product feature calls a hosted API, and no patient data
ever leaves the machine: generation is a request to `ollama:11434` inside the
compose network. `docker compose up --build` is still the whole setup story. A
self-hosted model is an open-source library with a process around it, not a
hosted service.

Two honest caveats about "no outbound call". The model image is downloaded from
the internet on first boot, as every Docker image is. And the upstream
`ollama/ollama` image periodically fetches its own model-recommendations list
from `ollama.com` — a vendor call this project neither makes nor needs, which
fails harmlessly with no network and carries nothing of ours. Neither touches a
consultation, a note, or a patient.

Deliberately out of scope: the model has no part in authorization, doctor
matching, emergency detection, or scheduling. Those stay deterministic — a
missed emergency flag is the one failure here that actually harms someone.
Prescriptions are never generated; the one permitted move is extracting values
a doctor's own message already states, verified server-side against that
message before they are offered.

| Variable         | Default              | Meaning                                    |
| ---------------- | -------------------- | ------------------------------------------ |
| `LLM_ENABLED`    | `true` in compose    | `false` removes both assist surfaces entirely |
| `LLM_BASE_URL`   | `http://ollama:11434` | Where the model server listens             |
| `LLM_MODEL`      | `llama3.2:3b`        | Model tag to pull and serve                |
| `LLM_TIMEOUT_MS` | `120000`             | Hard ceiling on one generation             |
| `LLM_MAX_TOKENS` | `800`                | Token cap on one generation                |

`LLM_ENABLED=false` is a first-class configuration, not a degraded one: the
application behaves exactly as it did before this feature, with the assist
surfaces absent rather than broken. It is what the test suite runs in, and the
right setting on a laptop that cannot spare the memory. Outside Docker, an
unset environment is also disabled, so nothing tries to reach a model that
isn't there.

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
- **The local model is good at prose, not at medicine.** `llama3.2:3b` is a 3B
  parameter model chosen so a reviewer's laptop can run it beside three other
  containers. It is adequate for restating what a transcript said in clinical
  register, or a note in plain words. It is not accurate enough to be trusted
  on clinical content, and nothing here checks whether its output is clinically
  correct — no automated check could, and claiming one would be dishonest. The
  safety argument is structural instead: a doctor reviews and signs every
  draft, the patient summary is generated from an already-approved note and
  displayed beside it, and every generated surface is labelled. A larger model
  (`LLM_MODEL=qwen2.5:7b-instruct`) summarises noticeably better if you have
  the memory for it.
- **`aiAssisted` is declared by the interface, not proven.** The note records
  whether the doctor started from a generated draft, but the client declares
  it: a doctor posting directly to the API could set either value. It is a
  provenance marker in a prototype where the doctor is the accountable author
  either way — not an integrity control.
- **A failed generation is simply absent.** There is no retry queue and no job
  infrastructure. If the model is down when a note is saved, the summary is
  regenerated on the next read of that record instead.

## Possible next steps

- WebRTC audio/video in the existing consultation room.
- Refresh tokens with a revocation list.
- Doctor-side patient search across their own caseload.
- Structured prescription templates and drug interaction warnings.
- Server-Sent Events to replace polling without the WebSocket lifecycle.

---

## Optional: deploying to Fly.io

Four first-party components — api, web, Fly Postgres, and the model — so no
SaaS or external feature API enters the runtime. Configs live at
`apps/api/fly.toml`, `apps/web/fly.toml` and `apps/ollama/fly.toml`; run
everything **from the repository root**, because the Dockerfiles copy the pnpm
workspace manifests.

Order matters: the web build bakes the API's public URL in at build time, so
the api must exist first.

```bash
# 1. API, with its database
fly apps create remedyo-api --org <org>
fly postgres create --name remedyo-db --region sin --org <org> \
  --initial-cluster-size 1 --vm-size shared-cpu-1x --volume-size 1
fly postgres attach remedyo-db --app remedyo-api          # sets DATABASE_URL
fly secrets set JWT_SECRET="$(openssl rand -hex 32)" --app remedyo-api
fly deploy . --config apps/api/fly.toml
fly scale count 1 --app remedyo-api    # see "one machine only" below

# 2. Web, pointed at the deployed API
fly apps create remedyo-web --org <org>
fly deploy . --config apps/web/fly.toml \
  --build-arg NEXT_PUBLIC_API_URL=https://remedyo-api.fly.dev

# 3. Close the CORS loop so the session cookie travels
fly secrets set WEB_ORIGIN="https://remedyo-web.fly.dev" --app remedyo-api

# 4. The model — private network only, with a volume for its cache
fly apps create remedyo-ollama --org <org>
fly ips allocate-v6 --private --app remedyo-ollama
fly volumes create remedyo_models --size 5 --region sin --app remedyo-ollama
fly deploy . --config apps/ollama/fly.toml

# 5. Point the api at it and turn generation on
fly secrets set LLM_ENABLED=true \
  LLM_BASE_URL="http://remedyo-ollama.flycast:11434" --app remedyo-api
```

**Steps 4 and 5 are optional.** `LLM_ENABLED=false` is the default in
`apps/api/fly.toml`, and a three-app deployment is a fully supported
configuration: everything works, the assist surfaces are simply absent.

**One machine only for the api.** `fly deploy` creates a second machine for
high availability unless told otherwise, and both run the migrate-and-seed
start command against the same database. The seed is idempotent so the race is
harmless in practice, but `fly scale count 1` removes it.

**The model app is private.** It is given only a private IPv6, so port 11434
listens on Fly's internal network and nowhere else — `fly ips list --app
remedyo-ollama` should show one `private ingress` row and no public address.
The api reaches it at `remedyo-ollama.flycast:11434`.

**Keep the model machine warm.** With `min_machines_running = 0` the first
request after an idle stop *fails* rather than waiting: Fly starts the machine,
but the api's connection is refused before the server is listening, so the
clinician sees "unavailable" and has to ask twice. The config holds one machine
running for that reason. Setting it back to 0 roughly halves the cost and the
feature still works — it just fails the first call after each idle period.

**What deployed generation actually measures.** On `performance-2x` (2 cores,
4 GB, CPU-only), note drafts came back in 14-96 seconds and patient summaries
in 20-40, against a 120s ceiling. Roughly one attempt in five is refused
because the model omitted a required field and the response failed structural
validation — the clinician is told assistance is unavailable rather than handed
a draft the form cannot save. That is the 3B model being small, not a fault in
the pipeline, and it is the honest reliability figure for this setup.

The api container applies migrations and runs the idempotent seed on start, so
the deployed app comes up populated exactly as it does locally.

---

## Tech stack

TypeScript throughout · Next.js 16 (App Router) · React 19 · Tailwind CSS 4 ·
NestJS 12 · Prisma 6 · PostgreSQL 18 · pnpm workspaces · Vitest · Docker Compose

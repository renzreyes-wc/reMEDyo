# Proposal

## Why

reMEDyo is a greenfield telehealth prototype built for the 10x Onboarding exercise: a visitor must be able to land on a public product site, register as a patient, find a suitable doctor, book a consultation, meet that doctor in a consultation workspace, and later read the notes and prescription that came out of it. The repository is currently empty apart from OpenSpec scaffolding, so everything below is new.

The build window is under four hours and the work is judged on functionality and scope, design and product sense, code quality, and how well it is explained — not on feature count. That pushes toward a complete, coherent core journey with an honest trust posture, and away from breadth for its own sake.

## What Changes

Everything is new. The system is a pnpm monorepo with a Next.js frontend, a NestJS REST API, and PostgreSQL via Prisma, running together under Docker Compose.

- **Monorepo and runtime** — `apps/web` (Next.js App Router), `apps/api` (NestJS), `packages/shared` (TypeScript types and enums used by both). Docker Compose brings up web, api, and postgres with seeded demo data.
- **Public product website** — responsive landing page explaining the service, routes to patient registration, doctor registration, and sign-in, plus application-served terms and privacy pages and a prominent fictional-prototype disclaimer.
- **Application-managed authentication** — email and password registration for patients and doctors, a pre-provisioned admin account with no public registration path, and role-based authorization enforced server-side on every protected route.
- **Patient experience** — profile with demographics and basic medical history, doctor browse and search, a guided symptom-to-specialty matcher, booking with reschedule and cancel, in-app notifications, the consultation workspace, and a medical records view.
- **Doctor experience** — professional profile and specialization, weekly availability management, an appointment queue, the same consultation workspace from the clinician side, and consultation notes and prescriptions written after a session.
- **Admin experience** — user account management with suspension reasons, doctor profile review and approval, appointment oversight with forced cancellation, a database-derived operational dashboard, and an append-only audit log of every administrative action.
- **Standalone runtime constraint** — authentication, matching, notifications, scheduling, the consultation session, and medical records are all implemented in-application. No SaaS, BaaS, or external runtime API is used for any product feature. Open-source libraries are permitted; hosted services are not.

Assumptions recorded here because they were decided rather than specified:

- **Next.js App Router** over React + Vite, so the landing page is server-rendered (faster first paint and a more credible public page) and one container serves the marketing site and all three role interfaces, matching the brief's container diagram.
- **No bonus features are planned in this change.** The brief prefers a smaller, polished solution over an ambitious unfinished one. Bonus work, if time allows, becomes a separate follow-up change rather than scope creep inside this one.
- **Consultation sessions carry no audio or video.** The brief marks streaming as not required; the workspace is a first-party, state-tracked room with appointment context and a text channel, which keeps the runtime standalone.
- **Prescriptions are fictional and non-dispensable**, labelled as such in the UI, since this is a prototype and a realistic-looking prescription is a safety hazard.

## Capabilities

### New Capabilities

- `product-website`: Public, unauthenticated marketing surface — value proposition, how-it-works, calls to action into registration and sign-in, prototype disclaimer, and application-managed terms and privacy pages.
- `identity-access`: Registration, sign-in, session handling, role assignment across patient/doctor/admin, pre-provisioned administrator access, account lifecycle states, and role-based authorization enforced in the API.
- `patient-profile`: Patient demographic and contact details, physical measurements, basic medical history, and generated-initials avatars.
- `doctor-directory`: Doctor professional profiles, specializations, biography, credential fields, approval lifecycle, and patient-facing browse and search.
- `doctor-matching`: Deterministic symptom-and-concern to specialty matching with ranked, explainable doctor suggestions computed in the API.
- `scheduling`: Doctor availability definition, derived bookable slots, and patient booking, rescheduling, and cancellation with conflict and validity rules enforced server-side.
- `consultation-session`: The first-party consultation workspace, its lifecycle states, who may join when, and how a session is completed.
- `medical-records`: Consultation notes, prescriptions, appointment history, and the role-based access rules governing who may read or write each record.
- `notifications`: Database-backed in-app notifications for booking, rescheduling, cancellation, and upcoming appointments, with read state.
- `admin-console`: Administrative user management, doctor profile review, appointment oversight, operational dashboard counts, and the audit log of administrative actions.

### Modified Capabilities

None. The project has no existing specs.

## Impact

- **New code** — the entire repository: `apps/web`, `apps/api`, `packages/shared`, `prisma/schema.prisma`, seed script, Dockerfiles, `docker-compose.yml`, `pnpm-workspace.yaml`.
- **APIs** — a new REST surface under `/api` covering auth, profiles, doctors, availability, appointments, consultations, records, notifications, and admin. JSON over HTTP, JWT in an httpOnly cookie.
- **Data** — a new PostgreSQL schema owned by Prisma, with a seed that produces demo patients, approved doctors across several specialties, availability, and an admin account so the demo has something to show on first boot.
- **Deployment** — local Docker Compose is the required target. Git hosting on GitHub. Optional bonus deployment to Fly.io as three first-party components (web, api, Postgres), which introduces no SaaS feature dependency and so stays inside the standalone-runtime rule.
- **Out of scope** — real video conferencing, real prescription dispensing, payments, insurance, email/SMS delivery, and any external identity provider.

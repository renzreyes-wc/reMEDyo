# Tasks

Ordered so the patient spine — register, discover, book, consult, read notes — is demonstrable end to end before doctor tooling, and admin last. If the clock runs out, what is missing is breadth at the edges rather than a hole in the middle. Rough budget in each group heading; treat it as a pacing signal, not a contract.

## 1. Foundation (~30 min)

- [x] 1.1 Initialise the pnpm workspace at the repo root with `pnpm-workspace.yaml` covering `apps/*` and `packages/*`; verify `pnpm install` completes and `pnpm -r list` shows all three workspaces
- [x] 1.2 Scaffold `apps/web` as a Next.js App Router project with TypeScript and Tailwind, without `src/`; verify `pnpm --filter web dev` serves the default page at `app/page.tsx`
- [x] 1.3 Scaffold `apps/api` as a NestJS project with TypeScript; verify `pnpm --filter api start:dev` boots and a `GET /api/health` returns 200
- [x] 1.4 Create `packages/shared` exporting role, appointment-state, session-state, account-status, and specialization enums plus shared DTO types; verify both apps import a shared enum and typecheck
- [ ] 1.5 Add `docker-compose.yml` with a `postgres` service including a healthcheck, and confirm `docker compose up postgres` reaches healthy and accepts a `psql` connection
- [x] 1.6 Wire Prisma into `apps/api` with the Compose database URL; verify `pnpm --filter api prisma db push` connects and succeeds against the running container

## 2. Data model and seed (~30 min)

- [x] 2.1 Define the Prisma schema for `User`, `PatientProfile`, `DoctorProfile`, `MedicalHistoryEntry`, `AvailabilityWindow`, and `AvailabilityException` per design.md — Data model; verify `prisma validate` passes and `prisma migrate dev` generates a migration
- [x] 2.2 Define `Appointment`, `ConsultationSession`, `Message`, `ConsultationNote`, and `Prescription`, with notes and prescriptions referencing the appointment rather than the patient; verify the migration applies cleanly
- [x] 2.3 Define `Notification`, `AuditLog`, and `SymptomRule`; verify the migration applies and all fourteen tables are present
- [x] 2.4 Add the unique index on `(doctorId, startsAt)` filtered to active appointments; verify by attempting two direct inserts of the same doctor and start time and observing the second rejected by the constraint
- [x] 2.5 Write an idempotent seed producing one admin, roughly eight approved doctors across specializations with weekly availability, one pending doctor, two to three patients with medical history, symptom rules, and a spread of appointments (upcoming, imminent, and completed with notes and a prescription); verify running the seed twice leaves row counts unchanged

## 3. Authentication and authorization (~30 min)

- [x] 3.1 Implement the `auth` Nest module with argon2 password hashing, patient and doctor registration, and sign-in issuing a JWT in an httpOnly SameSite=Lax cookie; verify registering then signing in via curl sets the cookie and that no response body contains a password hash
- [x] 3.2 Implement `JwtAuthGuard` re-reading account status on each request, and `RolesGuard` for coarse role checks; verify a request with no cookie returns 401, a patient hitting a doctor-only route returns 403, and a suspended user's existing token is rejected
- [x] 3.3 Add `GET /api/auth/me` returning the current user with role and profile-completion state; verify it returns the signed-in user and 401 when unauthenticated
- [x] 3.4 Reject any registration request that specifies the admin role, creating a non-admin account or erroring; verify by posting a registration with `role: admin` and confirming no admin account is created
- [x] 3.5 Build the web API client in `apps/web/lib` sending credentials with every request and redirecting to sign-in on 401; verify an authenticated page load reaches the API and an expired session bounces to sign-in

## 4. Product website (~25 min)

- [x] 4.1 Build the `(marketing)` landing page with value proposition, how-it-works sequence, and core capabilities, server-rendered; verify it loads with no session and renders without an authentication redirect
- [x] 4.2 Add header and primary calls to action routing to patient registration, doctor registration, and sign-in; verify each control navigates to the correct form
- [x] 4.3 Add the fictional-prototype disclaimer and privacy and safety messaging including emergency guidance, visible without interaction; verify the disclaimer is present in the served HTML above the fold
- [x] 4.4 Add application-served terms and privacy pages linked from the footer; verify both routes render content from the application
- [x] 4.5 Confirm all landing assets, icons, and fonts are served by the application; verify by loading the page with devtools and observing no request to an external host
- [x] 4.6 Build the sign-in, patient registration, and doctor registration forms with inline validation errors; verify each success path establishes a session and routes to the correct dashboard

## 5. Patient profile and doctor directory (~30 min)

- [x] 5.1 Implement the `users` module endpoints for reading and updating the patient profile and medical history entries; verify a patient can update weight and add an allergy and that both persist
- [x] 5.2 Build the patient profile page with demographics, measurements, and medical history editing, plus derived age display; verify the shown age equals completed years from the recorded date of birth
- [x] 5.3 Implement the initials avatar component with a neutral placeholder for unnamed users; verify "Maria Santos" renders "MS" and that no external request is made
- [x] 5.4 Implement the `doctors` module listing approved doctors only, with free-text search across name and specialization, a specialization filter, and an availability-within-seven-days filter combining conjunctively; verify an unapproved doctor never appears and that combined filters narrow correctly
- [x] 5.5 Build the patient-facing directory page with cards, filters, and an empty state; verify filtering to a combination matching nobody shows the empty state rather than an error
- [x] 5.6 Build the doctor detail page showing full profile and next available slots with a route into booking, returning not-found for unapproved doctors; verify requesting an unapproved doctor's detail route discloses no profile content

## 6. Scheduling — the booking spine (~45 min)

- [x] 6.1 Implement the `availability` module for creating, editing, and removing weekly windows and date exceptions, rejecting inverted and overlapping windows; verify an end-before-start window and an overlapping window are both rejected with validation errors
- [x] 6.2 Implement slot derivation expanding windows over a date range and subtracting exceptions, past times, and slots held by active appointments; verify a 09:00–10:00 window at 30-minute duration yields exactly the 09:00 and 09:30 slots and that a booked slot disappears
- [x] 6.3 Implement `appointments` booking inside a transaction relying on the unique index, returning 409 on constraint violation; verify two concurrent bookings of the same slot produce exactly one appointment and one 409
- [x] 6.4 Enforce the remaining booking rules — complete required patient profile, approved doctor, future start time, and no overlap with the patient's other appointments; verify each rejection path independently
- [x] 6.5 Implement reschedule as an atomic release-and-rehold in one transaction, rejected for completed or cancelled appointments; verify a reschedule into a taken slot leaves the original appointment intact at its original time
- [x] 6.6 Implement cancellation by either party before start, recording who cancelled and an optional reason, releasing the slot, and rejecting cancellation of completed appointments; verify the slot is offered again afterwards
- [x] 6.7 Scope appointment queries so a patient sees only their own and a doctor only theirs, with upcoming and past separated; verify a cross-account appointment request returns 403 or 404
- [x] 6.8 Build the patient booking flow — slot picker, reason for visit, confirmation — and the patient appointments page with reschedule and cancel; verify a patient can book, reschedule, and cancel end to end in the browser
- [x] 6.9 Add a thin band of unit tests over slot derivation and the booking conflict rules, the only genuinely tricky logic in the system; verify `pnpm --filter api test` passes

## 7. Consultation session (~30 min)

- [x] 7.1 Implement the `consultations` module with the `scheduled → joined → in_progress → completed` state machine, forward-only transitions, and doctor-only completion; verify a patient completion attempt and a backward transition are both rejected
- [x] 7.2 Enforce the join window and refuse joining a cancelled appointment's session; verify joining too early is refused with the joinable time shown and that a cancelled appointment cannot be joined
- [x] 7.3 Implement the appointment-scoped message channel, rejecting messages once the session is completed; verify messages persist with sender and timestamp and remain readable after completion
- [x] 7.4 Build the consultation workspace showing appointment context, counterpart identity, session state, and the text channel, polling for state and new messages; verify both participants see state advance to in-progress
- [x] 7.5 Show the doctor additional clinical context — patient age, allergies, medications, conditions — in the workspace, and deny workspace access to unrelated users; verify an unrelated user gets 403 or 404 with no appointment content disclosed

## 8. Doctor tooling and medical records (~35 min)

- [x] 8.1 Build the doctor profile page for name, specializations from the defined list, biography, experience, licence, and fee, rejecting specializations outside the list; verify an off-list specialization is rejected
- [x] 8.2 Build the doctor schedule management page over the availability module, including marking a date unavailable; verify a window added in the UI produces bookable slots visible to a patient
- [x] 8.3 Build the doctor dashboard with the appointment queue ordered by start time and a route into each consultation workspace; verify only that doctor's appointments are listed
- [x] 8.4 Implement the `records` module for consultation notes — findings, diagnosis, recommendations, optional follow-up — restricted to the appointment's doctor and to completed appointments, with revision preserving last-updated; verify notes on a scheduled appointment and by a different doctor are both rejected
- [x] 8.5 Implement prescriptions requiring medication and dosage, attached to a completed appointment; verify an incomplete prescription is rejected and stores nothing
- [x] 8.6 Enforce record access — patients read their own and cannot alter notes; doctors read only patients with whom they hold an appointment; nothing is hard-deletable; verify an unrelated doctor's read returns 403 or 404 and a delete attempt is refused
- [x] 8.7 Build the doctor post-consultation form for notes and prescriptions, and the patient medical records view with history, notes, and prescriptions carrying the fictional non-dispensable label; verify the patient sees the notes the doctor just recorded and that an empty history shows an empty state

## 9. Notifications (~20 min)

- [x] 9.1 Implement the `notifications` module writing rows inside the transaction of the causing event, scoped so a user reads only their own; verify a rolled-back booking leaves no notification
- [x] 9.2 Emit notifications on booking, reschedule, cancellation by either party or an admin, doctor approval or rejection, account status change, and records becoming available; verify each trigger produces a notification for the correct recipient
- [x] 9.3 Compute upcoming-appointment reminders on read from the imminent window with no scheduler, excluding cancelled appointments; verify an imminent appointment reminds both parties and stops once cancelled
- [x] 9.4 Build the notification surface with unread count, mark-one-read, and mark-all-read; verify the count decreases by one on a single read and reaches zero on mark-all while history remains listed

## 10. Admin console (~35 min)

- [x] 10.1 Implement the `admin` module guarded to the admin role, with account listing and search by name, email, and role; verify a patient or doctor hitting any admin endpoint gets 403
- [x] 10.2 Implement activate, suspend, and deactivate with a mandatory reason on suspend and deactivate; verify a reasonless suspension is rejected and a suspended user can no longer sign in
- [x] 10.3 Implement the doctor review queue with approve, reject-with-reason, and specialization correction taking immediate effect on patient-facing listings; verify an approved doctor becomes bookable and a rejected one stays unlisted with the reason visible to them
- [x] 10.4 Implement appointment oversight across all users with state and date-range filters and administrative cancellation with a reason, rejecting cancellation of completed appointments; verify an admin cancellation releases the slot and notifies both parties
- [x] 10.5 Implement the operational dashboard counts derived from the database — patients, doctors, pending reviews, appointments by state, completed consultations; verify a cancellation shifts the scheduled and cancelled counts by one each and that an empty system shows zeros
- [x] 10.6 Implement the insert-only audit log capturing actor, action, affected record, timestamp, and reason, with filtering by actor and action type and no edit or delete path; verify a suspension produces a correct entry and that merely viewing the dashboard produces none
- [x] 10.7 Build the admin console pages for users, doctor review, appointments, dashboard, and audit log; verify each page loads against seeded data with the pending doctor visible in the review queue

## 11. Deliverables (~30 min)

- [ ] 11.1 Add Dockerfiles for `apps/web` and `apps/api` and complete `docker-compose.yml` so the api waits on the postgres healthcheck and runs `prisma migrate deploy` plus the seed before accepting traffic; verify `docker compose up --build` on a clean volume reaches a populated working app with no manual steps
- [x] 11.2 Write the root `README.md` with prerequisites, the single-command local setup, seeded demo credentials for each role, and the API surface overview; verify a reader following it from a clean clone reaches a running app
- [x] 11.3 Add error handling and input validation consistently across the API — a global exception filter and DTO validation — so failures return structured JSON rather than stack traces; verify a malformed booking request returns a structured validation error
- [ ] 11.4 Initialise the git repository, commit, and push to GitHub; verify the remote contains the full working tree
- [ ] 11.5 Walk the complete core journey on the Compose stack from a clean volume — register a patient, complete the profile, use guided matching, book, both parties join the consultation, doctor completes and records notes plus a prescription, patient reads them — and verify every step works before recording anything
- [x] 11.6 Prepare the presentation deck covering product overview, key features, and value proposition; verify it covers all three
- [ ] 11.7 Record the demonstration video under fifteen minutes covering the walkthrough, the architecture, and the named limitations — polling over WebSockets, no token revocation, no real audio or video, fictional prescriptions; verify the recording is under the limit and names each limitation

## 12. Guided matching (~20 min, after the spine works)

- [x] 12.1 Implement the `matching` module scoring approved doctors from seeded `(symptom, specialization, weight)` rules, ranked by score then availability within seven days then experience, with ties broken by doctor id; verify the same intake submitted twice returns identical ordering
- [x] 12.2 Implement keyword matching of free text against the symptom catalogue and the general-practice fallback labelled as a general recommendation; verify unmatched free text falls back and that a matched specialty with no approved doctors also falls back with an explanation
- [x] 12.3 Return a plain-language reason with each suggestion naming the matched specialization and the submitted concerns; verify every returned suggestion carries one
- [x] 12.4 Build the guided intake UI with symptom selection, optional free text, duration and severity, declining to suggest when nothing is submitted; verify an empty submission prompts for at least one concern
- [x] 12.5 Display the non-diagnostic notice with every result set and prominent emergency guidance above suggestions when an emergency-indicator symptom is submitted; verify both appear under the right conditions

## 13. Optional bonus deployment (only if time remains)

- [ ] 13.1 Deploy api, web, and Postgres to Fly.io as three first-party components introducing no SaaS feature dependency; verify the deployed core journey works and that no external feature API is called at runtime

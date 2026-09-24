---
title: Constraints
description: The invariants the schema enforces — uniques, cascades, one-to-one relations, and two partial indexes that arbitrate the booking race.
---

# Constraints

Every constraint below is taken from `apps/api/prisma/schema.prisma` or from the
migrations, not from memory. Where a constraint exists for a reason that is not
obvious, the reason is given.

## Unique constraints

These are the invariants a client cannot violate, enforced by the database
rather than by application code.

| Table | Constraint | What it guarantees |
| --- | --- | --- |
| `User` | `email` unique | One account per email address. Registration turns the resulting violation into a 409. |
| `PatientProfile` | `userId` unique | A user has at most one patient profile. |
| `DoctorProfile` | `userId` unique | A user has at most one doctor profile. |
| `ConsultationSession` | `appointmentId` unique | One session per appointment. |
| `ConsultationNote` | `appointmentId` unique | **At most one note per appointment** — the note is revised, never duplicated. |
| `ConsultationNoteDraft` | `appointmentId` unique | One live draft per appointment, overwritten on regeneration. |
| `ConsultationNoteSummary` | `appointmentId` unique | One summary per appointment, replaced when the note is revised. |
| `AvailabilityException` | `(doctorId, date)` unique | A doctor cannot block the same date twice. |
| `SymptomRule` | `(symptomId, specialization)` unique | A symptom maps to a given specialty at most once, so weights cannot be double-counted. |

## Two partial unique indexes, added by migration

These are **not** in `schema.prisma`, because Prisma cannot express a filtered
unique index. They are created by
`migrations/20260921160000_active_appointment_slot_unique/`.

```sql
CREATE UNIQUE INDEX "Appointment_active_slot_key"
  ON "Appointment" ("doctorId", "startsAt") WHERE "state" = 'SCHEDULED';

CREATE UNIQUE INDEX "Appointment_patient_active_slot_key"
  ON "Appointment" ("patientId", "startsAt") WHERE "state" = 'SCHEDULED';
```

**What they guarantee.** Two patients cannot hold the same doctor at the same
instant, and one patient cannot hold two appointments starting at the same
instant with any doctor.

**Why they live in the database.** The scheduling rules require that two
simultaneous bookings of one slot produce exactly one appointment. A
check-then-insert in the service loses that race: both requests read "free",
both insert. The index makes the database the referee — both transactions insert,
one commits, and the other takes a unique violation that the API translates into
`409 Conflict`.

**Why the `WHERE` clause matters.** An unfiltered unique index would burn a slot
permanently. A cancelled 09:00 would keep reserving 09:00 forever, and the
earliest, most desirable slots would become unbookable after the first
cancellation. Restricting the index to `SCHEDULED` rows means cancelled and
completed appointments stop reserving their slot.

A consequence worth knowing: the appointment lifecycle distinguishes
`COMPLETED` from `CANCELLED` in storage, but both release the slot.

## Cascades

Twelve relations cascade. They fall into three families.

**A user's own rows.** Deleting a `User` removes their `PatientProfile` or
`DoctorProfile`, and their `Notification`s. Note what is *not* in this list:
the messages they sent, which hang off the appointment rather than the author —
see the next section.

**A profile's own rows.** Deleting a `PatientProfile` removes its
`MedicalHistoryEntry` rows; deleting a `DoctorProfile` removes its
`AvailabilityWindow`s and `AvailabilityException`s.

**An appointment's own rows.** Deleting an `Appointment` removes its
`ConsultationSession`, `Message`s, `ConsultationNote`, `ConsultationNoteDraft`,
`ConsultationNoteSummary` and `Prescription`s.

In practice none of this fires: the API has no delete route for any of these
tables. The cascade declarations describe ownership — what belongs to what —
rather than a path anyone can take.

## Four relations deliberately do *not* cascade

| Relation | Why not |
| --- | --- |
| `Appointment.patient` → `PatientProfile` | An appointment is history. Removing the patient must not silently remove the consultations that happened. |
| `Appointment.doctor` → `DoctorProfile` | Same reason, from the doctor's side. |
| `Message.sender` → `User` | A transcript is evidence of what was said. Its author reference must remain resolvable. |
| `AuditLog.actor` → `User` | The audit log is insert-only and answers "who did this". An entry whose actor could vanish would be worthless. |

These four are what make "nothing is hard-deleted" a property of the schema
rather than a habit: deleting a user who has appointments, messages or audit
entries is *refused by the database*. An administrator deactivates an account
instead, which is why `AccountStatus` has three values rather than a boolean.

## One-to-one relations

Six relations are one-to-one, expressed as a unique foreign key. They are all
"at most one of these per parent", and each is load-bearing:

- `User` → `PatientProfile`, `User` → `DoctorProfile` — the two role-specific
  profiles.
- `Appointment` → `ConsultationSession` — one session per appointment.
- `Appointment` → `ConsultationNote` — one note per appointment.
- `Appointment` → `ConsultationNoteDraft` — one live draft, overwritten.
- `Appointment` → `ConsultationNoteSummary` — one summary, replaced on revision.

The last three are separate tables rather than one polymorphic "document" table
on purpose. Keeping the draft and the summary out of `ConsultationNote` is what
makes "no generated text reaches the medical record without a clinician's save"
structural: exactly one route writes `ConsultationNote`, and no model writes to
it.

## Indexes

Fourteen non-unique indexes support the queries the API actually runs. The
notable ones:

| Index | Serves |
| --- | --- |
| `User(role, status)` | Administrator account listing, filtered by role and status. |
| `DoctorProfile(approvalState)` | The approval queue and the directory's approved-only filter. |
| `Appointment(doctorId, startsAt)`, `Appointment(patientId, startsAt)` | Slot derivation and the "my appointments" lists. |
| `Appointment(state, startsAt)` | Filtering to scheduled appointments. |
| `Message(appointmentId, sentAt)` | Reading a consultation thread in order. |
| `Notification(userId, readAt)`, `Notification(userId, createdAt)` | The unread count and the notification list. |
| `AuditLog(actorId, createdAt)`, `AuditLog(action, createdAt)` | Reading the log by actor or by action. |
| `MedicalHistoryEntry(patientId, kind)` | Grouping a patient's history by kind. |
| `AvailabilityWindow(doctorId, dayOfWeek)` | Deriving slots for one doctor. |
| `SymptomRule(symptomId)` | Loading the matching rules. |

## What the schema does not constrain

Worth stating, because a reader may expect otherwise.

**No constraint stops overlapping availability windows.** A doctor can declare
two weekly windows that overlap, and the slot derivation is what has to cope.
The database has no exclusion constraint over time ranges.

**No constraint ties a note to the doctor who wrote it.** `ConsultationNote`
records no author column; authorship is implied by the appointment's
participants, and the rule "only a participating doctor may write the note" is
enforced in the service layer. The schema stores no second opinion that could
disagree.

**No constraint makes `updatedAt` drive the summary's validity.** The staleness
rule compares `ConsultationNoteSummary.noteUpdatedAt` with the note's current
`updatedAt` at read time. It is a comparison, not a foreign key, so nothing in
the database prevents a stale summary row from existing — it is simply not
served.

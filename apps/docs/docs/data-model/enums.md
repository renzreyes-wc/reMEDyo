---
title: Enumerations
description: The ten persisted enumerations and what each value means.
---

# Enumerations

Ten enumerations are persisted, alongside the sixteen
[entities](/data-model/). Each is defined in `apps/api/prisma/schema.prisma`
and mirrored in `packages/shared/src/enums.ts`, which is what the web app is
allowed to know about them.

Every value below is reproduced from the schema. The meanings are the ones the
code enforces, not expansions of the names.

## `Role`

Which kind of account this is. Assigned at registration, never changed
afterwards.

| Value | Meaning |
| --- | --- |
| `PATIENT` | Books and attends consultations; reads their own record. |
| `DOCTOR` | Applies for approval; runs consultations; writes notes and prescriptions. |
| `ADMIN` | Pre-provisioned. Reviews doctors, moderates accounts, reads the audit log. |

## `AccountStatus`

Whether the account may be used at all. Checked by the authentication guard on
every request, which is why suspending an account takes effect immediately
rather than when its token expires.

| Value | Meaning |
| --- | --- |
| `ACTIVE` | The account works normally. |
| `SUSPENDED` | Sign-in refused with a message naming the administrator. Reversible. |
| `DEACTIVATED` | Sign-in refused. The terminal state of the three. |

## `ApprovalState`

A doctor's standing in the directory. Patients and administrators do not have
one.

| Value | Meaning |
| --- | --- |
| `PENDING` | Registered, awaiting review. Not listed, not bookable. |
| `APPROVED` | Listed publicly and bookable. |
| `REJECTED` | Not listed. `rejectionReason` tells the doctor why. |

## `AppointmentState`

The stored lifecycle of an appointment.

| Value | Meaning |
| --- | --- |
| `SCHEDULED` | Booked and upcoming, or in progress. |
| `COMPLETED` | The consultation finished. |
| `CANCELLED` | Cancelled by a participant or an administrator. |

`MISSED` is deliberately absent. An appointment whose join window closed without
completion is **derived at read time**, not written — nothing has to sweep the
table on a schedule, and there is no stored flag that can disagree with the
clock.

## `SessionState`

The consultation's own lifecycle, tracked on `ConsultationSession` separately
from the appointment's state.

| Value | Meaning |
| --- | --- |
| `SCHEDULED` | The window is not open yet. |
| `JOINED` | One participant has arrived. |
| `IN_PROGRESS` | Both have arrived. |
| `COMPLETED` | The doctor completed it. |

## `CancelledBy`

Who cancelled. Recorded with the reason so the other party can be told.

| Value | Meaning |
| --- | --- |
| `PATIENT` | The patient cancelled. |
| `DOCTOR` | The doctor cancelled. |
| `ADMIN` | An administrator intervened. |

## `Specialization`

The application-defined list of specialties. A doctor chooses from it rather
than naming their own, and an administrator can correct it after approval; there
is no route that lets a doctor invent a value.

| Value | Display label |
| --- | --- |
| `GENERAL_PRACTICE` | General Practice |
| `CARDIOLOGY` | Cardiology |
| `DERMATOLOGY` | Dermatology |
| `PEDIATRICS` | Pediatrics |
| `PSYCHIATRY` | Psychiatry |
| `ORTHOPEDICS` | Orthopedics |
| `NEUROLOGY` | Neurology |
| `GASTROENTEROLOGY` | Gastroenterology |
| `OBSTETRICS_GYNECOLOGY` | Obstetrics & Gynecology |
| `ENDOCRINOLOGY` | Endocrinology |
| `OPHTHALMOLOGY` | Ophthalmology |
| `PULMONOLOGY` | Pulmonology |
| `ENT` | Ear, Nose & Throat |

This is also the enumeration the matching rules score against: a
`SymptomRule` maps a symptom to one of these values with a weight.

## `MedicalHistoryKind`

What kind of self-reported history entry this is. The four kinds are what the
consultation workspace groups the patient's context into.

| Value | Meaning |
| --- | --- |
| `ALLERGY` | Something the patient reacts to. |
| `MEDICATION` | Something the patient currently takes. |
| `CONDITION` | An ongoing diagnosis. |
| `NOTE` | Anything else the patient wants a doctor to know. |

## `NotificationType`

What a notification is about. Notifications are stored rows, not computed
messages, so this enumeration describes the events the system actually raises.

| Value | Meaning |
| --- | --- |
| `APPOINTMENT_BOOKED` | A new booking, to the other party. |
| `APPOINTMENT_RESCHEDULED` | An appointment moved. |
| `APPOINTMENT_CANCELLED` | An appointment cancelled, either side. |
| `APPOINTMENT_REMINDER` | An upcoming appointment. |
| `RECORDS_AVAILABLE` | A note and its prescriptions are readable. |
| `DOCTOR_APPROVED` | An application was approved. |
| `DOCTOR_REJECTED` | An application was rejected, with the reason. |
| `ACCOUNT_STATUS_CHANGED` | An administrator changed the account's status. |

## `AuditAction`

The administrator and generation actions the audit log records. See
[admin](/modules/admin) for which operations write one and which deliberately do
not.

| Value | Meaning |
| --- | --- |
| `ACCOUNT_ACTIVATED` | An account was activated. |
| `ACCOUNT_SUSPENDED` | An account was suspended, with a reason. |
| `ACCOUNT_DEACTIVATED` | An account was deactivated, with a reason. |
| `DOCTOR_APPROVED` | A doctor application was approved. |
| `DOCTOR_REJECTED` | A doctor application was rejected, with a reason. |
| `DOCTOR_SPECIALIZATION_UPDATED` | An administrator corrected a doctor's specialties. |
| `APPOINTMENT_CANCELLED` | An administrator cancelled an appointment. |
| `NOTE_DRAFT_GENERATED` | A note draft was generated by the model. |
| `RECORD_SUMMARY_GENERATED` | A record summary was generated by the model. |

## One enumeration is not persisted

`Severity` — `MILD`, `MODERATE`, `SEVERE` — exists in
`packages/shared/src/enums.ts` and has no Prisma counterpart. It is an **input**
to matching, carried on the intake request, and it is not stored: the match
result is returned to the caller rather than kept. It is listed here so that a
reader who finds it in the shared enums file knows why the schema does not have
it.

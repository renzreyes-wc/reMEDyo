---
title: Context
description: The problem reMEDyo addresses, who uses it, and its boundaries.
---

# Context

## The problem

Outpatient care begins before a clinician is involved. A patient with a symptom
they cannot place has to answer two questions before they can do anything else:
*who should I see*, and *when can I see them*. Answering the first requires
knowing how specializations map onto symptoms, which is exactly the knowledge
the patient does not have. Answering the second requires knowing a specific
doctor's schedule, which they cannot see until they have already chosen one.

Most of the friction is in that gap. A patient picks a specialty by guessing,
books whoever is available soonest, and often discovers at the appointment that
they needed someone else.

## What the product does about it

reMEDyo puts a described symptom in front of a rule-based matching step that
returns a short list of doctors, each with a stated reason for being on it. The
patient picks from that list, and the availability of the doctor they picked is
already visible. From there the appointment is booked, the consultation happens
in the browser, and the record is written.

The two halves reinforce each other: matching is only useful if booking is easy,
and booking is only efficient if the patient arrives at the right doctor.

## Who uses it

Three roles, established at registration and enforced throughout.

**Patients** register themselves, describe their symptoms, receive a ranked list
of doctors, book and reschedule appointments, attend the consultation, and
afterwards read their own medical record — notes, prescriptions and all. They
also maintain the profile a doctor reads before the consultation: contact
details, physical measurements, and the medical history they choose to share.

**Doctors** register themselves but cannot work until an administrator approves
them. They declare recurring availability and dated exceptions, which the
system converts into bookable slots; they run the consultations, write the
clinical notes, and issue prescriptions. A doctor writes the record for their
own consultations and can read the records of patients they have treated.

**Administrators** are pre-provisioned rather than self-registered. They review
doctor applications, suspend or deactivate accounts, cancel appointments when
something has gone wrong, and read the audit log. Every administrator action
that changes something is recorded; looking at a page is not.

## Boundaries

The system is deliberately bounded, and the boundaries are as informative as the
features.

- **It is a prototype with fictional data.** There is no real patient
  information anywhere in it, and it is not a clinical service.
- **Consultations are text, not video.** A consultation is a first-party
  workspace: a thread between the two participants, the clinical context the
  doctor needs, and a session lifecycle. There is no video or audio component.
- **Notifications are in-application.** Bookings, reschedules, cancellations,
  reminders and available records all arrive as messages stored in the database
  and shown in the app. Nothing is sent by email, SMS or push.
- **Matching is deterministic and local.** It is rule-based and computed inside
  the application from a fixed catalogue of symptoms and specializations. It is
  not a machine-learning system, and the same intake always produces the same
  result.
- **Clinical assistance is optional and self-hosted.** The model that drafts
  notes and summarises records runs in the same deployment; there is no call to
  an external model provider. It is disabled by default, and the product works
  without it.
- **There is no payment.** Consultation fees are shown on a doctor's profile as
  information. Nothing is charged, and no payment details are collected.

## What a technical reader should know about the shape

The system is a pnpm monorepo:

- `apps/web` — a Next.js application serving every browser-facing route, for
  patients, doctors, administrators and the public pages alike.
- `apps/api` — a NestJS application serving the entire HTTP interface, in
  twelve modules.
- `apps/docs` — this site.
- `packages/shared` — the types and enumerations both applications agree on,
  including the response shapes the API returns.

Data lives in PostgreSQL, accessed through Prisma. The clinical-assist model
runtime is a separate deployment of its own — `apps/ollama` holds only its
image and hosting configuration — and is reachable from the API over a private
network rather than from the internet. Both deployment shapes are described in
[Deployment](/architecture/deployment).

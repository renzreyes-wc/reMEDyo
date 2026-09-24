---
title: Features
description: What reMEDyo does, capability by capability.
---

# Features

The product is specified as twelve capabilities. Each is a coherent area of
behaviour with its own rules, and each maps onto API modules and browser routes.
This page summarises all twelve; the [detailed architecture](/modules/) covers
the code behind them.

| Capability | What it governs |
| --- | --- |
| [`product-website`](#product-website) | The public, unauthenticated pages |
| [`identity-access`](#identity-access) | Who a user is, and what they may do |
| [`patient-profile`](#patient-profile) | The patient's personal and clinical context |
| [`doctor-directory`](#doctor-directory) | Doctors, specializations and approval |
| [`scheduling`](#scheduling) | Availability, slots, booking, rescheduling, cancellation |
| [`consultation-session`](#consultation-session) | The consultation itself |
| [`medical-records`](#medical-records) | Notes, prescriptions and the patient's history |
| [`clinical-assist`](#clinical-assist) | Model-generated content, and its limits |
| [`doctor-matching`](#doctor-matching) | Turning a described symptom into a short list |
| [`notifications`](#notifications) | In-application messages about what changed |
| [`admin-console`](#admin-console) | Oversight: accounts, approvals, interventions, audit |
| [`visual-system`](#visual-system) | The presentation contract for every screen |

## product-website

The public face of the system: the pages reachable without signing in. They
explain what the service does, set out the privacy and terms positions, and
route a visitor into the right registration or sign-in path — a patient
registering themselves, a doctor applying to join, or an existing account
signing in. They also state the prototype's status plainly, so no visitor
mistakes it for a live clinical service.

## identity-access

Establishes who a user is and what they are allowed to do. Patients and doctors
register themselves; administrators are pre-provisioned and cannot self-register.
Sessions are carried in an `httpOnly` cookie holding a short-lived JWT, and the
account behind it is re-read on every request — so suspending an account takes
effect on that account's next request rather than when its token happens to
expire. Every account has a lifecycle state (active, suspended, deactivated)
that is checked before any route runs.

Authorization is deny-by-default. Authentication is applied globally to every
route, and a route opts *out* explicitly; role restrictions are declared per
route or per controller. A newly added endpoint is therefore protected unless
its author says otherwise, which is the safer direction for a health product.

## patient-profile

Holds the context a doctor needs before a consultation: who the patient is, how
to reach them, their physical measurements, and the medical history they choose
to share. History entries are typed — allergies, current medications, chronic
conditions, and free notes — and the doctor reads them beside the consultation
thread. Age is derived from the date of birth rather than stored, so it cannot
go stale.

## doctor-directory

The catalogue of clinicians a patient can consult: each doctor's professional
identity, their specializations, and their biography. It also carries the
approval lifecycle. A doctor who has registered but not been approved is absent
from the public directory and cannot be booked; they can see their own profile,
and an administrator can see them in the review queue. Specializations come from
an application-defined list — a doctor chooses from it rather than inventing
one, and an administrator can correct it after approval.

## scheduling

Governs when consultations can happen. A doctor declares recurring weekly
windows plus dated exceptions, and the system derives concrete bookable slots
from them. Slots are never stored: they are computed on read, so changing a
window changes what is offered immediately, and there is no table to reconcile.

Booking rules exist to prevent two patients holding the same slot and to keep
appointments in a consistent state. A patient books a specific offered slot,
reschedules to another offered slot, and either participant may cancel — but
only before the consultation has started. An appointment that reaches its join
window without being held is reported as missed rather than written to the
database as a state, so nothing has to run on a schedule to keep the data
honest.

## consultation-session

The room where the consultation actually happens: a first-party workspace tied
to one appointment, with a message thread between the two participants and the
clinical context the doctor needs — age, allergies, current medications,
conditions — shown beside it. The session moves through its own lifecycle as
each party arrives and the doctor completes it, and the rules for joining are
enforced at the API rather than in the interface.

## medical-records

What the consultation leaves behind: the doctor's clinical note, the
prescriptions issued, and the patient's history of past appointments. Notes and
prescriptions are never deleted — a correction is a revision, and the absence of
a delete route is how that is enforced. Only a doctor who took part in the
consultation may write its note or prescribe; a patient can read their own
record and nothing else, and a doctor can read the records of patients they have
treated.

## clinical-assist

The contract every piece of model-generated content answers to. Two surfaces
generate text: a draft of the consultation note for the doctor to edit, and a
plain-language summary of a signed note for the patient. Neither ever writes to
the medical record. A draft pre-fills a form the doctor must still save; a
summary is displayed beside the clinical note and never instead of it, and is
withheld as soon as it stops describing the note's current version. Generated
content is labelled as generated, and names the model that produced it so what
is on screen can be traced.

Generation is disabled by default and runs against a model in the same
deployment. When it is off, unreachable, or the transcript is too thin to draft
from, the assist surfaces report that state plainly and everything else in the
product behaves exactly as before.

## doctor-matching

Turns "I don't know which kind of doctor I need" into a short, ranked list of
clinicians. The patient describes their concern by picking from a symptom
catalogue, by writing in their own words, or both. The system matches that
against rules that map symptoms to specializations, weights the result, and
returns doctors who hold the matched specialty — each with a plain-language
reason naming the concerns that produced the match.

Matching is deterministic and computed inside the application: the same intake
always produces the same list, so a patient who retries does not get a different
answer. Some symptoms are marked as emergency indicators, and those trigger
prominent guidance ahead of any suggestion of care. When nothing matches, the
result says so rather than returning an empty list.

## notifications

Keeps both sides of a consultation aware of what changed: a booking, a
reschedule, a cancellation by either party, an imminent appointment, or records
becoming available. Every notification is an in-application message stored in
the database and shown in the app, with an unread count and a link to the thing
it refers to. Nothing is sent by email, SMS or push, and no third-party
notification service is involved.

## admin-console

The oversight surface for the people who run the service. Administrators manage
patient and doctor accounts, including suspending and deactivating them with a
recorded reason; review doctor applications before those doctors become
bookable; correct a doctor's specializations; intervene in appointments by
cancelling them; and read operational counts.

Alongside it is the audit log. Every administrator action that changed something
is recorded with the actor, the target and the reason. Reading a page is
deliberately not recorded — the log describes changes, not attention.

## visual-system

The presentation contract the whole interface answers to, on public pages and
signed-in screens alike. Text must be legible against whatever it sits on;
colours that carry a warning mean only that; interactive elements are reachable
and operable by keyboard; and states are never conveyed by colour alone. It is
the one capability with no API surface — it governs how everything else is
presented rather than what the system does.

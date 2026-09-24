---
title: API Modules
description: The twelve modules the API is built from, and what each owns.
---

# API Modules

The API is twelve Nest modules under `apps/api/src/modules/`. This section
covers each one: what it owns, how it is put together, and the part of the
[data model](/data-model/) it is responsible for.

Depth is proportional to weight. `records`, `consultations`, `llm` and
`matching` carry the most rules and are treated in full; `health` and `users`
are short because there is little to say about them.

## The modules

| Module | Owns |
| --- | --- |
| [`auth`](/modules/auth) | Registration, sign-in, and the session that carries both. |
| [`users`](/modules/users) | The patient's own profile and self-reported medical history. |
| [`doctors`](/modules/doctors) | The clinician directory, and a doctor's view of their own profile. |
| [`availability`](/modules/availability) | Declared weekly windows and dated exceptions, and the bookable slots derived from them. |
| [`appointments`](/modules/appointments) | Booking, rescheduling and cancellation — the appointment lifecycle. |
| [`consultations`](/modules/consultations) | The consultation room: session lifecycle, the message thread, and what each party may see. |
| [`records`](/modules/records) | Clinical notes, prescriptions, and the two model-assisted surfaces — drafts and summaries. |
| [`llm`](/modules/llm) | The single seam between the application and the model runtime. |
| [`matching`](/modules/matching) | Turning a described concern into a ranked, explained list of doctors. |
| [`notifications`](/modules/notifications) | In-application messages written by other modules, plus reminders derived on read. |
| [`admin`](/modules/admin) | Account oversight, doctor approval, appointment intervention, and the audit log. |
| [`health`](/modules/health) | The unauthenticated liveness and database-reachability probe. |

## How they fit together

Three cross-module relationships carry most of the coupling, and knowing them
makes the per-module pages easier to read:

**`availability` answers "is this slot bookable?" for everyone.** The doctor
directory, the booking path and the reschedule path all call
`AvailabilityService.slotsFor` rather than reimplementing the window-and-exception
arithmetic. There is one definition of an offerable slot in the system.

**`appointments` owns appointment-level authorization.** Its
`loadForParticipant` is what decides whether the caller is a party to an
appointment, and `consultations` reuses it rather than repeating the check.

**`records` depends on `consultations` for the transcript.** Drafting a note
reads the consultation's messages through a method that deliberately performs no
authorization of its own, because the authoring-doctor check happens in
`records`. This is the one place an authorization decision is delegated across a
module boundary.

One more relationship is worth naming because it is invisible in the route list:
`notifications` is a `@Global()` module with no routes of its own that create
anything. Every other module writes its notifications *inside its own
transaction* by calling `emit(tx, …)`, so a booking that rolls back cannot leave
a notification claiming it succeeded.

## What is not a module

Two things a reader might expect to find here are deliberately absent.

**There is no `common` module in this list.** Shared guards, the Prisma service
and the decorators live in `apps/api/src/common/` and are described under
[Components](/architecture/components), because they are not features.

**There is no separate module for the audit log.** Writing an audit entry is part
of the operation it records, so it happens in the module that performs that
operation. See [`admin`](/modules/admin) for which operations write one.

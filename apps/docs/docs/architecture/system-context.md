---
title: System Context
description: Who uses reMEDyo and what it depends on, at C4 level 1.
---

# System Context

The outermost view: the people who use the system, the system itself, and the
one external thing it depends on. Everything inside reMEDyo is deliberately
collapsed into a single box here — the point of this level is to establish the
boundary and nothing more.

```mermaid
C4Context
    title System context — reMEDyo

    Person(patient, "Patient", "Describes a concern, books a consultation, attends it and reads their own record")
    Person(doctor, "Doctor", "Declares availability, runs consultations, writes notes and prescriptions")
    Person(admin, "Administrator", "Approves doctors, manages accounts, intervenes in appointments, reads the audit log")

    System(remedyo, "reMEDyo", "Telehealth prototype. Matches patients to doctors, books and runs consultations, and keeps the clinical record.")

    System_Ext(model, "Model runtime", "Ollama serving a local model. Drafts consultation notes and summarises signed notes. Self-hosted, private network only, off by default.")

    %% Edge labels are kept to one word and the detail lives in the node
    %% descriptions above. Mermaid's C4 renderer draws a relation's label on the
    %% line itself, so a long label lands on top of whatever the line passes
    %% over; short ones stay legible even where the layout is tight.
    Rel(patient, remedyo, "Books", "HTTPS")
    Rel(doctor, remedyo, "Consults", "HTTPS")
    Rel(admin, remedyo, "Reviews", "HTTPS")
    Rel(remedyo, model, "Requests generation", "private network")

    UpdateRelStyle(patient, remedyo, $offsetY="-90", $offsetX="-40")
    UpdateRelStyle(doctor, remedyo, $offsetY="-90", $offsetX="60")
    UpdateRelStyle(admin, remedyo, $offsetY="-90", $offsetX="-60")
    UpdateRelStyle(remedyo, model, $offsetY="-60", $offsetX="70")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## What this level says

**Three human actors, one system.** The three roles are not variations on one
kind of user: they register differently (patients and doctors self-register,
administrators are pre-provisioned), they see different surfaces, and they are
restricted at the API rather than in the interface.

**One external dependency, and it is optional.** The model runtime is the only
thing outside the system's own boundary. It is self-hosted rather than a hosted
service, it is reachable only from the API over a private network, and the
product runs completely without it. Nothing else is called: there is no payment
provider, no email or SMS gateway, no push service and no third-party
authentication.

**Everything clinical is inside the boundary.** Matching, booking, the
consultation workspace and the medical record are all first-party. A patient's
data does not leave the deployment, which is what makes the prototype's
fictional-data position defensible rather than merely asserted.

## Where the pieces live

This diagram deliberately shows nothing about how the system is built. The next
level, [Containers](/architecture/containers), opens the box.

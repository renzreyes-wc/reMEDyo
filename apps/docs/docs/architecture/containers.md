---
title: Containers
description: The deployable pieces of reMEDyo and how they talk, at C4 level 2.
---

# Containers

Opening the system box: the separately running pieces, and the protocols
between them. A "container" here is anything that runs as its own process —
which, in this system, means three applications and a database.

```mermaid
C4Container
    title Container diagram — reMEDyo

    Person(patient, "Patient", "Uses a browser")
    Person(doctor, "Doctor", "Uses a browser")
    Person(admin, "Administrator", "Uses a browser")

    Container_Boundary(remedyo, "reMEDyo") {
        Container(web, "Web application", "Next.js 16, React 19", "Serves every browser-facing route: the public pages, the patient, doctor and administrator surfaces, and the consultation workspace.")
        Container(api, "API application", "NestJS 12 on Express", "Serves the whole HTTP interface in twelve modules. Authenticates the session, enforces role and ownership rules, and applies the business rules.")
        ContainerDb(db, "Database", "PostgreSQL 18, through Prisma 6", "Accounts, doctor profiles, availability, appointments, consultations, clinical notes, prescriptions, notifications and the audit log.")
    }

    Container_Ext(model, "Model runtime", "Ollama", "Serves a local model that drafts consultation notes and summarises signed notes. Reachable only from the API. Off by default.")

    %% Edge labels are kept short and the detail lives in the container
    %% descriptions above. Mermaid's C4 renderer draws a relation's label on the
    %% line itself, so a long label lands on top of whatever the line passes
    %% over; short ones stay legible even where the layout is tight.
    Rel(patient, web, "Uses", "HTTPS")
    Rel(doctor, web, "Uses", "HTTPS")
    Rel(admin, web, "Uses", "HTTPS")

    Rel(web, api, "Calls", "HTTPS, session cookie")
    Rel(api, db, "Reads and writes", "Prisma")
    Rel(api, model, "Generates", "private network")

    UpdateRelStyle(patient, web, $offsetY="-80", $offsetX="-80")
    UpdateRelStyle(doctor, web, $offsetY="-80", $offsetX="60")
    UpdateRelStyle(admin, web, $offsetY="-80", $offsetX="-90")
    UpdateRelStyle(web, api, $offsetY="-70", $offsetX="-30")
    UpdateRelStyle(api, db, $offsetY="40", $offsetX="-70")
    UpdateRelStyle(api, model, $offsetY="30", $offsetX="60")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="1")
```

## The containers

**Web application — Next.js.** Every browser-facing route lives here: the public
marketing and legal pages, registration and sign-in, the patient, doctor and
administrator surfaces, and the consultation workspace. It holds no business
rules of its own. Where a rule matters — whether a consultation can be joined,
whether this doctor may write this note — the interface reflects a decision the
API has already made, and the API re-checks it on every request.

**API application — NestJS.** The whole HTTP interface, in twelve modules. This
is where identity, authorization and the business rules actually live. It is
also the only container that talks to the database and the only one that reaches
the model runtime.

**Database — PostgreSQL.** A single relational database holding all persistent
state, reached through Prisma. It is the only stateful container: the applications
hold no durable state of their own, which is what lets either be restarted or
redeployed without losing anything.

**Model runtime — Ollama.** A separate process serving a local model. It is a
container in the deployment sense but not part of the request path for anything
except clinical assistance: if it is absent, the API starts normally and the
assist surfaces report themselves unavailable.

## The connections worth noting

**Web to API over a session cookie.** The browser sends the session as an
`httpOnly` cookie, not a bearer token, so no script on the page can read it. The
API accepts exactly one origin, set by `WEB_ORIGIN`, and requires credentials on
that origin.

**API to database through Prisma only.** No other container opens a database
connection. The schema, the migrations and the client all live with the API.

**API to model over a private network.** The model runtime is never reachable
from the internet. Locally it is a container on the compose network with no
published host port; on Fly.io it is an app given only a private address, so
even though it declares a listening port, that port is on the internal network.
Nothing outside the deployment can call it.

## What is deliberately absent

There is no cache, no message queue, no search index and no object store. Every
one of those would add a container to operate in exchange for a performance
property this system does not yet need. The single exception is the derived
slot computation, which is done on read rather than cached — see
[scheduling](/modules/availability).

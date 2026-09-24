---
title: reMEDyo
slug: /
description: Technical documentation for reMEDyo, a fictional telehealth prototype.
---

# reMEDyo

reMEDyo is a telehealth application: patients find a doctor, book a time, hold a
consultation in a browser, and leave with a clinical note and any prescriptions
the doctor issued. Doctors declare their availability, run the consultations,
and write the record. Administrators approve doctors before they become
bookable and can intervene afterwards.

:::warning Fictional prototype

reMEDyo is a **fictional prototype**. It is not a real clinical service, it is
not fit for real medical use, and it holds no real patient data. Every account,
appointment and medical record in the running system is invented demonstration
data. Nothing here should be used to make a decision about anyone's health.

:::

## What is in this documentation

This site describes the system as it is built. It is written for someone who has
to work on or integrate with the code — a reviewer, a new contributor, or an
engineer wiring something up to the API — rather than for a person looking for
care.

- **[Context](/overview/context)** — the problem the product addresses, who uses
  it, and what it deliberately does not do.
- **[Features](/overview/features)** — what the product does, described
  capability by capability.
- **[High-level Architecture](/architecture/system-context)** — the system in
  context, its containers, the layering inside the API, and how it is deployed.
- **[Detailed Architecture](/modules/)** — every API module in turn, with the
  part of the data model it owns.
- **[Data Model](/data-model/)** — the persisted entities, the enumerations, and
  the constraints the schema enforces.
- **[API Reference](/api/)** — the HTTP interface, generated from the running
  application.

## Two things worth knowing before you read further

**The API reference is generated, not written.** It is produced from the
application's own routes and validation rules each time the site is built, so it
cannot describe a route the API does not serve. The architecture diagrams are
Mermaid source in version control for the same reason: a change to them is a
reviewable diff rather than a replaced image.

**The clinical surfaces are model-assisted, and the model is self-hosted.** Note
drafting and patient-facing record summaries are produced by a model running in
the same deployment. This is off by default, it never writes to the medical
record, and the product is fully functional without it. See
[clinical assist](/modules/llm) and [medical records](/modules/records).

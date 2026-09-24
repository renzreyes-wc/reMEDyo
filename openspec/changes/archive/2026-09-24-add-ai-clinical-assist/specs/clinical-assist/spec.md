# Spec Delta

## Purpose

The contract every piece of model-generated content in the product answers to: where generation is permitted at all, that no generated text reaches the medical record without a clinician's save, that generated text is labelled wherever it is shown, that every generation is audited, that prompts carry only the data the feature needs, and that the whole system works unchanged when no model is available.

## ADDED Requirements

### Requirement: Generation is confined to summarisation of first-party material
The system SHALL permit model-generated content only where the generation summarises or restates material the application already holds for that one appointment. The system MUST NOT use a model to originate a clinical judgement, a diagnosis, a treatment decision, or a prescription that is not already present in its input.

#### Scenario: Summarising material the system holds
- **WHEN** a generation is performed for a consultation
- **THEN** its input consists only of records the application already stores for that appointment — its transcript, its clinical context, its saved note, and its prescriptions

#### Scenario: Origination refused
- **WHEN** any surface would require a model to decide a diagnosis, a treatment, or a prescription that is not stated in its input
- **THEN** no such surface exists in the system, and the decision remains the clinician's

### Requirement: No generated content enters the medical record without a clinician's save
Generated text SHALL NOT be persisted as a consultation note or as a prescription except through an authenticated write by the clinician on that appointment. There MUST be no code path in which a generated string becomes part of the medical record without that write.

#### Scenario: A draft is generated but never saved
- **WHEN** a draft is generated for an appointment and the doctor navigates away without saving
- **THEN** no consultation note exists for that appointment, and the patient's record is unchanged

#### Scenario: A generated draft is saved by the clinician
- **WHEN** the doctor submits the note form whose fields were pre-filled from a generated draft
- **THEN** the note is written by the same authenticated clinician write that a hand-typed note uses, and is subject to the same validation and authorisation

#### Scenario: Generated content is not a prescription
- **WHEN** any generation produces text describing a medication
- **THEN** no prescription is created by that generation, and a prescription exists only where the clinician submitted the prescription form

### Requirement: Generated content is labelled wherever it is displayed
Every surface that displays model-generated content SHALL identify it as generated, at the point of display, in both the clinician's and the patient's interface. A generated surface MUST NOT be presented in a way that could be mistaken for text authored by a clinician.

#### Scenario: Draft shown to the doctor
- **WHEN** a generated draft pre-fills the note form
- **THEN** the form states that the content was generated and requires the doctor's review before saving

#### Scenario: Summary shown to the patient
- **WHEN** a plain-language summary is displayed in the patient's records
- **THEN** it is labelled as a generated plain-language summary and identified as not being the clinical record

#### Scenario: Clinician-authored content carries no generated label
- **WHEN** a consultation note written entirely by hand is displayed
- **THEN** no generated-content label appears on it

### Requirement: No model participates in authorization, matching, emergency detection, or scheduling
The system SHALL keep authorization, doctor matching, emergency indication, availability derivation, and appointment scheduling deterministic. No model output MAY influence who may read or write a record, which doctors are suggested, whether an intake is flagged as an emergency, or which slots are bookable.

#### Scenario: Access decisions stay deterministic
- **WHEN** any user requests a record, a consultation workspace, or an appointment
- **THEN** the decision to permit or refuse is made by the application's stored relationships and roles alone, with no model consulted

#### Scenario: Emergency indication stays rule-based
- **WHEN** a patient submits an intake containing a symptom marked as an emergency indicator
- **THEN** the emergency guidance is produced by the stored symptom rules, and is unaffected by whether a model runtime is present, absent, or disabled

#### Scenario: Matching stays rule-based
- **WHEN** a patient submits an intake for doctor suggestions
- **THEN** the ranking is produced by the stored symptom rules and the availability and experience ordering, with no model consulted

### Requirement: Every generation is audited
The system SHALL record an audit entry for every generation attempt that produces content, capturing the acting user, the appointment it concerned, the kind of generation, and the model that produced it. These entries SHALL be insert-only and MUST NOT be altered or deleted through the application.

#### Scenario: Draft generation audited
- **WHEN** a doctor generates a note draft
- **THEN** an audit entry records that doctor, that appointment, the draft generation kind, and the model name

#### Scenario: Summary generation audited
- **WHEN** a plain-language summary is generated for an appointment
- **THEN** an audit entry records the appointment, the summary generation kind, and the model name

#### Scenario: Audit entries cannot be removed
- **WHEN** any user attempts to alter or delete a generation audit entry
- **THEN** the system refuses and the entry remains retrievable

### Requirement: Prompts carry only the data the feature needs
The data sent to a model SHALL be scoped to the single appointment being worked on and to that appointment's patient and doctor. Records belonging to any other patient, any other appointment, or any unrelated user MUST NOT be included in a prompt.

#### Scenario: One appointment's data only
- **WHEN** content is generated for an appointment
- **THEN** the prompt contains only that appointment's own material and the identities of its two participants

#### Scenario: No cross-patient data
- **WHEN** a doctor holds appointments with several patients
- **THEN** a generation for one of those appointments contains no data belonging to any of the others

#### Scenario: Only what the feature needs
- **WHEN** a patient-facing summary is generated
- **THEN** the prompt excludes the session transcript, which that feature does not need

### Requirement: The system operates fully without a model runtime
The system SHALL support a configuration in which model generation is disabled, and SHALL behave correctly when an enabled model runtime is unreachable, slow, or failing. In either case every existing behaviour of the application remains available, assist surfaces are absent rather than broken, no request blocks indefinitely, and no stored data is lost or altered.

#### Scenario: Generation disabled by configuration
- **WHEN** the application is configured with generation disabled
- **THEN** no assist action is offered on any screen, no generated content is displayed, and every non-assist behaviour of the application is unchanged

#### Scenario: Runtime unreachable
- **WHEN** generation is enabled but the model runtime cannot be reached
- **THEN** the assist action reports that assistance is unavailable, the clinician can still write and save the note by hand, and the patient's records page still renders the clinical note

#### Scenario: Runtime too slow
- **WHEN** a generation exceeds the configured time limit
- **THEN** the attempt is abandoned within that limit, the caller is told that assistance is unavailable, and nothing is stored from the abandoned attempt

#### Scenario: Application starts without the model
- **WHEN** the system is started and the model runtime is not yet ready
- **THEN** the application starts and serves every non-assist behaviour without waiting for it

### Requirement: Generated artefacts are retained, not silently replaced or deleted
Stored generated artefacts SHALL follow the system's retention rule: they are regenerated or superseded rather than hard-deleted through the application. Each stored artefact SHALL record the model that produced it and when it was produced, so any generated content on screen can be traced to a generation.

#### Scenario: Provenance recorded
- **WHEN** a generated artefact is stored
- **THEN** it carries the name of the model that produced it and the time it was produced

#### Scenario: Regeneration supersedes
- **WHEN** content is generated again for the same appointment and kind
- **THEN** the stored artefact is replaced by the newer generation with its own model name and time, and no deletion endpoint exists for it

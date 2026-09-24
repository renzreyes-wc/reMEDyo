# Spec Delta

## MODIFIED Requirements

### Requirement: Consultation notes
The system SHALL allow the doctor of a completed appointment to record consultation notes comprising findings, diagnosis, recommendations, and an optional follow-up instruction. Notes SHALL be attached to exactly one appointment. The system SHALL additionally offer that doctor, and only that doctor, an explicit action to generate a draft of those four fields from the appointment's own session transcript and clinical context; the draft pre-fills the form for editing and is never itself the note. A saved note SHALL record whether it was written with the assistance of a generated draft.

#### Scenario: Doctor records notes after completing a session
- **WHEN** the doctor of a completed appointment submits findings, diagnosis, and recommendations
- **THEN** the system stores the notes against that appointment and notifies the patient that their consultation record is available

#### Scenario: Notes on an appointment not yet completed
- **WHEN** a doctor attempts to record notes for an appointment that is still scheduled
- **THEN** the system rejects the request

#### Scenario: Another doctor attempts to write notes
- **WHEN** a doctor who is not the clinician on the appointment attempts to record notes for it
- **THEN** the system rejects the request as forbidden

#### Scenario: Doctor revises their notes
- **WHEN** the authoring doctor edits notes they previously recorded
- **THEN** the system stores the revision and records when it was last updated

#### Scenario: Doctor requests a draft from the consultation
- **WHEN** the doctor of a completed appointment invokes the draft action and the transcript carries enough exchange to summarise
- **THEN** the system returns a draft of findings, diagnosis, recommendations, and follow-up drawn only from that appointment's transcript, clinical context, and metadata, pre-fills the note form with it, and labels the content as generated and awaiting the doctor's review

#### Scenario: Transcript too thin to draft from
- **WHEN** the doctor invokes the draft action for an appointment whose transcript is empty or too thin to support a summary
- **THEN** the system declines to draft, explains why, and pre-fills nothing

#### Scenario: Draft is never the record
- **WHEN** a draft has been generated for an appointment
- **THEN** it is not readable by the patient, is not part of the medical record, and no consultation note exists for that appointment until the doctor saves one

#### Scenario: Draft survives a reload
- **WHEN** the doctor reloads the note form for an appointment whose draft was already generated
- **THEN** the previously generated draft is available again without a second generation

#### Scenario: Draft action unavailable
- **WHEN** generation is disabled or the model runtime cannot be reached
- **THEN** the draft action is absent or reports that assistance is unavailable, and the doctor can still write and save the note by hand

#### Scenario: Another doctor requests a draft
- **WHEN** a doctor who is not the clinician on the appointment invokes the draft action for it
- **THEN** the system rejects the request as forbidden and generates nothing

#### Scenario: Provenance recorded on the saved note
- **WHEN** a note is saved
- **THEN** the stored note records whether it was written with the assistance of a generated draft, and a reader of the record can tell which it was

### Requirement: Prescriptions
The system SHALL allow the doctor of a completed appointment to issue one or more prescriptions, each recording the medication name, dosage, frequency, duration, and optional instructions. Every prescription SHALL be labelled in the interface as fictional and not valid for dispensing. The system MUST NOT generate a prescription: no model output may create, propose, or pre-fill a prescription except by extracting values a doctor's own message in that appointment's transcript already states, and every extracted value SHALL be traceable to the message it came from.

#### Scenario: Doctor issues a prescription
- **WHEN** the doctor of a completed appointment submits a prescription with medication, dosage, frequency, and duration
- **THEN** the system stores it against the appointment and it becomes visible to the patient

#### Scenario: Incomplete prescription rejected
- **WHEN** a doctor submits a prescription missing the medication name or the dosage
- **THEN** the system rejects it with a validation error and stores nothing

#### Scenario: Fictional labelling
- **WHEN** a prescription is displayed to any user
- **THEN** it carries a visible notice that it is part of a prototype and is not valid for dispensing

#### Scenario: No prescription invented from a consultation
- **WHEN** a draft is generated for an appointment whose transcript contains no doctor's message stating a medication with its dose, frequency, and duration
- **THEN** the prescription form stays empty and no prescription values are proposed

#### Scenario: Prescription values extracted from the doctor's own message
- **WHEN** a doctor's message in that appointment's transcript states a medication with its dose, frequency, and duration
- **THEN** those values may pre-fill the prescription form, the system identifies the message they were taken from, and the values are labelled as extracted and awaiting the doctor's confirmation

#### Scenario: Extraction that cannot be traced is discarded
- **WHEN** a proposed prescription value cannot be matched to a doctor's message in that appointment's transcript
- **THEN** the system discards it and pre-fills nothing from it

#### Scenario: Extraction never creates a prescription
- **WHEN** prescription values have been extracted and pre-filled
- **THEN** no prescription exists against the appointment until the doctor submits the prescription form

## ADDED Requirements

### Requirement: Plain-language record summary
The system SHALL make available to the patient a plain-language summary of a consultation, generated from the clinician's saved note and that appointment's prescriptions and from nothing else. The summary SHALL be stored with the model that produced it, the time it was produced, and a marker of the note version it explains. It SHALL introduce no clinical claim, instruction, dose, or recommendation that is not present in the note or prescriptions it was generated from. The summary is not the medical record, and it SHALL NOT replace the clinical note anywhere it is displayed.

#### Scenario: Summary generated from the signed note
- **WHEN** the doctor saves a consultation note
- **THEN** the system generates a plain-language summary from that note and the appointment's prescriptions, and stores it with the model name, generation time, and the note version it explains

#### Scenario: Summary inputs are the approved document only
- **WHEN** a summary is generated
- **THEN** its input is the saved consultation note and that appointment's prescriptions, and excludes the session transcript and any generated draft

#### Scenario: Patient reads the summary beside the note
- **WHEN** a patient opens a consultation record that has a current summary
- **THEN** the summary is displayed beside the clinical note, labelled as a generated plain-language summary, stated not to be the clinical record, with the full clinical note still visible

#### Scenario: Summary adds nothing to the note
- **WHEN** a summary is displayed
- **THEN** every clinical claim, instruction, dose, and recommendation it contains is present in the note or prescriptions it was generated from

#### Scenario: Stale summary is not shown
- **WHEN** the doctor revises a note after its summary was generated
- **THEN** the existing summary is no longer shown to the patient, and a summary is generated again from the revised note

#### Scenario: Records render without a summary
- **WHEN** generation is disabled, the model runtime is unreachable, or no summary has been generated yet
- **THEN** the patient's records page renders the clinical note and prescriptions as it does today, with no summary and no error

#### Scenario: Note save is never blocked by summary generation
- **WHEN** the doctor saves a note while the model runtime is unreachable or slow
- **THEN** the note is saved, the patient is notified as usual, and only the summary is absent

#### Scenario: Patient cannot alter the summary
- **WHEN** a patient submits a request to modify or delete a plain-language summary
- **THEN** the system rejects the request and the summary is unchanged

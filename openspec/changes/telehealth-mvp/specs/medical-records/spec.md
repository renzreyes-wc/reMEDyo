# Spec Delta

## Purpose

What the consultation leaves behind: the doctor's clinical notes, the prescriptions issued, and the patient's history of past appointments — together with the access rules that decide who may read or write each of them.

## ADDED Requirements

### Requirement: Consultation notes
The system SHALL allow the doctor of a completed appointment to record consultation notes comprising findings, diagnosis, recommendations, and an optional follow-up instruction. Notes SHALL be attached to exactly one appointment.

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

### Requirement: Prescriptions
The system SHALL allow the doctor of a completed appointment to issue one or more prescriptions, each recording the medication name, dosage, frequency, duration, and optional instructions. Every prescription SHALL be labelled in the interface as fictional and not valid for dispensing.

#### Scenario: Doctor issues a prescription
- **WHEN** the doctor of a completed appointment submits a prescription with medication, dosage, frequency, and duration
- **THEN** the system stores it against the appointment and it becomes visible to the patient

#### Scenario: Incomplete prescription rejected
- **WHEN** a doctor submits a prescription missing the medication name or the dosage
- **THEN** the system rejects it with a validation error and stores nothing

#### Scenario: Fictional labelling
- **WHEN** a prescription is displayed to any user
- **THEN** it carries a visible notice that it is part of a prototype and is not valid for dispensing

### Requirement: Patient record access
A patient SHALL be able to read the full history of their own appointments together with every consultation note and prescription recorded against them. A patient MUST NOT be able to create, alter, or delete a note or prescription.

#### Scenario: Patient reads their records
- **WHEN** a patient opens their medical records
- **THEN** the system lists their past appointments, each with its doctor, date, notes, and prescriptions

#### Scenario: Patient attempts to alter a note
- **WHEN** a patient submits a request to modify or delete a consultation note
- **THEN** the system rejects the request and the note is unchanged

#### Scenario: Patient with no history
- **WHEN** a patient with no completed appointments opens their medical records
- **THEN** the system shows an explanatory empty state rather than an error

### Requirement: Doctor record access
A doctor SHALL be able to read the appointment history, consultation notes, and prescriptions of a patient only where that doctor has at least one appointment with that patient, whether past or upcoming. Records of patients with no such relationship MUST NOT be readable.

#### Scenario: Doctor reads the record of their own patient
- **WHEN** a doctor opens the record of a patient with whom they hold an appointment
- **THEN** the system shows that patient's appointment history, notes, and prescriptions, including those authored by other doctors

#### Scenario: Doctor reads the record of an unrelated patient
- **WHEN** a doctor requests the record of a patient with whom they have no appointment
- **THEN** the system rejects the request as forbidden or not-found and discloses no record content

#### Scenario: Access follows a new booking
- **WHEN** a patient books their first appointment with a doctor
- **THEN** that doctor becomes able to read that patient's record

### Requirement: Record immutability for accountability
The system SHALL retain consultation notes and prescriptions once recorded. Neither MAY be hard-deleted through the application; corrections are made by revision, which preserves the time of the latest change.

#### Scenario: Deletion attempt
- **WHEN** any user, including the authoring doctor, attempts to delete a stored consultation note
- **THEN** the system refuses and the note remains retrievable

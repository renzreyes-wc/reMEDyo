# Patient Profile Specification

## Purpose

Holds the personal and clinical context a doctor needs before a consultation: who the patient is, how to reach them, their physical measurements, and the basic medical history they choose to share.

## Requirements

### Requirement: Patient profile fields
The system SHALL allow a patient to record and update their full name, date of birth, contact number, weight, and height. Name and date of birth SHALL be required before the patient books a first consultation; the remaining fields are optional.

#### Scenario: Patient completes their profile after registering
- **WHEN** a newly registered patient submits the profile form with name, date of birth, contact number, weight, and height
- **THEN** the system stores the values and the profile is shown as complete

#### Scenario: Patient updates a measurement
- **WHEN** a patient changes their recorded weight and saves
- **THEN** the new value is persisted and shown on their profile immediately

#### Scenario: Booking blocked on an incomplete profile
- **WHEN** a patient with no recorded name or date of birth attempts to book a consultation
- **THEN** the system directs them to complete the required profile fields and does not create the appointment

### Requirement: Derived age
The system SHALL derive and display the patient's age from their date of birth rather than storing an age value.

#### Scenario: Age shown to the doctor
- **WHEN** a doctor views the profile of a patient whose date of birth is recorded
- **THEN** the displayed age equals the completed years between that date and the current date

### Requirement: Basic medical history
The system SHALL allow a patient to record basic medical history comprising known allergies, current medications, chronic conditions, and free-text notes. Each entry SHALL be optional and independently editable.

#### Scenario: Patient records an allergy
- **WHEN** a patient adds an allergy entry to their medical history and saves
- **THEN** the entry is persisted and appears in their medical history

#### Scenario: History visible to a doctor with an appointment
- **WHEN** a doctor opens the consultation workspace for an appointment with that patient
- **THEN** the patient's recorded allergies, medications, and conditions are displayed as appointment context

#### Scenario: History not visible to an unrelated doctor
- **WHEN** a doctor who has no appointment with that patient requests the patient's medical history
- **THEN** the system rejects the request as forbidden

### Requirement: Generated avatar
The system SHALL represent each user visually using initials derived from their name, rendered by the application. The system MUST NOT depend on external file storage or an external avatar service.

#### Scenario: Avatar for a named patient
- **WHEN** a patient whose recorded name is "Maria Santos" is displayed anywhere in the interface
- **THEN** an application-rendered avatar showing "MS" is displayed

#### Scenario: Avatar before a name is recorded
- **WHEN** a user with no recorded name is displayed
- **THEN** a neutral application-rendered placeholder avatar is shown and no request is made to an external host

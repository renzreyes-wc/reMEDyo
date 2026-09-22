# Spec Delta

## Purpose

The room where the consultation actually happens: a first-party workspace tied to one appointment, showing both parties the clinical context they need, tracking the session through its lifecycle, and producing a completed consultation that records can attach to.

## ADDED Requirements

### Requirement: Consultation workspace
The system SHALL provide, for each scheduled appointment, a consultation workspace accessible to exactly that appointment's patient and doctor, displaying the appointment time, the reason for the visit, the counterpart's identity, and the session state. The workspace MUST be served by the application and MUST NOT depend on an external conferencing service.

#### Scenario: Patient opens the workspace
- **WHEN** the patient of a scheduled appointment opens its consultation workspace within the joinable period
- **THEN** the workspace renders with the appointment time, reason for visit, the doctor's identity, and the current session state

#### Scenario: Doctor opens the workspace
- **WHEN** the doctor of a scheduled appointment opens its consultation workspace
- **THEN** the workspace renders and additionally displays the patient's age, recorded allergies, current medications, and chronic conditions as clinical context

#### Scenario: Unrelated user opens the workspace
- **WHEN** a user who is neither the appointment's patient nor its doctor requests the workspace
- **THEN** the system rejects the request as forbidden or not-found and discloses no appointment content

### Requirement: Session lifecycle states
A consultation session SHALL occupy exactly one of the states scheduled, joined, in-progress, or completed. Transitions SHALL only proceed forward: scheduled to joined when the first participant joins, joined to in-progress when both participants have joined, and in-progress or joined to completed when the doctor ends the session. A cancelled appointment SHALL have no joinable session.

#### Scenario: First participant joins
- **WHEN** the first of the two participants joins a scheduled session
- **THEN** the session state becomes joined and the other participant is shown as not yet present

#### Scenario: Both participants present
- **WHEN** the second participant joins a session already in the joined state
- **THEN** the session state becomes in-progress

#### Scenario: Doctor ends the session
- **WHEN** the doctor ends a session that is joined or in-progress
- **THEN** the session state becomes completed, the appointment is marked completed, and the doctor is directed to record consultation notes

#### Scenario: Patient cannot complete the session
- **WHEN** a patient attempts to move the session to completed
- **THEN** the system rejects the request and the session state is unchanged

#### Scenario: Backward transition rejected
- **WHEN** any participant attempts to move a completed session back to an earlier state
- **THEN** the system rejects the request

#### Scenario: Cancelled appointment has no session
- **WHEN** either party attempts to join the session of a cancelled appointment
- **THEN** the system refuses and explains that the appointment was cancelled

### Requirement: Join window
The system SHALL permit joining a session only from a bounded period before the scheduled start until a bounded period after the scheduled end, both defined by the application.

#### Scenario: Joining too early
- **WHEN** a participant attempts to join well before the permitted period opens
- **THEN** the system refuses the join and displays when the session becomes joinable

#### Scenario: Joining within the window
- **WHEN** a participant attempts to join inside the permitted period
- **THEN** the join succeeds and the session state advances

#### Scenario: Joining after the window
- **WHEN** a participant attempts to join after the permitted period has closed on an appointment that was never completed
- **THEN** the system refuses the join and shows the appointment as missed

### Requirement: In-session text exchange
The workspace SHALL provide a text channel scoped to the appointment through which the patient and doctor exchange messages, stored by the application and visible to both parties afterwards as part of the consultation record. Audio and video streaming are not required.

#### Scenario: Message exchanged
- **WHEN** a participant sends a message in a joined or in-progress session
- **THEN** the message is stored against the appointment, attributed to its sender with a timestamp, and visible to the other participant

#### Scenario: Message after completion
- **WHEN** a participant attempts to send a message in a completed session
- **THEN** the system rejects the message and the transcript is unchanged

#### Scenario: Transcript preserved
- **WHEN** either party views a completed appointment
- **THEN** the messages exchanged during that session remain readable to both of them

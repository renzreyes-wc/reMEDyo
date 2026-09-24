# Spec Delta

## MODIFIED Requirements

### Requirement: In-session text exchange
The workspace SHALL provide a text channel scoped to the appointment through which the patient and doctor exchange messages, stored by the application and visible to both parties afterwards as part of the consultation record. Audio and video streaming are not required. The stored transcript SHALL additionally serve as the input to that appointment's consultation-note drafting once the session is completed, available for that purpose to the appointment's own clinician only and never to the patient or to any other user.

#### Scenario: Message exchanged
- **WHEN** a participant sends a message in a joined or in-progress session
- **THEN** the message is stored against the appointment, attributed to its sender with a timestamp, and visible to the other participant

#### Scenario: Message after completion
- **WHEN** a participant attempts to send a message in a completed session
- **THEN** the system rejects the message and the transcript is unchanged

#### Scenario: Transcript preserved
- **WHEN** either party views a completed appointment
- **THEN** the messages exchanged during that session remain readable to both of them

#### Scenario: Transcript drives note drafting after completion
- **WHEN** the clinician on a completed appointment requests a note draft
- **THEN** the draft is derived from that appointment's own stored messages together with the clinical context already shown to that clinician, and from no other appointment's messages

#### Scenario: Transcript is not exposed through drafting to anyone else
- **WHEN** a patient or any user other than the appointment's clinician attempts to obtain a draft derived from the transcript
- **THEN** the system refuses, and the transcript remains readable to the two participants only as the transcript itself

#### Scenario: Drafting does not alter the transcript
- **WHEN** a draft has been generated from a completed session's transcript
- **THEN** the stored messages are unchanged and remain readable to both parties exactly as before

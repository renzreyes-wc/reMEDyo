# Doctor Matching Specification

## Purpose

Turns "I don't know which kind of doctor I need" into a short, ranked list of clinicians. Matching is deterministic and rule-based, computed inside the application, and always explains why each doctor was suggested.

## Requirements

### Requirement: Guided symptom intake
The system SHALL provide patients with a guided intake in which they select one or more symptoms or concerns from an application-defined catalogue, optionally add free text, and optionally indicate duration and severity.

#### Scenario: Patient selects symptoms
- **WHEN** a patient selects one or more symptoms from the catalogue and submits the intake
- **THEN** the system returns a ranked list of suggested doctors

#### Scenario: No symptoms selected
- **WHEN** a patient submits the intake with no symptom selected and no free text
- **THEN** the system declines to produce suggestions and prompts the patient to describe at least one concern

### Requirement: Deterministic specialty matching
The system SHALL map submitted symptoms to specializations using rules stored in the application, and SHALL rank suggested doctors by specialty match strength, then by availability within the next seven days, then by years of experience. The same intake MUST produce the same ranking given unchanged doctor data. The system MUST NOT call any external service to perform matching.

#### Scenario: Chest-related symptom maps to cardiology
- **WHEN** a patient submits an intake whose symptoms map to the cardiology specialization
- **THEN** approved cardiologists appear above doctors of unrelated specializations in the results

#### Scenario: Repeatable ranking
- **WHEN** the same intake is submitted twice with no change to doctor profiles or availability
- **THEN** both submissions return the same doctors in the same order

#### Scenario: Ranking prefers available doctors within a specialty
- **WHEN** two approved doctors share the best-matching specialization and only one has availability in the next seven days
- **THEN** the doctor with availability is ranked higher

### Requirement: Explainable suggestions
Each suggested doctor SHALL be accompanied by a plain-language reason naming the symptoms or concerns that led to the match and the specialization matched.

#### Scenario: Suggestion carries a reason
- **WHEN** the system returns a suggested doctor
- **THEN** the suggestion includes the matched specialization and the submitted concerns that produced the match

### Requirement: Fallback when no specialty matches
When submitted concerns map to no specialization, or no approved doctor holds the matched specialization, the system SHALL fall back to suggesting general practice doctors and SHALL state plainly that the suggestion is a general fallback.

#### Scenario: Unrecognised concern
- **WHEN** a patient submits only free text that matches no rule
- **THEN** the system suggests approved general practice doctors and labels the result as a general recommendation

#### Scenario: Matched specialty has no approved doctors
- **WHEN** the intake maps to a specialization for which no approved doctor exists
- **THEN** the system suggests general practice doctors and states that no specialist in that area is currently available

### Requirement: Triage safety boundary
The system SHALL state alongside every set of suggestions that the matching is not a diagnosis. Where submitted symptoms include application-defined emergency indicators, the system SHALL display emergency guidance directing the patient to contact local emergency services.

#### Scenario: Suggestions carry a non-diagnostic notice
- **WHEN** the system displays matching results
- **THEN** a notice is present stating that the suggestion is not a medical diagnosis

#### Scenario: Emergency indicator submitted
- **WHEN** a patient submits a symptom flagged as an emergency indicator
- **THEN** the system displays emergency guidance prominently above the suggestions

# Admin Console Specification

## Purpose

The oversight surface for the people who run the service: managing patient and doctor accounts, reviewing doctor profiles before they become bookable, intervening in appointments, reading operational counts, and leaving an auditable trail of every administrative action taken.

## Requirements

### Requirement: Administrative account management
The system SHALL allow an administrator to list and search patient and doctor accounts by name, email, and role, and to activate, suspend, or deactivate any non-administrator account. Suspending or deactivating SHALL require a reason, which is stored with the account.

#### Scenario: Administrator searches accounts
- **WHEN** an administrator searches the account list by an email fragment
- **THEN** matching patient and doctor accounts are listed with their role and current status

#### Scenario: Administrator suspends an account
- **WHEN** an administrator suspends a patient account with a reason
- **THEN** the account status becomes suspended, the reason is stored, the user is notified, and the user can no longer sign in

#### Scenario: Suspension without a reason
- **WHEN** an administrator submits a suspension with no reason
- **THEN** the system rejects the request and the account status is unchanged

#### Scenario: Administrator reactivates an account
- **WHEN** an administrator activates a suspended account
- **THEN** the account status becomes active and the user can sign in again

#### Scenario: Non-administrator reaches the console
- **WHEN** a patient or doctor requests any administrative endpoint
- **THEN** the system rejects the request as forbidden

### Requirement: Doctor profile review
The system SHALL present administrators with the queue of doctor profiles awaiting review and SHALL allow approving a profile, rejecting it with a reason, or correcting its specialization data. Approval state changes SHALL take effect immediately on patient-facing listings.

#### Scenario: Administrator reviews the pending queue
- **WHEN** an administrator opens the doctor review queue
- **THEN** doctors whose profiles are pending are listed with their submitted name, specializations, experience, licence identifier, and biography

#### Scenario: Administrator approves a doctor
- **WHEN** an administrator approves a pending doctor profile
- **THEN** the doctor becomes visible in patient-facing listings and bookable, and is notified

#### Scenario: Administrator rejects a doctor
- **WHEN** an administrator rejects a pending doctor profile with a reason
- **THEN** the doctor remains unlisted, the reason is stored and shown to that doctor, and the doctor is notified

#### Scenario: Administrator corrects a specialization
- **WHEN** an administrator changes a doctor's recorded specialization
- **THEN** the corrected specialization governs that doctor's appearance in directory filters and matching results

### Requirement: Appointment oversight
The system SHALL allow an administrator to view all appointments across the system with their participants, times, and session states, to filter them by state and date range, and to cancel any appointment that has not been completed, with a reason.

#### Scenario: Administrator views all appointments
- **WHEN** an administrator opens appointment oversight
- **THEN** appointments across all patients and doctors are listed with participants, scheduled time, and current state

#### Scenario: Administrator filters by state
- **WHEN** an administrator filters appointments to the cancelled state
- **THEN** only cancelled appointments are listed

#### Scenario: Administrator cancels an appointment
- **WHEN** an administrator cancels a scheduled appointment with a reason
- **THEN** the appointment moves to cancelled, the slot is released, both participants are notified, and the action is recorded in the audit log

#### Scenario: Administrator cancels a completed appointment
- **WHEN** an administrator attempts to cancel an appointment that is already completed
- **THEN** the system rejects the request

### Requirement: Operational dashboard
The system SHALL present administrators with counts derived from application data, covering total patients, total doctors, doctors pending review, appointments by state, and consultations completed. Counts MUST be derived from the application database, with no external analytics service.

#### Scenario: Administrator opens the dashboard
- **WHEN** an administrator opens the operational dashboard
- **THEN** current counts of patients, doctors, pending doctor reviews, appointments by state, and completed consultations are displayed

#### Scenario: Counts track a state change
- **WHEN** an appointment moves to the cancelled state and the administrator reloads the dashboard
- **THEN** the scheduled count decreases by one and the cancelled count increases by one

#### Scenario: Empty system
- **WHEN** an administrator opens the dashboard on a system with no data
- **THEN** zero counts are displayed rather than an error or a blank panel

### Requirement: Administrative audit log
The system SHALL record every administrative action that changes state — account status changes, doctor approval decisions, specialization corrections, and appointment cancellations — capturing the acting administrator, the action, the affected record, the time, and the reason where one was supplied. Audit entries MUST NOT be editable or deletable through the application.

#### Scenario: Action produces an audit entry
- **WHEN** an administrator suspends an account with a reason
- **THEN** an audit entry is recorded naming that administrator, the suspend action, the affected account, the time, and the reason

#### Scenario: Administrator reviews the audit log
- **WHEN** an administrator opens the audit log
- **THEN** entries are listed most recent first and can be filtered by acting administrator and by action type

#### Scenario: Audit entries cannot be altered
- **WHEN** any user, including an administrator, attempts to edit or delete an audit entry
- **THEN** the system refuses and the entry remains intact

#### Scenario: Read-only actions are not logged
- **WHEN** an administrator merely views the account list or the dashboard
- **THEN** no audit entry is created

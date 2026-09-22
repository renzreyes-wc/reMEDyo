# Spec Delta

## Purpose

The catalogue of clinicians patients can consult: each doctor's professional identity and specialization, the approval lifecycle that governs whether they are publicly listed, and the browse and search surface patients use to find them.

## ADDED Requirements

### Requirement: Doctor professional profile
The system SHALL allow a doctor to record and update their full name, one or more specializations drawn from an application-defined list, a professional biography, years of experience, a license identifier, and a consultation fee.

#### Scenario: Doctor completes their profile
- **WHEN** a doctor submits the profile form with name, at least one specialization, and a biography
- **THEN** the system stores the profile and marks it as submitted for review

#### Scenario: Specialization restricted to the defined list
- **WHEN** a doctor submits a specialization that is not in the application-defined list
- **THEN** the system rejects the submission with a validation error

### Requirement: Doctor approval lifecycle
Every doctor profile SHALL carry an approval state of pending, approved, or rejected. Only approved doctors SHALL appear in patient-facing browse, search, or matching results, and only approved doctors may receive bookings.

#### Scenario: Newly registered doctor is not yet listed
- **WHEN** a doctor registers and completes their profile but has not been approved
- **THEN** their profile does not appear in any patient-facing listing and no patient can book them

#### Scenario: Approved doctor becomes bookable
- **WHEN** an administrator approves a pending doctor profile
- **THEN** the doctor appears in patient-facing listings and may receive bookings

#### Scenario: Rejected doctor sees the outcome
- **WHEN** an administrator rejects a doctor profile with a reason
- **THEN** the doctor sees the rejected state and the reason on their own profile page, and remains unlisted

### Requirement: Patient-facing doctor browse
The system SHALL let an authenticated patient browse approved doctors, showing for each one their name, specializations, years of experience, consultation fee, a biography excerpt, and whether they have upcoming availability.

#### Scenario: Patient opens the directory
- **WHEN** an authenticated patient opens the doctor directory
- **THEN** the system lists approved doctors with name, specializations, experience, fee, and an availability indicator

#### Scenario: Directory is empty
- **WHEN** no approved doctors exist
- **THEN** the system displays an explanatory empty state rather than a blank list or an error

### Requirement: Doctor search and filtering
The system SHALL let a patient narrow the directory by free-text search across doctor name and specialization, by a specialization filter, and by whether the doctor has availability within the next seven days. Filters SHALL combine conjunctively.

#### Scenario: Search by name fragment
- **WHEN** a patient searches for a fragment of an approved doctor's name
- **THEN** the results contain that doctor and exclude doctors matching neither name nor specialization

#### Scenario: Filter by specialization
- **WHEN** a patient filters by the "Cardiology" specialization
- **THEN** every doctor in the results lists Cardiology among their specializations

#### Scenario: Combined filters yield nothing
- **WHEN** a patient applies a combination of filters that no approved doctor satisfies
- **THEN** the system shows an empty state inviting the patient to relax the filters, and returns no results

### Requirement: Doctor detail view
The system SHALL provide a detail view for an approved doctor showing the full biography, all specializations, experience, fee, and the doctor's next available consultation slots, with a direct path to booking.

#### Scenario: Patient opens a doctor's detail page
- **WHEN** a patient selects an approved doctor from the directory
- **THEN** the detail view renders the full profile and the next available slots, each of which can be selected to begin booking

#### Scenario: Patient opens an unapproved doctor's detail page directly
- **WHEN** a patient requests the detail view of a doctor who is not approved
- **THEN** the system responds as not-found and discloses no profile content

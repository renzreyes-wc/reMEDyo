# Spec Delta

## Purpose

Establishes who a user is and what they are allowed to do. Covers self-service registration for patients and doctors, pre-provisioned administrator access, session handling, account lifecycle states, and the role-based authorization enforced on every protected operation.

## ADDED Requirements

### Requirement: Email and password registration
The system SHALL allow visitors to register as either a patient or a doctor using an email address and a password, with credentials managed entirely by the application. Passwords MUST be stored only as a salted one-way hash and MUST NOT be recoverable or returned by any endpoint.

#### Scenario: Successful patient registration
- **WHEN** a visitor submits the patient registration form with a well-formed email not already registered and a password of at least eight characters
- **THEN** the system creates a patient account, establishes a session, and redirects to patient profile completion

#### Scenario: Successful doctor registration
- **WHEN** a visitor submits the doctor registration form with valid credentials and required professional details
- **THEN** the system creates a doctor account in a pending-approval state, establishes a session, and redirects to the doctor profile page

#### Scenario: Email already in use
- **WHEN** a visitor submits a registration form with an email that already belongs to an account
- **THEN** the system rejects the registration with a validation error and creates no account

#### Scenario: Weak password rejected
- **WHEN** a visitor submits a password shorter than eight characters
- **THEN** the system rejects the registration with a validation error naming the password requirement

### Requirement: Sign-in and session
The system SHALL authenticate users by email and password and issue a session credential that the browser transmits automatically on subsequent requests. The session credential MUST NOT be readable by client-side scripts and SHALL expire after a bounded lifetime.

#### Scenario: Valid credentials
- **WHEN** a user signs in with an email and password matching an active account
- **THEN** the system establishes a session and routes the user to the dashboard for their role

#### Scenario: Invalid credentials
- **WHEN** a user signs in with an unknown email or an incorrect password
- **THEN** the system rejects the attempt with a single generic failure message that does not reveal whether the email exists

#### Scenario: Sign out
- **WHEN** an authenticated user signs out
- **THEN** the session credential is invalidated and subsequent requests to protected resources are rejected as unauthenticated

### Requirement: Role-based authorization
Every account SHALL carry exactly one role of patient, doctor, or admin. The API SHALL enforce role and ownership rules server-side on every protected operation, independently of what the client interface offers.

#### Scenario: Patient attempts a doctor operation
- **WHEN** a signed-in patient issues a request to an endpoint restricted to doctors
- **THEN** the system rejects the request as forbidden and performs no state change

#### Scenario: Patient attempts to read another patient's data
- **WHEN** a signed-in patient requests a record belonging to a different patient
- **THEN** the system rejects the request as forbidden or not-found and discloses no content of the record

#### Scenario: Unauthenticated access to a protected route
- **WHEN** a request with no valid session reaches any protected endpoint
- **THEN** the system rejects it as unauthenticated

### Requirement: Pre-provisioned administrator access
The system SHALL provide administrator accounts only through pre-provisioning at deployment time. There MUST be no publicly reachable route, form, or endpoint by which a visitor can register an administrator account or by which a user can elevate their own role.

#### Scenario: Admin signs in
- **WHEN** the pre-provisioned administrator signs in with the seeded credentials
- **THEN** the system establishes a session with the admin role and routes to the admin console

#### Scenario: No public admin registration
- **WHEN** a visitor attempts to register with a request that specifies the admin role
- **THEN** the system ignores the requested role and creates a non-admin account, or rejects the request outright

### Requirement: Account lifecycle states
Each account SHALL have a status of active, suspended, or deactivated. Only active accounts may sign in or perform operations. Status changes SHALL record the acting administrator and an optional reason.

#### Scenario: Suspended user attempts to sign in
- **WHEN** a user whose account status is suspended submits correct credentials
- **THEN** the system refuses to establish a session and informs the user that the account is not active

#### Scenario: Session of a newly suspended user
- **WHEN** a user's account is suspended while they hold an active session
- **THEN** their next request to a protected endpoint is rejected and the session is treated as invalid

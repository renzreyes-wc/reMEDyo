# Spec Delta

## Purpose

The automated check on the system's behaviour: a suite that verifies the API's authorization and business rules against the application as it is really configured, runs on every proposed change without a manual step, and stops a change from being merged or deployed when it fails.

## ADDED Requirements

### Requirement: Automated checks cover the API's rules
The project SHALL maintain an automated test suite that verifies the API's authorization rules and its business rules, and the suite SHALL be runnable as a single command. The suite SHALL exercise the API through its HTTP interface against a running application and a real database, so that route handling, guards and persistence are covered rather than only the logic that can be extracted from them.

Coverage SHALL include, at minimum: which roles may call which routes; the ownership rules that decide whether a caller may act on a particular record; the booking rules that prevent two appointments holding the same slot; the rules governing joining and completing a consultation; and the rules deciding who may write a clinical note or issue a prescription.

#### Scenario: The whole suite runs from one command
- **WHEN** a developer runs the project's test command from a clean checkout with its dependencies installed
- **THEN** both the unit tests and the integration tests run, and the command reports a pass or fail for each

#### Scenario: Authorization rules are covered
- **WHEN** a request is made to a role-restricted or ownership-restricted route by a caller who is not permitted to make it
- **THEN** the suite verifies that the request is refused, and that the refusal does not disclose information the caller is not entitled to

#### Scenario: Business rules are covered
- **WHEN** an operation is attempted that a module's rules forbid — booking a slot that is already held, writing a note for a consultation the caller did not hold, joining a consultation that has been cancelled
- **THEN** the suite verifies that the operation is refused and that the refusal names the rule

#### Scenario: A regression is detected
- **WHEN** a change alters behaviour that the suite already asserts
- **THEN** at least one test fails, and the failure identifies the behaviour that changed

### Requirement: Checks exercise the application as it is deployed
The configuration under test SHALL be the configuration the application runs with. A test MUST NOT pass against an application whose global routing prefix, request validation, cookie handling or authorization guards differ from the deployed application's.

#### Scenario: Bootstrap configuration is shared with the tests
- **WHEN** the integration suite starts the application
- **THEN** it applies the same global configuration the production bootstrap applies, obtained from the same source rather than restated in the test

#### Scenario: A configuration change reaches the tests
- **WHEN** the application's global prefix, validation rules or guards are changed
- **THEN** the integration suite exercises the new configuration without the test being edited to match it

### Requirement: Checks run without a manual step
The suite SHALL run automatically on every proposed change to the repository and on every change to the default branch, without anyone invoking it by hand. A run's outcome SHALL be reported where the change is reviewed.

#### Scenario: A proposed change is checked
- **WHEN** a change is proposed for merge
- **THEN** the suite runs against it and its outcome is reported on that change

#### Scenario: The default branch is checked
- **WHEN** a commit lands on the default branch
- **THEN** the suite runs against that commit

#### Scenario: The suite needs no manual setup
- **WHEN** the suite runs in a clean environment
- **THEN** it provisions what it needs to run, including a database, without a preparatory step performed by a person

### Requirement: A failing check blocks integration
A change whose checks fail SHALL NOT be merged to the default branch. The check SHALL be required, so that a failing suite cannot be merged past.

#### Scenario: A failing change is not merged
- **WHEN** a proposed change causes a test to fail
- **THEN** the change cannot be merged to the default branch while that failure stands

#### Scenario: The requirement is enforced by the repository
- **WHEN** the check is required for the default branch
- **THEN** the repository refuses a merge whose check has not passed, rather than relying on the person merging to notice

### Requirement: A failing check blocks deployment
Deployment of the application SHALL require a passing test run. A deployment MUST NOT proceed while the checks for the revision being deployed are failing.

#### Scenario: A green revision deploys
- **WHEN** a revision whose checks have passed is deployed
- **THEN** the deployment proceeds

#### Scenario: A red revision does not deploy
- **WHEN** a revision's checks have failed
- **THEN** no deployment of that revision occurs

#### Scenario: Deployment does not bypass the check
- **WHEN** a deployment is started by hand for a revision whose checks failed
- **THEN** the deployment is refused rather than having its checks skipped

### Requirement: Checks are repeatable and isolated
A test's outcome SHALL NOT depend on the order in which tests run, on state left behind by a previous run, or on data another test created. Running the suite twice in succession SHALL produce the same result.

#### Scenario: A repeated run gives the same result
- **WHEN** the suite is run twice in succession against the same revision
- **THEN** both runs report the same outcome

#### Scenario: A single test can be run alone
- **WHEN** any single test is run on its own
- **THEN** it passes without another test having run first

#### Scenario: One failure does not cascade
- **WHEN** a test fails
- **THEN** the tests that follow it still run and report their own outcome

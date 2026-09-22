# Spec Delta

## Purpose

The public, unauthenticated face of reMEDyo. It explains what the service does, routes visitors into the right registration or sign-in path, and sets an honest expectation that this is a fictional prototype rather than a real clinical service.

## ADDED Requirements

### Requirement: Public landing page
The system SHALL serve a publicly accessible landing page at the site root that requires no authentication and communicates the value proposition, the core capabilities, and how the service works as a sequence of steps.

#### Scenario: Unauthenticated visitor arrives
- **WHEN** a visitor with no session requests the site root
- **THEN** the landing page renders with the value proposition, a how-it-works sequence, and the core capabilities, and no authentication redirect occurs

#### Scenario: Landing page on a narrow viewport
- **WHEN** the landing page is viewed at a viewport width of 375 pixels
- **THEN** all content remains readable in a single column with no horizontal page scrolling

### Requirement: Registration and sign-in entry points
The landing page SHALL provide distinct, clearly labelled routes to patient registration, doctor registration, and sign-in for existing users, reachable from both the page header and a primary call-to-action area.

#### Scenario: Visitor chooses to register as a patient
- **WHEN** a visitor activates the patient registration call to action
- **THEN** the system navigates to the patient registration form

#### Scenario: Visitor chooses to register as a doctor
- **WHEN** a visitor activates the doctor registration call to action
- **THEN** the system navigates to the doctor registration form

#### Scenario: Returning user signs in
- **WHEN** a visitor activates the sign-in link in the header
- **THEN** the system navigates to the sign-in form, which accepts any role

### Requirement: Prototype disclaimer and trust messaging
The system SHALL display a prototype disclaimer on the landing page stating that reMEDyo is a fictional demonstration, that all doctors and records are fabricated, and that it must not be used for real medical advice. Privacy and safety messaging SHALL be present on the same page.

#### Scenario: Disclaimer is visible without interaction
- **WHEN** the landing page renders
- **THEN** the fictional-prototype disclaimer is present in the page without requiring the visitor to expand, scroll past a fold, or dismiss anything

#### Scenario: Emergency guidance is stated
- **WHEN** a visitor reads the safety messaging
- **THEN** it directs anyone experiencing a medical emergency to contact local emergency services rather than using the application

### Requirement: Application-managed legal pages
The system SHALL serve terms of service and privacy policy pages from the application itself, linked from the landing page footer, with content stored in the application.

#### Scenario: Visitor opens the privacy policy
- **WHEN** a visitor follows the privacy link in the footer
- **THEN** a privacy policy page renders from the application, describing what prototype data is stored and that it is fictional

#### Scenario: Visitor opens the terms
- **WHEN** a visitor follows the terms link in the footer
- **THEN** a terms page renders from the application

### Requirement: Self-hosted content and assets
All landing page copy, icons, images, fonts, and other assets SHALL be served by the application. The system MUST NOT depend on an external content management system, analytics platform, form service, image host, or marketing platform at runtime.

#### Scenario: Landing page loads with no external network access
- **WHEN** the landing page is loaded in an environment with no outbound internet access
- **THEN** the page renders completely, with all text, icons, images, and fonts present

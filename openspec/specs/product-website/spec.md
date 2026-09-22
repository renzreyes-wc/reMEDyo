# Product Website Specification

## Purpose

The public, unauthenticated face of reMEDyo. It explains what the service does, routes visitors into the right registration or sign-in path, and sets an honest expectation that this is a fictional prototype rather than a real clinical service.

## Requirements

### Requirement: Public landing page
The system SHALL serve a publicly accessible landing page at the site root that requires no authentication and communicates the value proposition, the core capabilities, and how the service works as a sequence of steps.

Where the landing page shows example product output, it SHALL present that output as an illustration and MUST NOT describe it as personalised to the visitor. An unauthenticated visitor has no account, no intake and no matching results, so any label implying otherwise misrepresents what the service knows about them.

#### Scenario: Unauthenticated visitor arrives
- **WHEN** a visitor with no session requests the site root
- **THEN** the landing page renders with the value proposition, a how-it-works sequence, and the core capabilities, and no authentication redirect occurs

#### Scenario: Landing page on a narrow viewport
- **WHEN** the landing page is viewed at a viewport width of 375 pixels
- **THEN** all content remains readable in a single column with no horizontal page scrolling

#### Scenario: Example output is labelled as an example
- **WHEN** the landing page displays a sample list of suggested doctors
- **THEN** it is introduced with wording that frames it as what follows an intake, and is accompanied by a caption naming the example symptom the sample is based on

#### Scenario: Example output is not claimed to be personalised
- **WHEN** an unauthenticated visitor views any example product output on the landing page
- **THEN** no label, heading or caption states or implies that the output was generated for that visitor

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

Typefaces SHALL be resolved at build time and served from the application's own origin. Images the marketing pages display SHALL be served from the application's own static assets rather than fetched from an external host.

#### Scenario: Landing page loads with no external network access
- **WHEN** the landing page is loaded in an environment with no outbound internet access
- **THEN** the page renders completely, with all text, icons, images, and fonts present

#### Scenario: No runtime request to a font host
- **WHEN** the landing page is loaded and its network activity is observed
- **THEN** no request is made to an external font host, and every typeface the page renders is served from the application's own origin

#### Scenario: Declared typefaces actually render
- **WHEN** the landing page renders a heading and a paragraph
- **THEN** each is drawn in the typeface the design declares for it, rather than falling back to a generic system font because the declared family failed to resolve

#### Scenario: Marketing images come from the application
- **WHEN** the marketing pages display an image
- **THEN** that image is served from the application's own static assets, and no request is made to an external image host

### Requirement: Link preview and browser identity
The application SHALL provide a favicon and an Open Graph preview image from its own static assets, and SHALL declare both in the document metadata, so that a browser tab and a shared link both render with the product's identity rather than a blank placeholder.

#### Scenario: Browser tab shows the product icon
- **WHEN** any page of the application is open in a browser
- **THEN** the tab displays the application's favicon, served from the application's own assets

#### Scenario: Shared link renders a preview
- **WHEN** a link to the landing page is shared somewhere that renders Open Graph metadata
- **THEN** the preview shows the application's title, its description, and its Open Graph image

#### Scenario: Preview assets are self-hosted
- **WHEN** the favicon or the Open Graph image is requested
- **THEN** it is served by the application, with no request to an external host

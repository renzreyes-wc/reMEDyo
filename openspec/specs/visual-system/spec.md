# Visual System Specification

## Purpose

The presentation contract the whole interface answers to, public pages and signed-in screens alike: text must be legible against whatever it sits on, colours that carry a warning must mean only that, and the visual language must be expressed through named tokens so it can be reasoned about and changed in one place.

## Requirements

### Requirement: Text meets WCAG AA contrast on every surface
Every pair of text colour and the background it is rendered on SHALL meet WCAG 2.1 AA contrast: at least 4.5:1 for body text, and at least 3:1 for text at 24 pixels or larger. This applies across the public marketing pages, the authenticated shell, and the patient, doctor and administrator screens equally.

#### Scenario: Body text on the page ground
- **WHEN** body text is rendered on the application's canvas or on a raised surface
- **THEN** the contrast ratio between the text colour and that background is at least 4.5:1

#### Scenario: Large text
- **WHEN** text of 24 pixels or larger is rendered on any background
- **THEN** the contrast ratio between the text colour and that background is at least 3:1

#### Scenario: Text on a tinted panel
- **WHEN** text is rendered on a tinted panel such as an informational chip, a badge, or a highlighted callout
- **THEN** the contrast ratio between that text and the tint it sits on is at least 4.5:1, measured against the tint rather than against the page ground behind it

#### Scenario: Muted and secondary text
- **WHEN** secondary or de-emphasised text is rendered anywhere in the application
- **THEN** it still meets the ratio required for its size, so that de-emphasis is achieved by colour and weight within the accessible range rather than by dropping below it

### Requirement: Colours with a reserved meaning are not reused decoratively
The palette SHALL reserve its alert hue for safety and prototype notices only. A decorative hue SHALL NOT be used for any badge, chip, status indicator or other element a reader could interpret as conveying state, so that a decorative surface is never mistaken for a warning. A separate support hue SHALL carry ordinary informational elements so they do not borrow the alert hue.

#### Scenario: The alert hue signals only safety or prototype status
- **WHEN** the alert hue appears anywhere in the interface
- **THEN** it is carrying an emergency notice, a safety warning, a prototype disclaimer, or a non-dispensable prescription label — and nothing else

#### Scenario: Informational elements use the support hue
- **WHEN** an informational chip, a specialty tag, or a match explanation is rendered
- **THEN** it uses the support hue rather than the alert hue or the primary brand hue

#### Scenario: The decorative hue never indicates state
- **WHEN** the decorative hue is used
- **THEN** it appears only in illustrative or empty-state artwork, and never as the background or border of a badge, chip, or status indicator

#### Scenario: A reader can still tell states apart without colour
- **WHEN** an element communicates a state such as cancelled, completed, pending or urgent
- **THEN** its meaning is also carried in its text, so the state is not conveyed by colour alone

### Requirement: The interface is expressed through named semantic tokens
Colour, radius and elevation SHALL be applied through named tokens whose names describe their role rather than their appearance. Markup MUST NOT reach past those tokens for one-off values — including ad-hoc opacity applied to a palette step to approximate a colour that should be a token of its own.

#### Scenario: A role has a token
- **WHEN** a component needs a subtle border, a muted text colour, or a recessed surface
- **THEN** a named token exists for that role and the component uses it, rather than composing the value inline

#### Scenario: No ad-hoc opacity stands in for a token
- **WHEN** the interface renders any border, surface or text colour
- **THEN** that colour comes from a token, and not from a palette step with an opacity modifier applied to approximate one

#### Scenario: Elevation is a fixed set of steps
- **WHEN** a surface is raised above the page
- **THEN** it uses one of the defined elevation steps rather than an arbitrary shadow

#### Scenario: Changing a token changes every surface that uses it
- **WHEN** the value behind a semantic token is changed in one place
- **THEN** every surface that expresses that role changes with it, with no component retaining a hard-coded copy of the old value

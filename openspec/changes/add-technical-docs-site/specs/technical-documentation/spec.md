# Spec Delta

## Purpose

The technical account the system gives of itself: a published documentation site describing its context, architecture, modules and data model for a technical reader, and a machine-readable description of the API that the running application generates from its own code rather than from prose someone remembered to update.

## ADDED Requirements

### Requirement: Published technical documentation site
The system SHALL publish a technical documentation site at a stable public URL, built from sources held in this repository. The site SHALL be republished automatically whenever the default branch changes, without a manual publishing step.

#### Scenario: Site reachable
- **WHEN** a reader opens the published documentation URL
- **THEN** the site renders with navigation to every documented section, and no section links to a page that does not exist

#### Scenario: Republished on change
- **WHEN** a commit that changes documentation sources lands on the default branch
- **THEN** the published site reflects that change without anyone performing a manual deployment

#### Scenario: A failing build does not publish
- **WHEN** the documentation build fails, including when an internal link points at a page that does not exist
- **THEN** nothing is deployed and the previously published site remains intact and reachable

### Requirement: Documented architecture at every agreed level
The site SHALL describe the system at four levels: a technical overview covering the product's context and its features; a high-level architecture giving a system context view, a container view, a component view, and a deployment view; a detailed architecture covering every API module of the application; and a data model. Every module of the API SHALL appear in the detailed architecture, and the treatment of each MAY be proportional to that module's complexity.

#### Scenario: Architecture views present
- **WHEN** a reader opens the high-level architecture section
- **THEN** it presents a system context view, a container view, a component view, and a deployment view, each as a diagram with accompanying prose

#### Scenario: Every module documented
- **WHEN** a reader opens the detailed architecture section
- **THEN** every module of the API is covered, each with an overview, a container-level view, and the part of the data model it owns

#### Scenario: Deployment views match the supported shapes
- **WHEN** a reader opens the deployment view
- **THEN** it describes each deployment shape the repository actually supports, and does not describe a shape the repository cannot produce

#### Scenario: Data model documented
- **WHEN** a reader opens the data model section
- **THEN** every persisted entity and enumeration is described, together with its relations and the constraints the schema enforces

### Requirement: Diagrams are versioned text, not opaque images
Architecture diagrams SHALL be authored as text in version control and rendered by the site at build time. A diagram MUST NOT be committed only as a binary image, so that a diagram change is reviewable as a diff and cannot be edited by someone who lacks the original drawing file.

#### Scenario: Diagram source is reviewable
- **WHEN** a diagram changes
- **THEN** the change appears as a readable text diff in review

#### Scenario: Diagram renders in the published site
- **WHEN** a page containing a diagram is published
- **THEN** the diagram renders as a diagram rather than as its source text

### Requirement: The API describes itself in a machine-readable OpenAPI document
The API SHALL produce an OpenAPI description of itself, derived from the application's own routes, parameters and validation rules rather than maintained separately by hand. The description SHALL cover every route the application serves, and SHALL state for each route what it accepts, what it returns, and whether it requires an authenticated session.

#### Scenario: Description covers the whole API
- **WHEN** the OpenAPI description is produced
- **THEN** every route the application serves appears in it, and no route appears that the application does not serve

#### Scenario: Description follows the code
- **WHEN** a route, its request body, or its validation rules change
- **THEN** the OpenAPI description reflects the change without a separate document being edited by hand

#### Scenario: Authentication stated per route
- **WHEN** a reader inspects any route in the description
- **THEN** it states whether that route requires an authenticated session, and which roles may call it where the route is role-restricted

### Requirement: Interactive API documentation, and control over its exposure
The application SHALL be able to serve interactive API documentation from the generated description. Whether that route is served SHALL be governed by configuration, so that a deployment can offer it or withhold it without a code change. Serving the documentation MUST NOT alter authorization: the documented routes SHALL enforce exactly the rules they enforced before.

#### Scenario: Interactive documentation served
- **WHEN** the application runs with interactive API documentation enabled
- **THEN** the documentation route renders a browsable view of every documented route

#### Scenario: Withheld by configuration
- **WHEN** the application runs with interactive API documentation disabled
- **THEN** the documentation route is not served, and every other behaviour of the application is unchanged

#### Scenario: Documentation grants no access
- **WHEN** a request is issued against a protected route from the interactive documentation without a valid session
- **THEN** the request is refused exactly as it would be from any other client, and no data is disclosed

### Requirement: The API reference in the site is the generated description
The site's API reference SHALL be rendered from the generated OpenAPI description rather than transcribed into prose. A reference page MUST NOT state a route, parameter or response that the generated description does not contain.

#### Scenario: Reference derives from the description
- **WHEN** the site is built
- **THEN** its API reference is produced from the generated OpenAPI description as part of that build

#### Scenario: Reference cannot drift
- **WHEN** a route is added, changed or removed in the application
- **THEN** the next published site shows the route as it now is, with no separate prose to update

### Requirement: Documentation states the system's prototype status
The documentation SHALL state that reMEDyo is a fictional prototype and not a real clinical service, wherever a reader could otherwise mistake it for one. Documentation of the clinical surfaces — records, prescriptions and clinical assistance — MUST carry that statement rather than leaving it to the reader to infer.

#### Scenario: Prototype status on entry
- **WHEN** a reader opens the documentation site for the first time
- **THEN** the landing page states that the system is a fictional prototype and not for real medical use

#### Scenario: Clinical surfaces carry the statement
- **WHEN** a reader opens documentation describing records, prescriptions, or clinical assistance
- **THEN** that page states the prototype status rather than relying on the landing page alone

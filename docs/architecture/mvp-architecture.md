# MVP Architecture

## Architecture summary

Decision Brief Engine should start as a frontend-first MVP that proves the core decision-support workflow before adding durable persistence, integrations, collaboration, or enterprise infrastructure.

The MVP should use Vite, React, TypeScript, and Tailwind. shadcn/ui can be used where it speeds up implementation with accessible primitives, but it should not become a dependency on a large design system effort. A lightweight backend or serverless API should be introduced only if model calls cannot safely or practically happen from the client.

The product workflow is:

1. User pastes messy notes.
2. User selects a brief type.
3. System generates a structured Capture Layer.
4. System generates a Decision Brief from the Capture Layer.
5. User reviews and edits the output.
6. User exports Markdown.

## System shape

### Frontend application

The frontend owns the MVP user experience, local/session state, validation, rendering, review/edit surfaces, and Markdown export.

Recommended stack:

- Vite for project setup and local development.
- React for UI composition.
- TypeScript for typed state, data contracts, and prompt inputs/outputs.
- Tailwind for styling.
- shadcn/ui only for simple UI primitives if it is easy to add.

### Model call boundary

The MVP needs a boundary for AI model calls. Prefer the lightest implementation that protects secrets and keeps the product flow simple.

Acceptable MVP options:

- A minimal serverless API route for model calls.
- A small lightweight backend endpoint for model calls.
- A mocked model adapter during early UI implementation.

Do not add a broader backend platform, database, job system, queue, workflow engine, enterprise auth layer, or integration service for the MVP.

### State and persistence

Use in-memory React state or trivial browser/session state for the active brief session. The MVP does not require database persistence. Exported Markdown is the durable artifact.

## Core modules

### Input Workspace

Provides the text area or editor where the user pastes messy notes.

Responsibilities:

- Capture raw notes.
- Show input readiness.
- Preserve the pasted text for the active session.
- Pass raw input into Capture Layer generation.

### Brief Type Selector

Lets the user choose one MVP brief type before generation:

- Product Decision Brief.
- Strategy Decision Brief.
- Execution Decision Brief.

Responsibilities:

- Store the selected `BriefType`.
- Provide brief type context to the Capture Layer prompt.
- Keep the workflow explicit so the generated artifact has the right decision shape.

### Capture Layer Generator

Converts raw notes and selected brief type into structured Capture Layer JSON.

Responsibilities:

- Build the Capture Layer prompt input.
- Call the model adapter or API boundary.
- Parse and validate structured Capture Layer output.
- Surface missing context, ambiguity, confidence, and generation errors.

### Decision Brief Generator

Converts the structured Capture Layer into a Markdown Decision Brief.

Responsibilities:

- Build the brief generation prompt input from the Capture Layer.
- Keep final brief generation separate from Capture Layer generation.
- Produce Markdown suitable for review, editing, and export.
- Preserve traceability to the Capture Layer where useful.

### Review/Edit Surface

Lets the user inspect and adjust generated output before export.

Responsibilities:

- Show the generated Decision Brief.
- Allow lightweight editing.
- Optionally expose the Capture Layer for review.
- Preserve user edits in the active session.

### Markdown Export

Creates the durable artifact for the MVP.

Responsibilities:

- Export the reviewed Decision Brief as Markdown.
- Preserve useful headings and structure.
- Avoid requiring integrations with docs, wikis, or project-management tools.

## AI pipeline

The MVP AI pipeline is intentionally two-step:

1. Raw notes + selected brief type.
2. Capture Layer prompt.
3. Structured Capture Layer JSON.
4. Brief generation prompt.
5. Markdown Decision Brief.
6. User review/edit/export.

The Capture Layer and final Decision Brief should not be collapsed into one generation step. The Capture Layer is the intermediate representation that makes assumptions, ambiguity, traceability, and missing context visible before the final artifact is written.

## Prototype build order

1. Define TypeScript types for the conceptual data model.
2. Build the Input Workspace and Brief Type Selector with local/session state.
3. Add a mocked Capture Layer Generator using representative structured JSON.
4. Render the Capture Layer for review and debugging.
5. Add a mocked Decision Brief Generator that produces Markdown from the Capture Layer.
6. Build the Review/Edit Surface for the Markdown output.
7. Add Markdown export.
8. Replace mocked generation with the lightest safe model-call boundary.
9. Add basic error states for invalid input, model failure, malformed Capture Layer JSON, and empty output.
10. Add evaluation examples only after the core pipeline is usable.

## Explicit non-goals

- Authentication.
- Database persistence beyond trivial local/session state.
- Third-party integrations.
- Multi-user collaboration.
- Billing.
- Enterprise administration.
- Production deployment architecture.
- Queues, background agents, or complex workflow orchestration.
- Database-specific schema.

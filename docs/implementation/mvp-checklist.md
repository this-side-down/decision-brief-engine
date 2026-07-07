# MVP Implementation Checklist

## Documentation baseline

- [ ] Confirm README MVP workflow is still accurate.
- [ ] Confirm product spec scope and non-goals are understood.
- [ ] Confirm Capture Layer required fields are reflected in TypeScript types.
- [ ] Confirm brief type guidance covers Product, Strategy, and Execution Decision Briefs.
- [ ] Confirm architecture keeps Capture Layer JSON and Decision Brief Markdown separate.
- [ ] Confirm prompt contracts are provider-neutral.
- [ ] Confirm evaluation plan remains lightweight and manual for MVP.

## UI shell

- [ ] Scaffold Vite, React, TypeScript, and Tailwind.
- [ ] Add a single-screen MVP layout.
- [ ] Add basic accessible controls and responsive spacing.
- [ ] Avoid routing unless the MVP workflow needs it.
- [ ] Avoid auth, user settings, admin screens, and enterprise navigation.

## Input flow

- [ ] Add Input Workspace for pasted messy notes.
- [ ] Store raw notes in local/session state.
- [ ] Show empty-input validation.
- [ ] Preserve raw notes while the user reviews generated artifacts.
- [ ] Allow the user to edit notes before regeneration.

## Brief type selection

- [ ] Add Product Decision Brief option.
- [ ] Add Strategy Decision Brief option.
- [ ] Add Execution Decision Brief option.
- [ ] Require brief type selection before Capture Layer generation.
- [ ] Pass selected brief type into mocked and real adapter calls.

## Capture Layer generation

- [ ] Define `CaptureLayer` TypeScript type with all required fields.
- [ ] Define `BriefSession` state fields for generated Capture Layer JSON.
- [ ] Add Generate Capture Layer action.
- [ ] Use mocked adapter response first.
- [ ] Validate required Capture Layer fields.
- [ ] Keep Capture Layer JSON separate from Decision Brief Markdown.
- [ ] Handle generation failure and malformed JSON states.

## Capture Layer review/debug surface

- [ ] Render Capture Layer JSON or structured sections for review.
- [ ] Show confidence, missing context, open questions, assumptions, and risks clearly.
- [ ] Make stated decision and implied decision visible.
- [ ] Keep review/debug surface lightweight.
- [ ] Avoid turning Capture Layer review into a separate product workflow.

## Decision Brief generation

- [ ] Define `DecisionBrief` TypeScript type.
- [ ] Add Generate Decision Brief action after Capture Layer is available.
- [ ] Use Capture Layer JSON as the source of truth.
- [ ] Generate Markdown through mocked adapter first.
- [ ] Preserve selected brief type emphasis.
- [ ] Handle empty or failed Markdown generation.

## Review/edit/export

- [ ] Render Markdown Decision Brief for review.
- [ ] Allow lightweight user edits to Markdown.
- [ ] Preserve edited Markdown in local/session state.
- [ ] Export current Markdown via copy-to-clipboard or download-as-`.md`.
- [ ] Do not regenerate during export.
- [ ] Show export success and failure states.

## Model adapter and mocked generation

- [ ] Define provider-neutral model adapter interface.
- [ ] Add mocked adapter that returns fixture Capture Layer JSON.
- [ ] Add mocked adapter path for Markdown Decision Brief generation.
- [ ] Keep adapter inputs aligned with prompt contracts.
- [ ] Avoid provider-specific APIs, response formats, or hidden tooling assumptions.
- [ ] Add local/self-hosted FOSS-compatible inference only after UI pipeline works.

## Evaluation fixtures

- [ ] Add fixtures for Product prioritization meeting.
- [ ] Add fixtures for Strategy tradeoff discussion.
- [ ] Add fixtures for Execution planning disagreement.
- [ ] Add fixtures for Customer interview synthesis.
- [ ] Add fixtures for Ambiguous stakeholder conversation.
- [ ] Use fixtures for manual scoring after the core pipeline exists.
- [ ] Feed evaluation failures back into prompt or data contract docs.
- [ ] Do not add an automated eval runner for the MVP.

## FOSS/license checks

- [ ] Confirm runtime dependencies are free and open-source software.
- [ ] Confirm frontend framework, build tooling, styling, and any backend layer meet the FOSS-only constraint.
- [ ] Confirm AI engine, model runner, inference engine, and model meet the FOSS-only constraint before adoption.
- [ ] Review candidate model license before wiring real inference.
- [ ] Keep hosted proprietary model APIs out of the MVP path.
- [ ] Keep prompt/data contracts provider-neutral.

## Cleanup and readiness

- [ ] Remove unused scaffold code.
- [ ] Remove unused fixtures or demo-only state.
- [ ] Confirm no auth, database persistence, integrations, collaboration, billing, enterprise admin, queues, or background agents were added.
- [ ] Confirm Capture Layer generation and Decision Brief generation remain separate.
- [ ] Confirm Markdown export uses reviewed/edited Markdown.
- [ ] Run available lint, typecheck, and build commands.
- [ ] Manually evaluate MVP outputs against `docs/ai/evaluation-plan.md`.
- [ ] Confirm README navigation is updated in a later README task.

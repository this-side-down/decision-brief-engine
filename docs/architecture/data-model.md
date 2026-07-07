# Conceptual Data Model

## Purpose

This document defines a TypeScript-friendly conceptual data model for the Decision Brief Engine MVP.

It is not a database schema. The MVP can keep these entities in memory or trivial local/session state while the user creates, reviews, edits, and exports one Decision Brief.

## Entity overview

- `BriefSession`: The active end-to-end user session for one brief.
- `RawInput`: The messy notes pasted by the user.
- `BriefType`: The selected decision brief type.
- `CaptureLayer`: The structured intermediate representation generated from raw notes.
- `DecisionBrief`: The Markdown artifact generated from the Capture Layer and edited by the user.
- `EvaluationCase`: A lightweight example case for later output-quality review.

## BriefSession

Represents one active MVP workflow from raw notes through Markdown export.

Conceptual fields:

- `id`: Client-generated identifier for local/session use.
- `rawInput`: The `RawInput` for the session.
- `briefType`: The selected `BriefType`.
- `captureLayer`: The generated `CaptureLayer`, if available.
- `decisionBrief`: The generated and edited `DecisionBrief`, if available.
- `status`: Current workflow state, such as `draft`, `generating_capture`, `capture_ready`, `generating_brief`, `brief_ready`, or `exported`.
- `errors`: Recoverable generation, parsing, or validation errors.
- `createdAt`: Client timestamp for the active session.
- `updatedAt`: Client timestamp for the latest local change.

Notes:

- `BriefSession` coordinates the UI flow.
- It should not imply account ownership, collaboration, or persistence.

## RawInput

Represents the messy source material pasted by the user.

Conceptual fields:

- `text`: The pasted notes.
- `sourceLabel`: Optional user-facing label, such as "Planning notes" or "Customer call notes".
- `createdAt`: Client timestamp for when the input was captured.

Notes:

- Raw input is the source for Capture Layer generation.
- The MVP should preserve the raw text during the active session so the user can revise and regenerate.

## BriefType

Represents the selected MVP brief type.

Allowed values:

- `product`
- `strategy`
- `execution`

Conceptual fields:

- `id`: Stable type identifier.
- `name`: User-facing name, such as "Product Decision Brief".
- `description`: Short explanation of when to use the type.
- `outputEmphasis`: Short list of sections or qualities the final brief should emphasize.

Notes:

- Brief type selection happens before Capture Layer generation.
- The selected type shapes both the Capture Layer prompt and the final Decision Brief prompt.

## CaptureLayer

Represents the structured intermediate decision record generated from raw notes and brief type.

Conceptual fields:

- `source_summary`
- `decision_context`
- `stated_decision`
- `implied_decision`
- `goals`
- `stakeholders`
- `options_considered`
- `constraints`
- `risks`
- `assumptions`
- `evidence`
- `open_questions`
- `tensions`
- `recommendation_candidate`
- `confidence`
- `missing_context`
- `suggested_next_steps`

Notes:

- The Capture Layer is distinct from the final Decision Brief.
- It should separate stated facts from inference.
- It should preserve ambiguity, identify missing context, and support traceability back to the raw source material.
- It should remain structured JSON so it can be validated before brief generation.

## DecisionBrief

Represents the final Markdown artifact generated from the Capture Layer and reviewed or edited by the user.

Conceptual fields:

- `markdown`: Current Markdown content.
- `generatedFromCaptureLayer`: Identifier or reference to the Capture Layer used for generation.
- `briefType`: The selected `BriefType`.
- `editedByUser`: Boolean indicating whether the user changed the generated content.
- `createdAt`: Client timestamp for generation.
- `updatedAt`: Client timestamp for latest edit.

Notes:

- The Decision Brief is the user-facing artifact.
- Markdown export should use the current `markdown` value after review/edit.
- The final brief should not invent unsupported facts; it should remain grounded in the Capture Layer.

## EvaluationCase

Represents a lightweight test case for later manual or automated evaluation.

Conceptual fields:

- `id`: Stable case identifier.
- `name`: Human-readable case name.
- `rawInput`: Example messy notes.
- `briefType`: Target `BriefType`.
- `expectedQualities`: Qualities the generated output should demonstrate.
- `knownRisks`: Risks to watch for, such as hallucination, weak recommendation, or missing tradeoffs.

Notes:

- Evaluation cases are not required for the first UI shell.
- They are useful once Capture Layer and Decision Brief generation are implemented.
- They should stay independent of any specific model provider.

## Relationships

- A `BriefSession` has one `RawInput`.
- A `BriefSession` has one selected `BriefType`.
- A `BriefSession` may have one generated `CaptureLayer`.
- A `BriefSession` may have one generated and edited `DecisionBrief`.
- A `DecisionBrief` is generated from one `CaptureLayer`.
- An `EvaluationCase` contains example `RawInput` and a target `BriefType`.

## MVP constraints

- No database-specific schema.
- No authentication model.
- No workspace, organization, role, or permission model.
- No integration objects.
- No collaboration model.
- No billing or enterprise administration entities.

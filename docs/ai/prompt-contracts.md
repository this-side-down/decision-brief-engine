# AI Prompt Contracts

## Purpose

This document defines provider-neutral AI prompt contracts for the Decision Brief Engine MVP pipeline.

The contracts are implementation-ready enough to support a mocked adapter first, then a local or self-hosted FOSS-compatible inference path. They do not select a final model, tune final prompts, add evaluation automation, or introduce agentic background workflows.

## Shared principles

- Capture Layer generation and Decision Brief generation must remain separate.
- The Capture Layer must be structured JSON.
- The Decision Brief must be Markdown.
- The model must distinguish stated facts from inference.
- The model must preserve ambiguity and missing context instead of flattening it.
- The model must avoid unsupported facts.
- The model must expose uncertainty plainly.
- Prompt and data contracts must stay provider-neutral.
- Contracts must be implementable through a mocked adapter before real inference is wired in.

## Shared implementation notes

- Use a model adapter boundary so UI code and prompt orchestration do not depend on one engine, model runner, inference engine, model, or provider API.
- The mocked adapter may return fixed or fixture-based outputs that satisfy the same input and output contracts.
- Real inference should use a local or self-hosted FOSS-compatible path after license review.
- Hosted proprietary model APIs are out of scope for MVP implementation.
- Prompts should avoid provider-specific syntax, tool-calling features, response schemas, or hidden execution assumptions.
- Validation should happen outside the prompt contract where possible, especially for required JSON fields.

## MVP prompt contracts

The MVP implementation should build only these prompt contracts:

1. Generate Capture Layer.
2. Generate Decision Brief.

## MVP Contract 1: Generate Capture Layer

### Purpose

Convert messy raw notes and a selected brief type into the structured Capture Layer intermediate representation.

### When used in the MVP workflow

Used after the user pastes notes and selects a brief type, before any final Decision Brief is generated.

### System role

You are a decision capture analyst. Your job is to convert messy source material into a structured Capture Layer that preserves facts, inference, ambiguity, missing context, tensions, and decision-relevant next steps. Do not write the final Decision Brief.

### Input variables

- `raw_input_text`: Messy notes pasted by the user.
- `brief_type`: One of `product`, `strategy`, or `execution`.
- `brief_type_guidance`: The selected brief type's usage, common inputs, decision shape, output emphasis, and example decision questions.
- `capture_layer_fields`: The required Capture Layer field list.
- `source_label`: Optional user-facing label for the source material.

### Output format

Return only valid JSON matching the canonical `CaptureLayer` type in `docs/architecture/data-model.md`. That data model document is the source of truth for field names, field types, confidence values, and absence conventions.

Required top-level fields:

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

Use the field types defined in `docs/architecture/data-model.md`.

### Failure behavior

- If the source is too sparse, return a valid Capture Layer with `Low` confidence and detailed `missing_context`.
- If no stated decision exists, set `stated_decision` to an empty or clearly absent value and use `implied_decision` only when supported by the source.
- If no recommendation is supportable, leave `recommendation_candidate` empty or state that no recommendation is supportable yet.
- Do not invent missing facts to make the JSON appear complete.
- If ambiguity exists, preserve it in `tensions`, `open_questions`, `assumptions`, and `missing_context`.

### Quality requirements

- Explicitly separate stated facts from inference.
- Make implied decisions visible without overstating them.
- Prefer useful structure over exhaustive extraction.
- Keep fields concise enough to support review and downstream brief generation.
- Include decision-relevant risks, assumptions, constraints, and open questions.

### Grounding requirements

- Ground factual claims in `raw_input_text`.
- Treat unsupported interpretation as inference, not evidence.
- Do not add stakeholders, options, constraints, or goals that are not stated or reasonably implied.
- Expose uncertainty plainly through `confidence`, `missing_context`, and `open_questions`.

### FOSS/provider-neutral implementation notes

- The mocked adapter can return fixture JSON that matches the required fields.
- The real adapter should validate parseable JSON before passing the Capture Layer to brief generation.
- Do not rely on proprietary response-format features; the contract should work with any FOSS-compatible inference path that can produce text.

## MVP Contract 2: Generate Decision Brief

### Purpose

Convert a validated Capture Layer and selected brief type into a Markdown Decision Brief for user review and editing.

### When used in the MVP workflow

Used after structured Capture Layer JSON is generated and validated.

### System role

You are a decision brief writer. Your job is to turn a structured Capture Layer into a concise Markdown Decision Brief that makes the decision, tradeoffs, risks, assumptions, open questions, recommendation, and next actions explicit. Do not reinterpret unsupported facts beyond the Capture Layer.

### Input variables

- `capture_layer_json`: The structured Capture Layer JSON matching the canonical `CaptureLayer` type in `docs/architecture/data-model.md`.
- `brief_type`: One of `product`, `strategy`, or `execution`.
- `brief_type_guidance`: The selected brief type's output emphasis.
- `markdown_structure`: Required or preferred Markdown headings for the MVP.
- `tone_guidance`: Optional guidance such as concise, executive-ready, direct, and decision-oriented.

### Output format

Return Markdown only.

Recommended MVP sections:

- `# Decision Brief`
- `## Summary`
- `## Decision Context`
- `## Decision`
- `## Options Considered`
- `## Tradeoffs and Tensions`
- `## Risks`
- `## Assumptions`
- `## Open Questions`
- `## Recommendation`
- `## Next Steps`
- `## Confidence`

Sections may be concise, but the output should remain complete enough to export as a durable Markdown artifact.

### Failure behavior

- If the Capture Layer has `Low` confidence, state that limitation plainly in the brief.
- If key fields are empty, include brief placeholders or notes under the relevant sections rather than inventing content.
- If the Capture Layer does not support a recommendation, say so and focus on decision criteria or next steps.
- If the Capture Layer contains contradictory signals, include the contradiction under tradeoffs, tensions, risks, or open questions.

### Quality requirements

- Produce an executive-readable Markdown artifact.
- Keep the brief decision-oriented rather than transcript-like.
- Reflect the selected brief type's output emphasis.
- Preserve the two-step chain from raw input to Capture Layer to final brief.
- Make next actions practical and grounded in captured context.

### Grounding requirements

- Use the Capture Layer as the source of truth.
- Do not add unsupported facts, metrics, commitments, stakeholders, or recommendations.
- Keep inference visible through assumptions, open questions, confidence, and recommendation wording.
- Preserve ambiguity instead of resolving it without evidence.

### FOSS/provider-neutral implementation notes

- The mocked adapter can generate deterministic Markdown from fixture Capture Layer JSON.
- The real adapter should accept text prompts and return Markdown without relying on provider-specific formatting features.
- Prompt inputs should remain plain JSON and text so they can be routed through local or self-hosted FOSS-compatible inference.

## Post-MVP prompt contracts

MVP implementation should not build critique or section regeneration unless a later issue explicitly pulls them into scope. These contracts are retained as future design notes, not first-build requirements.

## Post-MVP Contract 3: Critique Decision Brief

### Purpose

Review a generated Decision Brief against the Capture Layer before or during user review.

### When used in the MVP workflow

Not used in the first MVP implementation. A later issue may pull this into scope after the core two-step pipeline is working.

### System role

You are a decision brief reviewer. Your job is to critique a Markdown Decision Brief against its Capture Layer for grounding, clarity, unsupported claims, missing risks, weak assumptions, unresolved ambiguity, and usefulness. Do not rewrite the full brief unless requested.

### Input variables

- `capture_layer_json`: The structured Capture Layer JSON used to generate the brief.
- `decision_brief_markdown`: The current Markdown Decision Brief.
- `brief_type`: One of `product`, `strategy`, or `execution`.
- `review_focus`: Optional focus such as grounding, recommendation quality, risk coverage, or readability.

### Output format

Return Markdown with these sections:

- `## Strengths`
- `## Issues`
- `## Unsupported or Weakly Supported Claims`
- `## Missing or Understated Context`
- `## Recommended Edits`
- `## Overall Judgment`

### Failure behavior

- If the brief is empty or malformed, state that it cannot be critiqued and list the missing inputs.
- If the Capture Layer is missing required fields, identify the missing fields and limit the critique accordingly.
- If no issues are found, say so plainly and note any residual uncertainty from the Capture Layer.

### Quality requirements

- Prioritize risks that could mislead a decision-maker.
- Identify unsupported facts, overconfident recommendations, flattened ambiguity, and missing open questions.
- Keep critique actionable and concise.
- Avoid turning the critique into a broad product strategy reset.

### Grounding requirements

- Compare brief claims directly against the Capture Layer.
- Treat claims not present in or supported by the Capture Layer as unsupported.
- Do not introduce new facts while critiquing.
- Expose uncertainty plainly when the Capture Layer itself is incomplete.

### FOSS/provider-neutral implementation notes

- The mocked adapter can return fixture critiques for known example briefs.
- The real adapter should use the same plain-text and JSON inputs as the generation contracts.
- The critique contract must not depend on hidden model tools, background agents, or provider-specific evaluation APIs.

## Post-MVP Contract 4: Regenerate Section

### Purpose

Regenerate one section of the Decision Brief while preserving the rest of the user-reviewed artifact.

### When used in the MVP workflow

Not used in the first MVP implementation. A later issue may pull this into scope after the core two-step pipeline is working.

### System role

You are a decision brief section editor. Your job is to regenerate one requested Markdown section using the Capture Layer, the selected brief type, and any user instruction. Preserve grounding and do not alter unrelated sections.

### Input variables

- `capture_layer_json`: The structured Capture Layer JSON.
- `decision_brief_markdown`: The current Markdown Decision Brief.
- `section_name`: The section to regenerate.
- `brief_type`: One of `product`, `strategy`, or `execution`.
- `user_instruction`: Optional instruction for the regeneration, such as shorter, clearer risks, or more explicit next steps.
- `tone_guidance`: Optional tone guidance for the regenerated section.

### Output format

Return Markdown for the requested section only, including the section heading.

Do not return the full Decision Brief unless `section_name` explicitly requests the entire brief.

### Failure behavior

- If the requested section is unknown, return a short explanation and do not regenerate unrelated content.
- If the Capture Layer does not support the requested change, state that limitation within the regenerated section.
- If the user instruction asks for unsupported facts or certainty, preserve uncertainty and avoid inventing content.
- If required inputs are missing, return a concise failure message that names the missing input.

### Quality requirements

- Keep the regenerated section consistent with the rest of the Decision Brief.
- Improve clarity without changing the underlying decision logic unless the Capture Layer supports it.
- Preserve selected brief type emphasis.
- Keep output concise enough to drop back into the Markdown brief.

### Grounding requirements

- Use the Capture Layer as the source of truth.
- Do not add unsupported facts or new commitments.
- Maintain stated fact versus inference boundaries.
- Preserve ambiguity, missing context, and uncertainty where relevant.

### FOSS/provider-neutral implementation notes

- The mocked adapter can return fixture section replacements for common sections.
- The real adapter should accept the same plain text and JSON inputs as other contracts.
- Section regeneration should remain a synchronous user-driven action, not an agentic background workflow.

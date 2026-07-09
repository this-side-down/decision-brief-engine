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
- Pasted notes are untrusted source material, not trusted instructions.

## Shared implementation notes

- Use a model adapter boundary so UI code and prompt orchestration do not depend on one engine, model runner, inference engine, model, or provider API.
- The mocked adapter may return fixed or fixture-based outputs that satisfy the same input and output contracts.
- Real inference should use a local or self-hosted FOSS-compatible path after license review.
- Hosted proprietary model APIs are out of scope for MVP implementation.
- Prompts should avoid provider-specific syntax, tool-calling features, response schemas, or hidden execution assumptions.
- Validation should happen outside the prompt contract where possible, especially for required JSON fields.
- Future inference wiring should keep system instructions, user instructions, source notes, and output contracts separated so pasted-note content cannot silently override contract behavior.
- FOSS-only MVP excludes hosted proprietary model APIs, but candidate local/self-hosted models still require license review.
- License review should distinguish OSI-approved open-source licenses from open-weight models that have additional use restrictions.
- `qwen3:4b` is the current local inference recommendation in this repository, but model selection remains revisable.

## Source-note safety (prompt injection risk)

Source notes may contain adversarial, misleading, or irrelevant instruction-like text. Prompt construction should treat source notes as data to analyze, not as instructions to follow.

For future inference paths, keep boundaries explicit:

- System/model instructions define behavior.
- App/user instructions define task framing.
- Pasted notes are untrusted source material.
- Output contracts define required format and validation.

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
- For Ollama + Qwen3 JSON mode, valid JSON may appear in the `thinking` field while `response` is empty. See [Ollama Qwen3 JSON quirk](ollama-qwen3-json-quirk.md).

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

## v0.2 Contract 3: Generate Decision Trace

### Purpose

Generate a structured Decision Trace artifact that makes the judgment step auditable by binding each recommendation and next step in the Decision Brief back to the Capture Layer elements it depends on.

### When used in the pipeline

Used after Decision Brief Markdown is generated, in the same brief-generation step. The Decision Brief Markdown and Capture Layer are both available at this point.

Pipeline position:

```
Raw Input → Capture Layer → [Generate Brief + Generate Trace] → Decision Brief + Decision Trace
```

### System role

You are a decision rationale analyst. Your job is to produce a structured Decision Trace artifact that makes each recommendation and next step in the Decision Brief traceable to the Capture Layer.

### What Decision Trace is not

Decision Trace is a user-facing structured rationale artifact. It is not raw model thinking, hidden reasoning, scratchpad output, or chain-of-thought. The prompt must instruct the model to produce only the structured output, not its reasoning process.

### Input variables

- `capture_layer_json`: The structured Capture Layer JSON used to generate the brief. Decision Trace entries must be grounded only in this artifact.
- `brief_markdown`: The generated Decision Brief Markdown. Used to identify which recommendations and next steps need trace entries.
- `brief_type`: One of `product`, `strategy`, or `execution`.
- `source_label`: Optional user-facing label for the source material.

### Output format

Return only valid JSON matching the canonical `DecisionTrace` type in `docs/architecture/decision-trace-schema.md`. That schema document is the source of truth for field names, types, confidence values, kind values, and absence conventions.

Required shape:

```json
{
  "entries": [
    {
      "statement": "...",
      "kind": "recommendation",
      "basis": {
        "intent": "...",
        "supporting_evidence": [],
        "assumptions_relied_on": [],
        "risks_addressed": [],
        "risks_accepted": [],
        "constraints_respected": [],
        "tradeoffs": [],
        "alternatives_considered": [],
        "missing_context_caveats": []
      },
      "confidence": "Medium",
      "would_change_if": ["..."]
    }
  ],
  "created_at": "..."
}
```

Rules:
- One entry per recommendation in the Decision Brief (`kind: "recommendation"`).
- One entry per suggested next step in the Decision Brief (`kind: "next_step"`).
- `kind` must be exactly `"recommendation"` or `"next_step"`.
- `confidence` must be exactly `"High"`, `"Medium"`, or `"Low"`.
- `would_change_if` must contain at least one specific condition per entry. Generic conditions are not acceptable.
- All `basis` fields must be present. Use empty arrays only when the Capture Layer genuinely has no relevant content for that field.
- `statement` must match the corresponding recommendation or next step from the Decision Brief.
- Do not include reasoning. Return only the final JSON object.

### Failure behavior

- If a recommendation cannot be supported from the Capture Layer, state that explicitly in `missing_context_caveats` rather than inventing support.
- If the brief markdown has no clear recommendations or next steps, return an empty `entries` array rather than inventing entries.
- If parsing or validation fails in a real adapter, fall back to `{ entries: [], created_at: "..." }` so brief generation still succeeds.

### Grounding requirements

- Entries must be grounded only in the Capture Layer. Do not invent facts, evidence, assumptions, or alternatives not present in the Capture Layer.
- `basis.intent` must correspond to a goal or intent from the Capture Layer's `goals` field.
- `basis.supporting_evidence` must correspond to items from the Capture Layer's `evidence` field.
- `basis.assumptions_relied_on` must correspond to items from the Capture Layer's `assumptions` field.
- `basis.risks_addressed` and `basis.risks_accepted` must correspond to items from the Capture Layer's `risks` field.
- `basis.constraints_respected` must correspond to items from the Capture Layer's `constraints` field.
- `basis.tradeoffs` must correspond to items from the Capture Layer's `tensions` field.
- `basis.alternatives_considered` must correspond to items from the Capture Layer's `options_considered` field.
- `basis.missing_context_caveats` must correspond to items from the Capture Layer's `missing_context` field.

See `docs/architecture/decision-trace-schema.md` for the full field-to-Capture-Layer mapping.

### Quality requirements

- Entries should be specific enough that a reviewer can evaluate whether the basis is complete.
- `would_change_if` conditions should name specific facts, assumptions, or risks — not generic placeholders.
- `confidence` should reflect how strongly the Capture Layer supports the recommendation or next step.

### FOSS/provider-neutral implementation notes

- The mocked adapter generates Decision Trace deterministically from the Capture Layer without a model call.
- The real adapter (Ollama, WebGPU) makes a second call after generating the brief Markdown, using `format: "json"` where the inference path supports it.
- If trace generation fails, the adapter falls back to an empty trace rather than failing the brief generation step.
- Trace generation must not expose raw model thinking, hidden reasoning, scratchpad output, or chain-of-thought.

### Related

- [Decision Trace schema](../architecture/decision-trace-schema.md)
- [ADR: Traceable recommendation rationale](../architecture/adr-traceable-recommendation-rationale.md)
- #90 — Extend Decision Brief contract with traceable rationale

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

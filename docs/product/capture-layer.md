# Capture Layer Contract

## Purpose

The Capture Layer is the core intermediate representation for Decision Brief Engine.

It turns messy source material into a structured decision record before any final Decision Brief is written. Its job is to preserve the decision context, expose ambiguity, identify missing context, and make the reasoning traceable enough that the final brief can be reviewed rather than blindly accepted.

The Capture Layer is not the final Decision Brief. It is a working representation of what the system understood from the source material. The final Decision Brief should use it to produce an executive-ready artifact with clearer narrative, recommendation structure, and next actions.

## Required fields

Every MVP Capture Layer must include these fields:

- `source_summary`: Concise summary of the messy input and its apparent subject.
- `decision_context`: Background needed to understand why the decision matters now.
- `stated_decision`: Any decision explicitly stated in the source material.
- `implied_decision`: Any decision implied by the discussion, even if not stated directly.
- `goals`: Desired outcomes, business objectives, user outcomes, or success measures.
- `stakeholders`: People, teams, customers, operators, executives, or other parties affected by the decision.
- `options_considered`: Options, paths, proposals, or alternatives mentioned or implied.
- `constraints`: Known limits such as timing, budget, technical limits, organizational capacity, dependencies, policies, or market conditions.
- `risks`: Potential downsides, failure modes, or adverse consequences.
- `assumptions`: Beliefs treated as true but not proven by the source material.
- `evidence`: Supporting facts, signals, examples, data points, quotes, or observations from the source material.
- `open_questions`: Questions that remain unresolved and could materially affect the decision.
- `tensions`: Tradeoffs, conflicts, disagreements, or competing priorities.
- `recommendation_candidate`: A tentative recommendation suggested by the captured material, if supportable.
- `confidence`: A qualitative confidence level for the Capture Layer based on source clarity and completeness.
- `missing_context`: Important information that appears absent, under-specified, or needed before acting.
- `suggested_next_steps`: Practical follow-up actions to resolve ambiguity, validate assumptions, or move the decision forward.

## Field guidance

### Facts and evidence

Facts should be tied to the source material. Evidence may include direct statements, concrete observations, cited metrics, user feedback, operational constraints, or examples. If a claim is inferred rather than stated, it should not be presented as evidence.

### Inference

Inferences are allowed when they are useful, but they must remain visible. Use `implied_decision`, `assumptions`, `tensions`, `recommendation_candidate`, and `missing_context` to separate interpretation from stated facts.

### Ambiguity

Ambiguity should be preserved instead of flattened. When the source material supports multiple interpretations, the Capture Layer should name them rather than forcing false certainty.

### Traceability

The final Decision Brief must be traceable back to the Capture Layer, and the Capture Layer must be traceable back to the messy input. The MVP does not require line-level citations, but claims in the Capture Layer should be grounded in source material or clearly labeled as inference.

## Principles

- Separate stated facts from inference.
- Preserve ambiguity instead of flattening it.
- Make implied decisions visible.
- Identify missing context.
- Support traceability from final brief back to messy source material.
- Prefer usefulness over completeness.

## Confidence

`confidence` should describe how reliable the Capture Layer is as a basis for drafting the final Decision Brief.

Suggested MVP values:

- `High`: Source material is clear, decision context is specific, and key tradeoffs are represented.
- `Medium`: Source material is usable but has notable gaps, ambiguity, or unstated assumptions.
- `Low`: Source material is sparse, contradictory, or missing critical decision context.

Confidence is not a prediction that the recommendation is correct. It is a judgment about whether the captured context is sufficient to support a useful brief.

## MVP usage

In the MVP workflow:

1. The user pastes messy notes.
2. The user selects a brief type.
3. The system generates a Capture Layer from the notes and brief type.
4. The system generates a Decision Brief from the Capture Layer.
5. The user reviews and edits the output.
6. The user exports Markdown.

The Capture Layer should be structured enough for architecture, prompt contracts, implementation, and evaluation artifacts to use consistently without introducing database schema or provider-specific prompt details.

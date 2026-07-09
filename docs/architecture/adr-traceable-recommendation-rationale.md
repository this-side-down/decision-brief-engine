# ADR: Traceable recommendation rationale without exposing chain-of-thought

## Status

Proposed

## Context

Decision Brief Engine v0.1.0 makes the system's understanding auditable through the Capture Layer.

The next transparency gap is the judgment step. Recommendations and next steps need a user-facing rationale that shows how they trace back to captured intent, evidence, assumptions, risks, constraints, alternatives, and missing context.

## Decision

Decision Brief Engine should add a structured Decision Trace artifact in a future v0.2 iteration.

Decision Trace is a user-facing contract output. It binds each recommendation and next step to the Capture Layer elements it depends on, assigns per-item confidence, and states what would change the recommendation.

## Non-decision

Decision Trace is not raw model thinking.

Decision Trace is not hidden reasoning.

Decision Trace is not scratchpad output.

Decision Trace is not chain-of-thought.

Decision Trace is not a graph UI, scoring matrix, or argument tree.

## Consequences

The product can make both understanding and judgment auditable.

Capture Layer remains the artifact for what the system understood.

Decision Trace becomes the artifact for why a recommendation follows.

Decision Brief remains the readable user-facing output.

Future fixtures, evals, UI, and exports need to account for Decision Trace.

## Related issues

- #88 — Define v0.2 Decision Trace direction
- #89 — Add Decision Trace schema and ADR
- #90 — Extend Decision Brief contract with traceable rationale
- #91 — Add Decision Trace fixtures and eval gates
- #92 — Render recommendation basis in Decision Brief UI
- #93 — Include Decision Trace in Markdown export

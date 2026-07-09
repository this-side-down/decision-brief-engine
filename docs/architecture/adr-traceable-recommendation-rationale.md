# ADR: Traceable recommendation rationale without exposing chain-of-thought

## Status

Accepted

## Context

Decision Brief Engine v0.1.0 makes the system's understanding auditable through the Capture Layer. The Capture Layer is a structured, user-facing artifact that shows what the system understood from the raw input: goals, constraints, risks, assumptions, evidence, tensions, and missing context.

The next transparency gap is the judgment step. The Decision Brief currently presents recommendations and suggested next steps, but those judgments are not yet traceably linked to the Capture Layer. A reviewer cannot see why a recommendation follows from the captured context, what it depends on, how confident the system is per item, or what would change it.

The v0.2 direction is:

```
Raw Input → Capture Layer → Decision Trace → Decision Brief
```

This ADR records the decision to introduce a structured Decision Trace artifact to close the recommendation transparency gap.

## Decision

Decision Brief Engine will add a structured Decision Trace artifact in v0.2.

Decision Trace is a user-facing contract output. It binds each recommendation and next step to the Capture Layer elements it depends on — intent served, supporting evidence, assumptions relied on, risks addressed, risks accepted, constraints respected, tradeoffs, alternatives considered, and missing-context caveats. It assigns per-item confidence and states what conditions would change the recommendation.

Decision Trace is generated from the Capture Layer. Its output is the basis for the Decision Brief's recommendation and next-step content.

The complete schema is documented in [docs/architecture/decision-trace-schema.md](decision-trace-schema.md).

## What Decision Trace is not

This section is part of the decision. Constraints on what Decision Trace must not become are as important as the positive definition.

**Decision Trace is not raw model thinking.**

The model may reason privately before producing output. That reasoning is not part of the Decision Trace contract. Decision Trace is the structured output produced after reasoning is complete.

**Decision Trace is not hidden reasoning.**

Intermediate reasoning steps inside the model are not exposed through Decision Trace. Decision Trace exposes structured rationale that a reviewer can evaluate, not the process by which the model arrived at it.

**Decision Trace is not scratchpad output.**

Any scratchpad or draft that the model uses internally is not part of Decision Trace.

**Decision Trace is not chain-of-thought.**

Chain-of-thought is a generation technique. Decision Trace is a product artifact. The two are distinct. Exposing chain-of-thought as a user-facing feature is a different — and intentionally avoided — product direction.

**Decision Trace is not a graph UI, scoring matrix, or argument tree.**

Decision Trace is a flat, structured list of entries, one per recommendation or next step. It is not a visualization layer or a weighted scoring system.

**The goal is structured rationale, not disclosure of private reasoning.**

A Decision Trace entry should read like an explicit, attributable rationale statement: this recommendation follows from these captured elements, depends on these assumptions, accepts these risks, and would change under these conditions. A reviewer should be able to evaluate each entry without access to the model's internal process.

## Rationale

The Capture Layer made understanding auditable. The gap it did not close is the judgment step: how the system moved from captured context to a recommendation. Without Decision Trace, a reviewer must accept or reject recommendations without a structured basis for either.

Structured rationale is the right tool for this gap because:

- It keeps the artifact human-readable and evaluatable without exposing model internals.
- It is fixture-friendly, which means it can be validated in eval gates.
- It is grounded in the Capture Layer, which the reviewer already has.
- It avoids the trust problems of raw chain-of-thought, which can be verbose, unreliable as a completeness signal, and misleading if selectively shown.
- It keeps the product small and auditable rather than explanatory and verbose.

## Consequences

**The product can make both understanding and judgment auditable.**

Capture Layer remains the artifact for what the system understood from the raw input.

Decision Trace becomes the artifact for why a recommendation or next step follows from the Capture Layer.

Decision Brief remains the readable user-facing output.

**The artifact pipeline is now three steps, not two.**

The generation pipeline must produce a Decision Trace before producing the final Decision Brief. This is a contract extension, not a re-architecture. The existing `ModelAdapter` boundary and two-step pipeline remain in place.

**Downstream work is explicitly deferred.**

This decision establishes the schema and rationale. It does not implement any of the following, which are the subjects of their own issues:

- Extending the `BriefSession` contract to include `decisionTrace` (#90)
- Adding fixtures and eval gates for Decision Trace (#91)
- Rendering the Basis disclosure in the Decision Brief UI (#92)
- Including Decision Trace in Markdown export (#93)

**What must not change as a result of this decision.**

- Mock-first public demo remains the default.
- Local Ollama remains the strongest real-generation path.
- Browser WebGPU remains gated.
- Hosted inference remains out of scope.
- Raw model thinking, hidden reasoning, scratchpad output, and chain-of-thought remain unexposed.
- The product does not become a broad AI assistant.
- v0.2 avoids fundamental re-architecture.

## Related

- [Decision Trace schema](decision-trace-schema.md)
- [Conceptual data model](data-model.md)
- [v0.2 Decision Trace direction](../product/v0.2-decision-trace-direction.md)
- [Capture Layer contract](../product/capture-layer.md)
- #88 — Define v0.2 Decision Trace direction
- #89 — Add Decision Trace schema and ADR
- #90 — Extend Decision Brief contract with traceable rationale
- #91 — Add Decision Trace fixtures and eval gates
- #92 — Render recommendation basis in Decision Brief UI
- #93 — Include Decision Trace in Markdown export

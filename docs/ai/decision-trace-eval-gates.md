# Decision Trace evaluation gates

## Purpose

Decision Trace makes the judgment step auditable, but that only holds if traceable rationale is verifiable rather than merely generated. This document defines the automated structural readiness gate for `DecisionTrace` output and the rationale dimensions it checks.

It complements [`decision-trace-schema.md`](../architecture/decision-trace-schema.md) (the schema and field mapping source of truth) and the Capture Layer's [`capture-layer-eval-harness.md`](capture-layer-eval-harness.md) (the equivalent gate for Capture Layer output).

This gate checks structure and groundedness signals automatically. It does not score rationale quality on a 1–5 scale the way `evaluation-plan.md` does for the Capture Layer and Decision Brief — that remains manual, future work if pursued.

## What this gate is not

- Not a scoring rubric. It is pass/fail per check, like the Capture Layer's structural readiness gate.
- Not a substitute for the schema/contract validation in `parseDecisionTrace.ts`, which rejects malformed output at generation time. This gate runs on top of already-valid `DecisionTrace` objects to check coverage and groundedness against a specific Capture Layer.
- Not a hallucination detector for prose. Groundedness checks use exact/substring matching against Capture Layer arrays; they catch invented basis items but cannot verify subtle factual drift.

## Rationale dimensions

### Recommendation and next-step coverage

Every recommendation in the Decision Brief should have a corresponding `DecisionTraceEntry` with `kind: "recommendation"`, and every suggested next step should have a corresponding entry with `kind: "next_step"`. The gate checks this using the Capture Layer as the source of truth for what should be traced: `recommendation_candidate` (non-empty implies at least one recommendation entry) and `suggested_next_steps` (count should match `next_step` entry count).

### Rationale completeness

Every entry should have:

- A non-empty `basis.intent`.
- A valid, per-item `confidence` (`High`, `Medium`, or `Low`).
- At least one non-empty `basis` array field. An entry whose basis is entirely empty arrays plus an empty intent is not traceable — it fails the gate.

### Change-condition usefulness

Every entry's `would_change_if` should contain at least one specific, named condition. Generic conditions — "if the situation changes," "if new information becomes available," "if circumstances change," and similar catch-alls — are treated as weak or failing, because they do not tell a reviewer what would actually change the recommendation.

The gate reuses the same generic-condition detection (`isGenericWouldChangeIf`) that real-time contract validation uses in `src/services/generation/parseDecisionTrace.ts`, so the "specific enough" bar is consistent between generation-time validation and eval-time readiness checks.

### Recommendation-to-Capture-Layer traceability (groundedness)

Each `basis` field should be grounded in the Capture Layer field it maps to, per the table in `decision-trace-schema.md`:

| Basis field | Capture Layer field |
|---|---|
| `intent` | `goals` |
| `supporting_evidence` | `evidence` |
| `assumptions_relied_on` | `assumptions` |
| `risks_addressed` / `risks_accepted` | `risks` |
| `constraints_respected` | `constraints` |
| `tradeoffs` | `tensions` |
| `alternatives_considered` | `options_considered` |
| `missing_context_caveats` | `missing_context` |

The gate checks each basis item against the mapped Capture Layer array. An item is grounded when it matches verbatim or is a substring of (or contains) an item in that array — this tolerates light paraphrasing while still catching content that was not present in the Capture Layer at all. `basis.intent` is checked the same way against `goals`.

This is a "where practical" signal, not a hard proof of correctness: an item could coincidentally overlap with unrelated Capture Layer text. It is intended to catch invented rationale, not to replace human review of subtle grounding.

## Implementation

- `src/evaluation/decisionTraceChecks.ts` — `evaluateDecisionTraceReadiness(captureLayer, decisionTrace)` returns a `StructuralReadinessResult` (`{ pass, checks[] }`) with one check per dimension above: `recommendation_coverage`, `next_step_coverage`, `entries_have_intent`, `entries_have_confidence`, `entries_have_non_empty_basis`, `would_change_if_specific`, `intent_grounded_in_goals`, `basis_grounded_in_capture_layer`.
- `src/services/generation/parseDecisionTrace.ts` — real-time contract validation used when parsing model output. Exports `isGenericWouldChangeIf` and `DECISION_TRACE_BASIS_ARRAY_FIELDS` so the eval gate stays consistent with generation-time validation instead of redefining the same rules twice.

## Fixtures

The three public gallery examples each have an explicit, hand-authored `expected-decision-trace.json` fixture alongside their existing `expected-capture-layer.json` and `expected-decision-brief.md`:

- `fixtures/examples/q4-workforce-allocation/expected-decision-trace.json`
- `fixtures/examples/local-inference-setup-flow/expected-decision-trace.json`
- `fixtures/examples/household-move-planning/expected-decision-trace.json`

These fixtures are explicit rather than generated so expected rationale stays readable, reviewable, and stable across changes to any generated-trace fallback logic. The mock adapter (`mockModelAdapter.ts`) returns these fixtures directly for the three demo examples; it falls back to a generated trace (`buildMockDecisionTrace`) only for arbitrary non-demo mock input.

## How to run

```sh
npm test
```

Covers:

- `src/evaluation/decisionTraceChecks.test.ts` — unit tests for each readiness check dimension, plus a parameterized pass/fail run of `evaluateDecisionTraceReadiness` against all three public gallery fixtures.
- `src/services/generation/parseDecisionTrace.test.ts` — contract/parser validation tests (statement, basis, would_change_if, generic-condition rejection).
- `src/services/generation/mockModelAdapter.test.ts` — asserts the mock adapter returns the exact fixture `DecisionTrace` for each gallery example and that it passes `evaluateDecisionTraceReadiness`.

There is no CLI eval runner for Decision Trace yet (unlike `npm run eval:capture` for the Capture Layer). Adding one, along with Ollama/WebGPU live-model Decision Trace scoring, is out of scope for #91 and can be considered in later follow-on work.

## Related

- [Decision Trace schema](../architecture/decision-trace-schema.md)
- [ADR: Traceable recommendation rationale without exposing chain-of-thought](../architecture/adr-traceable-recommendation-rationale.md)
- [Capture Layer eval harness](capture-layer-eval-harness.md)
- [Evaluation plan](evaluation-plan.md)
- #89 — Add Decision Trace schema and ADR
- #90 — Extend Decision Brief contract with traceable rationale
- #91 — Add Decision Trace fixtures and eval gates

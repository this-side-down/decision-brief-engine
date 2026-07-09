# Decision Trace Schema

## Purpose

This document is the source of truth for the `DecisionTrace` schema in Decision Brief Engine v0.2.

Decision Trace is a structured, user-facing rationale artifact that makes the judgment step auditable. It binds each recommendation and next step in the Decision Brief back to the Capture Layer elements — intent, evidence, assumptions, risks, constraints, tradeoffs, alternatives, and missing context — that it depends on.

Decision Trace is not raw model thinking, hidden reasoning, scratchpad output, or chain-of-thought. It is a contract output in the same sense as the Capture Layer: explicit, readable, fixture-ready, and evaluatable.

## What Decision Trace is not

Before reading the schema, it is useful to state what Decision Trace must never be:

- **Not raw model thinking.** The model may reason privately before producing output. That reasoning is not Decision Trace.
- **Not hidden reasoning.** Intermediate reasoning steps inside the model are not exposed.
- **Not scratchpad output.** Any scratchpad or draft the model uses internally is not part of Decision Trace.
- **Not chain-of-thought.** Chain-of-thought is a generation technique. Decision Trace is a product artifact.
- **Not a graph UI, scoring matrix, or argument tree.** Decision Trace is a flat, structured list of entries, one per recommendation or next step.

## Position in the pipeline

```
Raw Input → Capture Layer → Decision Trace → Decision Brief
```

The Capture Layer is the source of truth for what the system understood from the raw input.

Decision Trace is the source of truth for why each recommendation and next step follows from the Capture Layer.

The Decision Brief remains the user-facing readable artifact.

## Schema

`docs/architecture/decision-trace-schema.md` is the source of truth for Decision Trace typing. Implementation types, prompt output validation, mocked fixtures, and evaluation fixtures should reference this schema instead of redefining field types elsewhere.

Canonical TypeScript-friendly schema:

```ts
type Confidence = "High" | "Medium" | "Low";

type DecisionTraceEntryKind = "recommendation" | "next_step";

type DecisionTraceBasis = {
  intent: string;
  supporting_evidence: string[];
  assumptions_relied_on: string[];
  risks_addressed: string[];
  risks_accepted: string[];
  constraints_respected: string[];
  tradeoffs: string[];
  alternatives_considered: string[];
  missing_context_caveats: string[];
};

type DecisionTraceEntry = {
  statement: string;
  kind: DecisionTraceEntryKind;
  basis: DecisionTraceBasis;
  confidence: Confidence;
  would_change_if: string[];
};

type DecisionTrace = {
  entries: DecisionTraceEntry[];
  created_at: string;
};
```

## Field reference

### DecisionTrace

| Field | Type | Description |
|---|---|---|
| `entries` | `DecisionTraceEntry[]` | One entry for each recommendation or next step in the Decision Brief. |
| `created_at` | `string` | Client timestamp for when the trace was generated. |

### DecisionTraceEntry

| Field | Type | Description |
|---|---|---|
| `statement` | `string` | The recommendation or next step being traced, verbatim or closely paraphrased from the Decision Brief. |
| `kind` | `"recommendation" \| "next_step"` | Whether this entry traces a recommendation or a suggested next step. |
| `basis` | `DecisionTraceBasis` | Structured rationale linking this entry to the Capture Layer. |
| `confidence` | `"High" \| "Medium" \| "Low"` | Per-item confidence that the basis is complete and the statement is well-supported. |
| `would_change_if` | `string[]` | Conditions or new information that would lead to a different recommendation or next step. Must be specific; generic conditions are a quality signal for eval gates. |

### DecisionTraceBasis

Each `basis` field connects the entry to elements already present in the Capture Layer.

| Field | Type | Description |
|---|---|---|
| `intent` | `string` | Which goal or intent from the Capture Layer this entry serves. |
| `supporting_evidence` | `string[]` | Evidence items from the Capture Layer that support this entry. |
| `assumptions_relied_on` | `string[]` | Assumptions from the Capture Layer that this entry depends on being true. |
| `risks_addressed` | `string[]` | Risks from the Capture Layer that this entry actively mitigates. |
| `risks_accepted` | `string[]` | Risks from the Capture Layer that this entry accepts or defers. |
| `constraints_respected` | `string[]` | Constraints from the Capture Layer that this entry stays within. |
| `tradeoffs` | `string[]` | Tradeoffs or tensions from the Capture Layer that this entry navigates. |
| `alternatives_considered` | `string[]` | Alternatives from the Capture Layer that were considered but not selected, with brief reasoning why not. |
| `missing_context_caveats` | `string[]` | Missing-context items from the Capture Layer that qualify this entry's reliability or scope. |

## Absence convention

Follow the same absence convention as the Capture Layer:

- Use an empty string for absent narrative fields such as `intent`.
- Use empty arrays for absent list fields such as `supporting_evidence`.
- Use `confidence: "Low"` when the basis is thin, unverified, or relies heavily on inference.
- Do not introduce `null` values for v0.2 fixtures unless there is a specific implementation reason and the reason is documented.

## Relationship to the Capture Layer

Decision Trace entries are grounded in the Capture Layer. Each `basis` field corresponds to a Capture Layer field:

| Decision Trace basis field | Corresponding Capture Layer field |
|---|---|
| `intent` | `goals` |
| `supporting_evidence` | `evidence` |
| `assumptions_relied_on` | `assumptions` |
| `risks_addressed` / `risks_accepted` | `risks` |
| `constraints_respected` | `constraints` |
| `tradeoffs` | `tensions` |
| `alternatives_considered` | `options_considered` |
| `missing_context_caveats` | `missing_context` |

Basis items should be grounded in the Capture Layer where practical. Entries that introduce claims not present in the Capture Layer are a quality signal for eval gates.

## Relationship to BriefSession

`DecisionTrace` is not yet part of the `BriefSession` contract. That extension is the subject of issue #90. This schema document establishes the target shape so that fixtures (#91), UI (#92), and export (#93) work can proceed from a stable definition.

## Eval gate expectations

Eval gates are implemented in `src/evaluation/decisionTraceChecks.ts` (`evaluateDecisionTraceReadiness`), mirroring the Capture Layer's `evaluateStructuralReadiness` gate. They verify:

- Every recommendation in the Decision Brief has a corresponding `DecisionTraceEntry` with `kind: "recommendation"`.
- Every next step in the Decision Brief has a corresponding `DecisionTraceEntry` with `kind: "next_step"`.
- Every entry has a non-empty `basis.intent`.
- Every entry has `confidence` set.
- Every entry has at least one `would_change_if` condition.
- Entries whose `basis` fields are entirely empty are treated as failing the structural gate.
- `would_change_if` conditions that are generic (for example, "if new information becomes available") are treated as weak or failing.
- `basis.intent` and basis array items are checked for groundedness against the corresponding Capture Layer fields, where practical.

See [`docs/ai/decision-trace-eval-gates.md`](../ai/decision-trace-eval-gates.md) for the full gate reference, rationale groundedness definition, and how to run the supporting tests. The three public gallery examples in `fixtures/examples/*/expected-decision-trace.json` are explicit, hand-authored fixtures that pass this gate and are covered by `src/evaluation/decisionTraceChecks.test.ts`.

## Related

- [v0.2 Decision Trace direction](../product/v0.2-decision-trace-direction.md)
- [ADR: Traceable recommendation rationale without exposing chain-of-thought](adr-traceable-recommendation-rationale.md)
- [Conceptual data model](data-model.md)
- [Capture Layer contract](../product/capture-layer.md)
- #89 — Add Decision Trace schema and ADR
- #90 — Extend Decision Brief contract with traceable rationale
- #91 — Add Decision Trace fixtures and eval gates
- #92 — Render recommendation basis in Decision Brief UI
- #93 — Include Decision Trace in Markdown export

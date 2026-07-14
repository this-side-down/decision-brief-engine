# Local Ollama Decision Brief and Trace generation (#154)

#154 restores the combined Decision Brief + Decision Trace envelope for Local Ollama, but **#154 remains open** until trace readiness, required sections, alignment, writing quality, and deterministic usability pass on the measured fixtures.

## Scope of PR #156

This PR is the **first implementation slice** under #154. It resolves the empty-Markdown / wrong-envelope defect. It does **not** close #154.

Remaining work under open #154:

- Decision Trace structural readiness
- required Decision Brief sections
- recommendation and next-step alignment
- writing hard failures
- deterministic usability

**#155** remains the independent hierarchical `stated_decision` blocker on the platform fixture.

## Request-scoped diagnostics

Production generation records `DecisionArtifactDiagnostics` through a per-invocation holder passed in `GenerateDecisionBriefOptions`. No module-global diagnostics state is used. The evaluation harness supplies its own holder per pipeline case.

## Production cancellation

Local Ollama Decision Brief generation uses the same abort-controller path as WebGPU brief generation. Cancellation aborts the in-flight Ollama fetch, preserves the accepted Capture Layer, clears partial brief/trace artifacts, returns the session to `capture_ready`, and uses a run-id guard so late responses cannot publish stale results.

## Diagnosed root cause

Before #154, Local Ollama Decision Brief generation used the **legacy** prompt with `format: "json"` and no JSON Schema constraint. Measured on `qwen3:4b` with the Q4 gallery Capture Layer:

| Candidate | Prompt | Ollama format | Top-level keys returned | `markdown` present |
| --- | --- | --- | --- | --- |
| A (baseline) | `legacy` | `"json"` | Capture Layer fields (`source_summary`, `goals`, …) | **no** |
| B (selected) | `structured_response` | exact `DecisionBriefResult` JSON Schema | `markdown`, `decisionTrace` | **yes** |

**Failure shape:** valid JSON, but the model echoed the Capture Layer contract instead of the combined brief envelope. The parser correctly threw `Decision Brief result is missing a non-empty "markdown" field.` This affected Q4 single-pass and both long-form fixtures equally — it was not caused by hierarchical capture (#153).

## Candidates evaluated

Bounded comparison on `qwen3:4b`, one combined request per candidate, Capture Layer generation unchanged:

| Candidate | Posture | Parse success | Non-empty Markdown | Trace schema | Notes |
| --- | --- | --- | --- | --- | --- |
| A | legacy + `format: "json"` | yes | **no** | n/a | Returns Capture Layer keys |
| B | `structured_response` + exact schema + `temperature: 0` + `think: false` | yes | **yes** | yes | Selected |
| C | structured + schema with default thinking | not run | — | — | B succeeded; no reason to test |

Split-stage generation (`markdown_only` then trace-only) was **not** required: Candidate B passed parse/schema on all three fixtures.

## Selected architecture

- **Strategy:** `combined` — one Ollama call returns `{ markdown, decisionTrace }`.
- **Prompt:** `buildDecisionBriefPrompt(input, { mode: "structured_response" })`.
- **Schema:** runtime-neutral `DECISION_BRIEF_RESULT_JSON_SCHEMA` (`additionalProperties: false`, explicit required fields, enum constraints) shared with WebGPU via `decisionBriefResultSchema.ts`.
- **Request posture:** `temperature: 0`, `think: false`, JSON Schema as Ollama `format`.
- **Parser:** `parseDecisionBriefResultStrict` throws `DecisionBriefContractError` on any envelope or trace contract failure (no silent empty-trace fallback on the Ollama path).
- **Retry:** at most **one** bounded retry after `DecisionBriefContractError`; no retry for cancellation, timeout, network errors, or semantic/writing-quality failures.

### Model-call count

| Stage | Calls |
| --- | ---: |
| Capture Layer | unchanged (1 single-pass or hierarchical) |
| Decision Brief + Trace | **1** (2 only when contract retry fires) |

### Retry behavior

- Retries only on `DecisionBriefContractError` (invalid JSON, empty markdown, trace validation failure).
- `GenerationCancelledError`, timeout, and network errors propagate without retry.
- Observed in two stability runs: **0 brief retries** across all nine case executions.

### Latency impact (two-run median, ms)

| Fixture | Capture | Brief+Trace |
| --- | ---: | ---: |
| `q4-workforce-allocation` | ~7.9k | ~10.8k |
| `platform-rearchitecture-review` | ~26k | ~8.1k |
| `regional-launch-readiness-review` | ~42k | ~21.7k |

Brief generation latency is additive to capture; no split-stage second call.

## Rejected alternatives

- **Candidate A (legacy baseline):** reliably returns wrong envelope; root cause of #154 failure.
- **Candidate C (thinking on):** not measured; B already produced valid combined artifacts.
- **Split-stage:** unnecessary after B passed schema on all fixtures.

## Measured limitations (post-fix, two Ollama runs)

All three fixtures now produce **non-empty Markdown** and **parseable Decision Traces** (`decisionBriefGenerationSuccess: true`, `decisionTraceSchemaPass: true`) on both runs.

Deterministic usability remains blocked by product-quality gates on long-form inputs:

| Fixture | Run 1 usable | Run 2 usable | Primary blockers (excluding #155) |
| --- | --- | --- | --- |
| `q4-workforce-allocation` | no | no | Trace readiness (recommendation coverage, grounding); run 1 writing hard fails, run 2 alignment punctuation |
| `platform-rearchitecture-review` | no | no | **#155** invented `stated_decision`; trace next-step coverage; required sections |
| `regional-launch-readiness-review` | no | no | Trace next-step coverage; required sections / writing (run 2 emoji); alignment |

**#155** (invented `stated_decision` on platform hierarchical capture) remains a separate blocker on the platform fixture.

**#152** (trace readiness / alignment / writing quality on long-form Ollama) is the next eligible improvement after #155 for platform, and independently for regional.

## Whether #155 is the only blocker

**No.** For the full three-case release gate:

- Platform: **#155** is one blocker; trace coverage and section/writing gates also fail.
- Regional: no #155 defect, but trace alignment and brief structure gates fail.
- Q4: generation restored; trace readiness and alignment still fail determinism.

For the **#154-specific** defect (empty/missing `markdown` on combined generation), **#155 is not involved** — that failure mode is resolved.

## Diagnostics recorded in pipeline results

Optional `decisionArtifactDiagnostics` on Ollama runs:

- `strategy`: `combined`
- `briefRetryCount`
- `briefGenerationLatencyMs`
- `traceRetryCount` / `traceGenerationLatencyMs`: null (split-stage not used)

Backward compatible: field omitted/null on older artifacts and non-Ollama modes.

## Test-only structural diagnosis

`diagnoseDecisionBriefResponseShape(rawText)` summarizes top-level keys, value types, and markdown/trace presence without logging raw model text. Used in unit tests and available for local debugging.

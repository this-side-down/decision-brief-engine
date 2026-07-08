# Browser model quality gate

## Purpose

Define the Capture Layer quality gate for deciding whether browser WebGPU inference can ship in Decision Brief Engine.

This document defines the gate to run, not a completed evaluation. Record results only after model runs in [`fixtures/evaluation/browser-model-results.md`](../../fixtures/evaluation/browser-model-results.md).

For a repeatable Capture Layer-first entry point (mock + Ollama CLI, WebGPU manual procedure, schema-before-score), use [`capture-layer-eval-harness.md`](capture-layer-eval-harness.md). The first harness case is the construction Strategy example; the five-fixture ungating thresholds in this document still apply before public WebGPU decisions.

The gate exists because the product promise depends on preserving facts, inference, ambiguity, risks, assumptions, missing context, and open questions through a two-step pipeline:

1. Generate valid typed Capture Layer JSON.
2. Generate Markdown Decision Brief from that Capture Layer.

JSON reliability is the load-bearing risk. Markdown generation is lower risk.

This document satisfies the planning scope for [#57](https://github.com/this-side-down/decision-brief-engine/issues/57). It does not implement browser inference, add runtime dependencies, call hosted model APIs, or change app behavior.

## Candidate model/runtime combinations to evaluate

| Role | Runtime | Model | License | Approx. download |
| --- | --- | --- | --- | --- |
| Quality baseline | Ollama local | `qwen3:4b` | Open-weight; review before adoption | External to app; managed by Ollama |
| Primary browser candidate | WebLLM (`@mlc-ai/web-llm`) | Qwen2.5-1.5B-Instruct q4f16 | Apache 2.0 | ~1.0 to 1.2 GB |
| Low-VRAM fallback | WebLLM (`@mlc-ai/web-llm`) | Qwen2.5-0.5B-Instruct q4f16 | Apache 2.0 | ~0.3 to 0.5 GB |
| Optional backup | WebLLM (`@mlc-ai/web-llm`) | SmolLM2-1.7B-Instruct q4f16 | Apache 2.0 | Evaluate at planning time |

### Excluded from this slice

Do not evaluate these in the first browser slice:

| Model | Reason excluded |
| --- | --- |
| Qwen2.5-3B | Too large for first browser slice |
| Llama-3.2-1B | Size/download friction for the first browser slice |
| Gemma-2-2B | License concerns for this artifact |
| Phi-3.5-mini | Not FOSS-clean enough for this artifact |

### Runtime notes

- Compare local Ollama `qwen3:4b` as the quality baseline.
- Evaluate WebLLM + Qwen2.5-1.5B-Instruct q4f16 as the primary browser candidate.
- Evaluate WebLLM + Qwen2.5-0.5B-Instruct q4f16 as the smaller/faster fallback if feasible.
- Optionally include SmolLM2-1.7B-Instruct q4f16 as backup.
- Do not recommend Chrome built-in AI / Prompt API; it is browser-specific and not FOSS-clean for this project.
- Do not recommend raw ONNX Runtime Web or wllama for this slice; they are lower-level and add surface area without product gain.

## Fixtures to use

Use all five evaluation fixtures in `fixtures/evaluation/`:

| Fixture file | Brief type |
| --- | --- |
| `product-prioritization.md` | Product Decision Brief |
| `strategy-tradeoff.md` | Strategy Decision Brief |
| `execution-planning.md` | Execution Decision Brief |
| `customer-interview-synthesis.md` | Product Decision Brief |
| `ambiguous-stakeholder-conversation.md` | Strategy Decision Brief |

Each evaluation pass should run the full pipeline:

raw notes → Capture Layer JSON → Decision Brief Markdown

Use the same prompt contracts documented in `docs/ai/prompt-contracts.md` and the Capture Layer contract in `docs/product/capture-layer.md`.

## Manual scorecard criteria

Score each fixture with `fixtures/evaluation/manual-scorecard.md`:

| Category | Score | What to check |
| --- | --- | --- |
| Decision clarity | 0-2 | The Capture Layer and brief make the decision or implied decision clear. |
| Option preservation | 0-2 | Material options are preserved without collapsing them into one path. |
| Stakeholder preservation | 0-2 | Important teams, users, buyers, owners, or reviewers are represented. |
| Constraint and risk preservation | 0-2 | Constraints and risks are visible and not softened away. |
| Open question preservation | 0-2 | Decision-relevant unresolved questions remain visible. |
| Recommendation grounding | 0-2 | Recommendation candidate or final recommendation is grounded in the notes and Capture Layer. |
| Confidence calibration | 0-2 | Confidence reflects ambiguity, gaps, and source quality. |
| Brief usefulness | 0-2 | Markdown brief is structured, readable, and useful as an exported artifact. |

Maximum score per fixture: 16.

Also record these Capture Layer gate checks separately for every fixture:

- Capture Layer JSON validity
- Capture Layer schema conformance
- Fact preservation
- Decision preservation
- Option preservation
- Risk coverage
- Assumption coverage
- Open-question coverage
- Missing-context capture

## Minimum thresholds

A candidate passes the quality gate only if all minimum thresholds below are met.

### Hard gates

- Capture Layer JSON parses without manual editing on at least 4 of 5 fixtures.
- Capture Layer output conforms to the typed schema on at least 4 of 5 fixtures.
- Schema validation plus one repair-retry path succeeds before counting a fixture as pass or fail.
- No fixture presents an invented stated decision as fact.
- No fixture scores 0 on recommendation grounding and confidence calibration together.

### Score gates

- Average manual scorecard total across fixtures is at least 12/16.
- Usable Decision Brief on at least 3 of 5 fixtures without manual rescue.
- Ollama baseline should remain the higher-quality local/dev path in comparison notes.

### UX gates

- First-load model download size is documented before download starts.
- Latency and download friction are acceptable for an opt-in browser mode.
- Unsupported browsers/devices fail clearly rather than silently degrading quality.

If JSON/schema reliability fails or download/device friction is unacceptable, defer browser inference.

## Failure modes to watch

| Failure mode | Why it matters |
| --- | --- |
| Invalid JSON | Breaks `generateCaptureLayer` contract |
| Schema mismatch | Typed Capture Layer fields missing or wrong shape |
| Repair-retry still fails | Indicates unstable browser model behavior |
| Invented stated decision | Violates fact/inference separation |
| Lost options or stakeholders | Breaks decision usefulness |
| Missing risks, assumptions, or open questions | Flattens ambiguity |
| Missing-context not captured | Hides decision blockers |
| Overconfident recommendation | Misleading executive output |
| False certainty on ambiguous input | Highest-risk product failure |
| Unacceptable first-load download | Biggest UX risk for public opt-in mode |
| WebGPU/device incompatibility | Requires visible fallback to mock mode |

## Decision rule

Apply exactly one outcome only after manual runs are recorded in `fixtures/evaluation/browser-model-results.md`:

| Outcome | When to choose it |
| --- | --- |
| **Ship browser inference** | Quality is good enough and UX friction is acceptable; candidate is close enough to the Ollama baseline to ship opt-in without an experimental downgrade. |
| **Ship browser inference as experimental** | Useful for early adopters but clearly weaker than local Ollama on one or more critical dimensions; JSON/schema reliability still passes hard gates. |
| **Defer browser inference** | JSON/schema reliability fails, repair-retry is insufficient, or download/device friction is unacceptable. |

Product posture regardless of outcome:

- Browser WebGPU mode remains opt-in.
- Mock mode remains default.
- Local Ollama remains the higher-quality local/dev path.
- Public hosted inference remains deferred.
- [#60](https://github.com/this-side-down/decision-brief-engine/issues/60) must not start until [#57](https://github.com/this-side-down/decision-brief-engine/issues/57), [#58](https://github.com/this-side-down/decision-brief-engine/issues/58), and [#59](https://github.com/this-side-down/decision-brief-engine/issues/59) are complete.

## Output format for results

Record each model/runtime evaluation in `fixtures/evaluation/browser-model-results.md` using this structure:

```markdown
## [Runtime + model name]

- Device/browser:
- Model size/download notes:
- Recommendation: ship | ship as experimental | defer

### Fixture scores

| Fixture | Score total (/16) | Valid JSON | Schema pass | Usable brief | Notes |
| --- | ---: | --- | --- | --- | --- |

### Latency observations

- First load:
- Capture Layer generation:
- Decision Brief generation:

### Failure modes

- ...

### Gate summary

- Hard gates:
- Score gates:
- UX gates:
```

Required placeholder rows to maintain until evaluation is complete:

- Ollama `qwen3:4b` baseline
- WebLLM + Qwen2.5-1.5B-Instruct q4f16
- WebLLM + Qwen2.5-0.5B-Instruct q4f16
- WebLLM + SmolLM2-1.7B-Instruct q4f16 (optional backup)

## Related documents

- [Capture Layer evaluation harness](capture-layer-eval-harness.md)
- [WebGPU adapter feasibility](webgpu-adapter-feasibility.md)
- [Evaluation plan](evaluation-plan.md)
- [Manual scorecard](../../fixtures/evaluation/manual-scorecard.md)
- [ADR 0004: inference path decision brief](../decisions/0004-inference-path-decision-brief.md)

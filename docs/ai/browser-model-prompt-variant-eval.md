# Browser model and prompt variant evaluation (#73)

## Purpose

Compare a small set of Capture Layer configurations for the gated browser WebGPU path against local Ollama and mock, using the [#72 harness](capture-layer-eval-harness.md). Decide whether to keep WebGPU gated, continue experimenting, or prepare a future ungating issue.

This document does **not** ungate public WebGPU, add a model picker, or change the Mock demo default.

## Configurations compared

| ID | Runtime | Model | Prompt variant | How to run |
| --- | --- | --- | --- | --- |
| M0 | Mock | `mockModelAdapter` | n/a (typed object) | `npm run eval:capture -- --mode=mock` |
| O1 | Ollama | `qwen3:4b` (default) | `default` | `npm run eval:capture -- --mode=ollama` |
| W1 | WebGPU / WebLLM | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | `default` | Manual; `VITE_ENABLE_WEBGPU_INFERENCE=true` |
| W2 | WebGPU / WebLLM | same 1.5B | `schema_skeleton` | Manual; also set `VITE_CAPTURE_PROMPT_VARIANT=schema_skeleton` |
| W3 | WebGPU / WebLLM | same 1.5B | `default` + schema-constrained output | Manual; `VITE_ENABLE_WEBGPU_INFERENCE=true`; omit `VITE_CAPTURE_PROMPT_VARIANT` |

Optional later (not required to close #73 if W1/W2 already show schema unreliability):

| ID | Notes |
| --- | --- |
| W4 | `VITE_WEBGPU_MODEL_ID=Qwen2.5-0.5B-Instruct-q4f16_1-MLC` + `default` prompt — only if W3 schema-constrained output still fails and a different model ID is worth one more download |

### Prompt variants

| Variant | Env | Behavior |
| --- | --- | --- |
| `default` | omit or any other value | Current Capture Layer prompt (field list + JSON instructions). With WebGPU (#116), also uses WebLLM schema-constrained JSON output for Capture Layer and Decision Brief result envelopes. |
| `schema_skeleton` | `VITE_CAPTURE_PROMPT_VARIANT=schema_skeleton` | Same contract, plus an explicit JSON object template for all required fields; allows empty `stated_decision` string when absent but forbids omitting the key. Still compatible with WebGPU schema-constrained output when enabled, but largely redundant for schema-shape reliability experiments after #116. |

Default remains `default`. Public builds should not set the skeleton env.

## First case

`construction-strategy` — Construction workforce planning (Strategy), matching the built-in example and `fixtures/evaluation/strategy-tradeoff.md`.

## Procedure

1. Run M0 and O1 via the harness CLI; paste rows into [`fixtures/evaluation/browser-model-results.md`](../../fixtures/evaluation/browser-model-results.md).
2. For W1: enable WebGPU, leave prompt variant unset, load construction example, Generate Capture Layer, record schema after the built-in one-retry path.
3. Restart or rebuild with `VITE_CAPTURE_PROMPT_VARIANT=schema_skeleton` for W2 (Vite env is build/dev-time). Repeat the same case.
4. For W3 (#116): enable WebGPU with the default prompt only (do **not** set `VITE_CAPTURE_PROMPT_VARIANT`). The WebGPU adapter now passes WebLLM `response_format: { type: "json_object", schema: ... }` for Capture Layer and Decision Brief result generation. Record first-attempt schema pass/fail, retry count, structural readiness, and latencies using the same construction Strategy case and machine profile as W2.
5. Only if schema + structural readiness pass, generate Decision Brief and fill the manual scorecard.
6. Update the #73 recommendation section in the results file.

## Pass / fail used here

Same as the harness:

1. Schema (after one WebGPU repair retry)
2. Structural readiness
3. Manual scorecard only after automated proceed-to-brief

Full five-fixture ungating thresholds remain in [browser-model-quality-gate.md](browser-model-quality-gate.md). Passing construction alone is not enough to ungate.

## Related

- [Capture Layer evaluation harness](capture-layer-eval-harness.md)
- [Browser model quality gate](browser-model-quality-gate.md)
- [Prompt contracts](prompt-contracts.md)
- Results: [`fixtures/evaluation/browser-model-results.md`](../../fixtures/evaluation/browser-model-results.md)

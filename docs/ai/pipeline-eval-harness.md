# Full-pipeline evaluation harness

## Purpose

Repeatable full-pipeline evaluation for the **current product contract** across:

1. Capture Layer (parse, schema, structural readiness, invented stated-decision)
2. Decision Trace (schema, structural readiness / groundedness)
3. Artifact alignment (recommendation and next-step statements)
4. Decision Brief (required sections, decision-grade writing)

This is **Phase 1 of #117** / issue **#126**. It runs now against Mock and Local Ollama. WebGPU results use the same result format after [#124](https://github.com/this-side-down/decision-brief-engine/issues/124) recovers — this harness does **not** automate the browser, invent WebGPU output, or ungate public WebGPU.

The older Capture Layer-only CLI (`npm run eval:capture`) remains available for Capture Layer smoke comparisons; prefer `npm run eval:pipeline` for current-contract ungating work.

## Commands

```sh
# Mock (CI-friendly baseline; all nine cases by default)
npm run eval:pipeline -- --mode=mock
npm run eval:pipeline -- --mode=mock --json
npm run eval:pipeline -- --mode=mock --output=fixtures/evaluation/baselines/mock-pipeline-baseline.json

# Single case
npm run eval:pipeline -- --mode=mock --fixture=product-prioritization

# Local Ollama (requires healthy Ollama + configured model)
npm run health:ollama
npm run eval:pipeline -- --mode=ollama
npm run eval:pipeline -- --mode=ollama --model=qwen3:4b --output=tmp/ollama-pipeline.json

# WebGPU is manual / import-only (exit 2 — not automated)
npm run eval:pipeline -- --mode=webgpu
```

Optional flags: `--all`, `--fixture=<id>` (repeatable), `--output=<path>`, `--json`, `--model=<ollama-model>`, `--artifacts=<dir>`.

### Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Harness finished. Product-quality gate failures are recorded in the result JSON (`failureKind: "product_quality"`). |
| `1` | CLI usage / argument error (`failureKind: "harness_execution"`). |
| `2` | Infrastructure or execution failure (for example Ollama unreachable, WebGPU mode requested, case load failure). Distinct from product-quality failures. |

## Cases (nine; never silently skipped)

### Evaluation fixtures

| ID | Source |
| --- | --- |
| `product-prioritization` | `fixtures/evaluation/product-prioritization.md` |
| `strategy-tradeoff` | `fixtures/evaluation/strategy-tradeoff.md` → construction specialty-trades transcript |
| `execution-planning` | `fixtures/evaluation/execution-planning.md` |
| `customer-interview-synthesis` | `fixtures/evaluation/customer-interview-synthesis.md` |
| `ambiguous-stakeholder-conversation` | `fixtures/evaluation/ambiguous-stakeholder-conversation.md` |

### Public gallery examples

| ID | Source |
| --- | --- |
| `q4-workforce-allocation` | `fixtures/examples/q4-workforce-allocation/` |
| `local-inference-setup-flow` | `fixtures/examples/local-inference-setup-flow/` |
| `household-move-planning` | `fixtures/examples/household-move-planning/` |
| `platform-rearchitecture-review` | `fixtures/examples/platform-rearchitecture-review/` (hierarchical Mock capture path) |

Evaluation fixtures are loaded with an **evaluation-only adapter** (`loadEvaluationFixtureInput`) that does not change product fixtures. Gallery cases use `demo:<id>` source labels. For `platform-rearchitecture-review`, Capture Layer generation routes through `generateCaptureLayerForSession` hierarchical Mock orchestration; authored brief and Decision Trace fixtures still supply downstream alignment checks.

## Pipeline steps

For each case:

1. Generate Capture Layer (Mock or Ollama adapter via `generateCaptureLayerForSession`; long-form gallery input uses hierarchical Mock orchestration).
2. Record first-attempt parse outcome and retry count (0 for Mock/Ollama; WebGPU imports may be >0).
3. Existing Capture Layer parse/schema validation.
4. Existing structural-readiness checks.
5. Generate Decision Brief + Decision Trace when a schema-valid Capture Layer exists (product permission).
6. Decision Trace schema validation.
7. Decision Trace structural-readiness checks.
8. Recommendation and next-step statement alignment across Capture Layer, Decision Trace, and Decision Brief.
9. Required Decision Brief sections.
10. Decision-grade writing checks (errors vs warnings vs report-only).
11. Stage latencies.
12. One normalized result record.

Validators are product evaluation functions already used elsewhere (`captureLayerChecks`, `decisionTraceChecks`, `decisionBriefWritingChecks`). This harness does not weaken them.

## Result format

Machine-readable evaluation data only (`resultFormatVersion: 1`). See `src/evaluation/pipeline/resultTypes.ts`.

Important fields:

- identity: `runId`, `timestamp`, `buildCommit`, `fixtureId`, `fixtureCategory`, `generationMode`, `modelId`
- schema versions: `captureLayerSchemaVersion`, `decisionTraceSchemaVersion`
- Capture Layer gates + readiness findings + invented stated-decision finding + retry/latency
- Decision Brief attempt/success + Decision Trace gates + alignment + writing buckets
- `deterministicUsableBrief` (automated)
- `manualScores` (nullable until a human scores)
- `failureKind`: `none` | `product_quality` | `infrastructure` | `harness_execution`
- `webGpu` profile fields for later browser rows (model, WebLLM version, cold/warm load, browser/device, delivery blocker)

Raw Capture Layer / brief / trace blobs stay optional via `--artifacts=<dir>`; summary records keep path references only.

### Deterministic usable-brief rule

`deterministicUsableBrief` is **false** when any of these are true:

- Capture Layer parse or schema fails
- Capture Layer structural readiness fails
- Invented stated decision as fact (fixture expects empty `stated_decision`)
- Decision Trace parse/schema or readiness fails
- Recommendation or next-step alignment fails
- Required Decision Brief sections missing
- Writing hard failure (`errors.length > 0`)

Warnings and report-only writing findings do **not** flip this flag.

### Manual scoring (explicit and separate)

`manualScores` fields stay `null` until a reviewer fills them:

- `decisionUsefulness`, `groundingAndTraceability`, `clarity`, `actionability`
- `totalScore`, `reviewerNotes`, `humanUsableBrief`

Use [`fixtures/evaluation/manual-scorecard.md`](../../fixtures/evaluation/manual-scorecard.md) for the /16 rubric, then copy numbers into the JSON result (or a follow-up Phase 2 sheet). The harness never manufactures a manual score.

## Mock baseline

Committed record:

- `fixtures/evaluation/baselines/mock-pipeline-baseline.json`

Expected Mock shape:

- **Gallery cases** (`demo:` source labels) should clear deterministic gates when authored fixtures still pass product validators. `platform-rearchitecture-review` exercises the hierarchical Mock capture path and should record as deterministic usable.
- **Evaluation fixtures** intentionally use non-demo Mock generation (synthetic Capture Layers). They often fail structural readiness / usable-brief deterministically. That is a **fixture/harness coverage finding**, not a reason to weaken validators or invent richer Mock outputs for non-gallery notes.

Review failures before changing fixture content.

## Ollama procedure

```sh
npm run health:ollama
npm run eval:pipeline -- --mode=ollama --output=fixtures/evaluation/baselines/ollama-pipeline-baseline.json
```

Default model remains `qwen3:4b` (or `VITE_OLLAMA_MODEL`). Do not change prompts or model IDs during a baseline run.

### Recorded local Ollama status (2026-07-13)

`npm run health:ollama` reported **READY** (`qwen3:4b`, Ollama 0.31.1). The eight-case run is committed at `fixtures/evaluation/baselines/ollama-pipeline-baseline.json`.

Observed outcomes (do not treat as a reason to weaken contracts):

- Several Decision Brief stages returned an empty markdown envelope (`brief_generation` / product-quality).
- Several stages hit the 120s Ollama timeout (`infrastructure`).
- No case cleared `deterministicUsableBrief` in that run.
- Manual scores remained null.

If Ollama or the configured model is unavailable on another machine: keep `--mode=ollama` support, mark results pending in [`browser-model-results.md`](../../fixtures/evaluation/browser-model-results.md), and do not fabricate output.

## WebGPU results after #124

1. Keep WebGPU gated (`VITE_ENABLE_WEBGPU_INFERENCE` unset for public).
2. After delivery recovers, run the manual browser procedure in [`browser-model-prompt-variant-eval.md`](browser-model-prompt-variant-eval.md).
3. Record measured fields with `buildWebGpuPipelineResult` (`src/evaluation/pipeline/webGpuResult.ts`) into the same JSON shape.
4. W3 remains **blocked** until #124 is resolved. Do not claim W3 has run.

## How #117 Phase 2 consumes these records

Phase 2 scores browser (and refreshed Ollama) runs against the hard/score/UX thresholds in [`browser-model-quality-gate.md`](browser-model-quality-gate.md). It should:

- Load committed or freshly generated pipeline JSON
- Join deterministic fields with filled `manualScores`
- Treat `deterministicUsableBrief` and `humanUsableBrief` as separate columns
- Avoid re-implementing product validators

## How failures affect #75 rollout

- Infrastructure failures do not answer the #75 quality question.
- Product-quality failures (deterministic or manual) support **keep gated / defer** until thresholds clear.
- Mock gallery green alone is not a browser unroll decision.
- W3 browser evidence remains required for the public WebGPU ungating path and stays blocked by #124.

## Related

- [Capture Layer-only harness](capture-layer-eval-harness.md) (`npm run eval:capture`)
- [Browser model quality gate](browser-model-quality-gate.md)
- [Browser model / prompt variant eval](browser-model-prompt-variant-eval.md)
- [Decision Trace eval gates](decision-trace-eval-gates.md)
- Results log: [`fixtures/evaluation/browser-model-results.md`](../../fixtures/evaluation/browser-model-results.md)

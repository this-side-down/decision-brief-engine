# WebGPU adapter feasibility

## Purpose

Research and select the browser inference runtime and integration approach for an opt-in public browser inference mode behind the existing `ModelAdapter` boundary.

This document satisfies the planning scope for [#58](https://github.com/this-side-down/decision-brief-engine/issues/58). It does not implement WebGPU inference, add runtime dependencies, call hosted model APIs, or change app behavior.

## Runtime comparison

| Runtime | Assessment | Decision |
| --- | --- | --- |
| **WebLLM (`@mlc-ai/web-llm`)** | Fits the existing async `ModelAdapter` shape; OpenAI-compatible chat completions; JSON mode and constrained/grammar-style decoding; first-class model-loading progress, caching, and cancellation | **Recommended** |
| **transformers.js** | Useful fallback/general ML library, but heavier integration surface for this prompt-contract slice and less predictable WebGPU performance for the target model class | Documented fallback only |
| **Chrome built-in AI / Prompt API** | Browser-specific and not FOSS-clean for this project | Do not recommend |
| **ONNX Runtime Web** | Lower-level; adds surface area without product gain for this slice | Do not recommend |
| **wllama** | Lower-level; adds surface area without product gain for this slice | Do not recommend |

### Why WebLLM

- It fits the existing async `ModelAdapter` shape better than transformers.js.
- It provides OpenAI-compatible chat completions.
- It supports JSON mode and constrained/grammar-style decoding.
- It has first-class model-loading progress, caching, and cancellation support.
- It aligns with the opt-in browser WebGPU path in [ADR 0004](../decisions/0004-inference-path-decision-brief.md).

Keep transformers.js documented as a fallback/general ML library, not the recommended runtime for this slice.

## Recommended runtime

**WebLLM (`@mlc-ai/web-llm`)** is the recommended runtime for the first browser inference adapter.

## Candidate model shortlist

| Role | Model | License | Notes |
| --- | --- | --- | --- |
| Primary | Qwen2.5-1.5B-Instruct q4f16 | Apache 2.0 | First candidate to evaluate and implement |
| Low-VRAM fallback | Qwen2.5-0.5B-Instruct q4f16 | Apache 2.0 | Smaller/faster fallback if feasible |
| Backup | SmolLM2-1.7B-Instruct q4f16 | Apache 2.0 | Optional backup only |

### Excluded from this slice

| Model | Reason excluded |
| --- | --- |
| Qwen2.5-3B | Too large for first browser slice |
| Llama-3.2-1B | Size/download friction; weaker fit for this artifact |
| Gemma-2-2B | License concerns |
| Phi-3.5-mini | Not FOSS-clean enough for this artifact |

Do not select a final production model beyond recommending the first candidate to evaluate. Do not commit model weights.

## Model size/download expectations

| Model | Approx. download | Intended use |
| --- | --- | --- |
| Qwen2.5-0.5B-Instruct q4f16 | ~0.3 to 0.5 GB | Low-VRAM fallback |
| Qwen2.5-1.5B-Instruct q4f16 | ~1.0 to 1.2 GB | Primary candidate |
| SmolLM2-1.7B-Instruct q4f16 | Plan during evaluation | Optional backup |

First-load model download is the biggest UX risk. Download size must be disclosed before download starts.

## Browser/device assumptions

Minimum assumptions for v0 experimental browser mode:

- Chromium-based browsers with stable WebGPU support
- Recent Firefox versions with WebGPU enabled where supported
- Safari WebGPU treated as best-effort until separately verified
- At least 4 GB system memory recommended for the 1.5B primary candidate
- Network connectivity required for first model download; inference stays local after load

Unsupported browsers should fall back to mock mode with visible messaging.

Browser WebGPU mode must remain opt-in. Mock mode remains default.

## Caching/loading behavior

Recommended ownership: **`createWebllmEngine`** handles engine lifecycle outside the adapter contract.

Loading behavior:

1. Lazy-load browser inference code only when the user opts in.
2. Detect WebGPU support before starting download.
3. Disclose model name and approximate download size before download starts.
4. Show explicit load/progress UI during first fetch and compile/warm-up.
5. Cache compiled engine artifacts through WebLLM cache helpers such as IndexedDB-backed reuse.
6. Reuse the loaded engine for both Capture Layer and Decision Brief generation in the same session.

Caching assumptions:

- First visit pays the full download cost.
- Repeat visits in the same browser profile reuse cached artifacts when available.
- Clearing site data removes cached weights and requires re-download.

## Cancellation/retry/progress behavior

Also owned by **`createWebllmEngine`**, not by the adapter contract:

- **Progress:** expose model download and engine init progress to the UI.
- **Cancellation:** abort in-flight download or generation when the user cancels or leaves the active generation step.
- **Retry:** allow manual retry after failed download or engine init; avoid infinite silent loops.

Adapter-level retry for generation:

- Capture Layer JSON must be schema-validated.
- On malformed JSON, run one repair-retry path, then fail clearly or fall back.
- Decision Brief generation may retry once on empty Markdown output.

## JSON-output risks

JSON reliability is the load-bearing risk because `generateCaptureLayer` must return valid typed `CaptureLayer` JSON.

Risks to plan for:

- Model emits prose instead of JSON
- JSON missing required Capture Layer fields
- JSON uses wrong field shapes or nested structures
- Repair-retry still returns invalid output
- Smaller fallback models collapse ambiguity or lose open questions

Markdown generation is lower risk but still requires non-empty output validation.

The quality gate in [browser model quality gate](browser-model-quality-gate.md) must pass before browser inference ships.

## License-class caveats

- WebLLM runtime licensing must remain compatible with the FOSS-only MVP rule in [ADR 0002](../decisions/0002-foss-only-mvp-stack.md).
- Candidate models listed here use Apache 2.0 where noted, but each model and runtime must still pass license review before adoption.
- Open-weight or vendor-hosted weights are not automatically FOSS-clean.
- Do not call hosted proprietary model APIs.
- Do not commit model weights to the repository.

## Integration shape with existing ModelAdapter

Keep the existing `ModelAdapter` contract unchanged:

```20:25:src/services/generation/types.ts
export type ModelAdapter = {
  generateCaptureLayer(
    input: GenerateCaptureLayerInput,
  ): Promise<CaptureLayer>;
  generateDecisionBrief(input: GenerateDecisionBriefInput): Promise<string>;
};
```

Recommended split:

| Module | Responsibility |
| --- | --- |
| `createWebllmEngine` | WebGPU detection, model download, progress, cancellation, retry, cache behavior, engine lifecycle |
| `webllmModelAdapter` | Wrap a ready engine and implement the existing two methods only |

Suggested file layout for [#60](https://github.com/this-side-down/decision-brief-engine/issues/60):

```text
src/services/generation/
  createWebllmEngine.ts
  webllmModelAdapter.ts
  webllmConfig.ts
  getModelAdapter.ts
  generationMode.ts
```

Integration rules:

- Reuse `buildCaptureLayerPrompt`, `buildDecisionBriefPrompt`, and `parseCaptureLayerJson`.
- Do not fork prompt contracts or Capture Layer field definitions inside the adapter.
- Browser mode code should code-split/load only when opted into.
- Local Ollama remains the higher-quality local/dev path.
- Public hosted inference remains deferred.

## Smallest viable implementation slice

1. Add opt-in browser generation mode plumbing without changing mock default.
2. Code-split WebLLM engine creation/load path.
3. Implement `createWebllmEngine` with WebGPU detection, size disclosure, progress, cache, cancel, and retry.
4. Implement `webllmModelAdapter` against a ready engine.
5. Generate Capture Layer JSON with schema validation and one repair-retry.
6. Generate Decision Brief Markdown from validated Capture Layer JSON.
7. Fall back to mock with visible messaging when browser inference is unsupported.

Out of scope for the first slice:

- Multiple browser model switching in primary UI
- Background prefetch on app load
- Automatic fallback from browser mode to Ollama
- Public hosted inference
- Backend, persistence, auth, analytics, billing, collaboration, or enterprise controls

## Failure states

Surface explicit, user-readable errors for:

- Browser inference unsupported (no WebGPU)
- Model download failed or cancelled
- Model load timed out
- Capture Layer JSON invalid after repair-retry
- Decision Brief empty after retry
- Generation cancelled by user

Preserve current session input where possible and keep mock mode available as the default fallback path.

## Explicit non-goals

- Implement WebGPU in this docs issue
- Add runtime dependencies in this docs issue
- Call hosted model APIs
- Create an automated benchmark suite
- Select a final production model beyond the first candidate to evaluate
- Add backend, persistence, auth, analytics, billing, collaboration, or enterprise controls
- Commit model weights
- Change current app behavior

## Sequencing

Do not start [#60](https://github.com/this-side-down/decision-brief-engine/issues/60) until [#57](https://github.com/this-side-down/decision-brief-engine/issues/57), [#58](https://github.com/this-side-down/decision-brief-engine/issues/58), and [#59](https://github.com/this-side-down/decision-brief-engine/issues/59) are complete.

## Related documents

- [Browser model quality gate](browser-model-quality-gate.md)
- [Browser model results template](../../fixtures/evaluation/browser-model-results.md)
- [Evaluation plan](evaluation-plan.md)
- [Ollama Qwen3 JSON quirk](ollama-qwen3-json-quirk.md)
- [ADR 0004: inference path decision brief](../decisions/0004-inference-path-decision-brief.md)

# Browser inference adapter feasibility

## Purpose

This document selects the browser inference runtime and integration approach for an opt-in public browser inference mode behind the existing `ModelAdapter` boundary.

It satisfies the planning scope for [#58](https://github.com/this-side-down/decision-brief-engine/issues/58). It does not implement browser inference or change app behavior.

## Context

Decision Brief Engine already routes generation through a provider-neutral adapter:

```20:25:src/services/generation/types.ts
export type ModelAdapter = {
  generateCaptureLayer(
    input: GenerateCaptureLayerInput,
  ): Promise<CaptureLayer>;
  generateDecisionBrief(input: GenerateDecisionBriefInput): Promise<string>;
};
```

Current implementations:

- `mockModelAdapter` — public demo default
- `ollamaModelAdapter` — local development path

The browser adapter should reuse the same prompt builders and Capture Layer validation path used by Ollama rather than changing the product pipeline.

## Runtimes considered

### WebLLM

Benefits:

- Purpose-built for in-browser WebGPU LLM inference.
- Mature model catalog with MLC-compiled weights sized for browser use.
- Supports chat/completion flows suitable for prompt-contract generation.
- Provides engine caching patterns compatible with IndexedDB-backed reuse.

Risks:

- Large first-load download and compile/warm-up cost.
- Device and browser variability across WebGPU implementations.
- Model availability depends on MLC packaging for each candidate.

Fit:

- Best match for an opt-in browser `ModelAdapter` using 1B–3B class models.

Decision:

- **Recommended runtime.**

### transformers.js

Benefits:

- Strong Hugging Face ecosystem support.
- Can run smaller models with WebGPU or WASM fallback.
- Useful for experimentation and ONNX-oriented workflows.

Risks:

- Heavier integration surface for chat-style prompt contracts at MVP scope.
- Performance on larger browser-feasible models is less predictable than WebLLM for this use case.
- More adapter work required for model load/cache orchestration and token streaming control.

Fit:

- Credible fallback research path, but not the fastest route to a narrow MVP adapter.

Decision:

- Not selected for the first browser adapter slice.

### Other credible options

| Runtime | Assessment |
| --- | --- |
| `llama.cpp` wasm builds | Possible, but packaging and WebGPU story are less aligned with the current React/Vite frontend than WebLLM. |
| ONNX Runtime Web | Better for fixed small models; less convenient for prompt-driven chat generation across two pipeline steps. |
| MediaPipe LLM Inference | Not selected; ecosystem fit for this repo's prompt-contract pipeline is weaker than WebLLM for v0. |

Decision:

- Documented as deferred alternatives only.

## Recommended runtime

**WebLLM** is the recommended browser runtime for the first opt-in adapter.

Primary reasons:

- Aligns with the WebGPU path selected in [ADR 0004](../decisions/0004-inference-path-decision-brief.md).
- Supports the quality-gate candidate identified in [browser model quality gate evaluation](browser-model-quality-gate.md).
- Keeps generation in-browser without a hosted backend or proprietary model API.
- Maps cleanly onto a new `ModelAdapter` implementation without changing Capture Layer or Decision Brief contracts.

## Candidate models

| Role | Model ID | Approx. size | Use |
| --- | --- | ---: | --- |
| Primary | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | ~1.0 GB | Default experimental browser model |
| Fallback | `Llama-3.2-1B-Instruct-q4f16_1-MLC` | ~0.7 GB | Optional low-memory fallback after explicit quality review |
| Deferred | `Llama-3.2-3B-Instruct-q4f16_1-MLC` | ~2.0 GB | Too heavy for first public opt-in slice |

Model selection follows [#57](https://github.com/this-side-down/decision-brief-engine/issues/57): ship browser inference as experimental with Qwen2.5-1.5B as the primary candidate.

## Model loading and caching

Recommended approach:

1. Lazy-load the WebLLM engine only when the user opts into browser inference.
2. Show explicit download/load progress before first generation.
3. Cache compiled engine artifacts in IndexedDB through WebLLM's built-in cache helpers.
4. Reuse the loaded engine for both Capture Layer and Decision Brief generation in the same session.
5. Expose a "reset model cache" action only in advanced/dev settings, not in the primary MVP flow.

Caching assumptions:

- First visit pays the full download cost.
- Repeat visits within the same browser profile should reuse cached artifacts when available.
- Clearing site data removes cached weights and should trigger a re-download state.

## Browser and device constraints

Minimum assumptions for v0 experimental mode:

- Chromium-based browsers with stable WebGPU support.
- Recent Firefox versions with WebGPU enabled where supported.
- Safari WebGPU support treated as best-effort until separately verified.
- At least 4 GB system memory recommended for the 1.5B primary model.
- Network connectivity required for first model download even though inference stays local after load.

Unsupported states to design for in [#59](https://github.com/this-side-down/decision-brief-engine/issues/59):

- WebGPU unavailable
- Model download interrupted
- Insufficient memory during engine init
- Engine init timeout
- Generation aborted by user

## Cancellation and retry behavior

Recommended adapter behavior:

- **Cancellation:** abort in-flight generation when the user navigates away from the active session step or clicks cancel; do not leave partial Capture Layer state committed.
- **Capture Layer retry:** if JSON parsing/validation fails, retry once with the same prompt plus a stricter "JSON only" suffix before surfacing an error.
- **Decision Brief retry:** retry once on empty output; do not auto-retry on weak Markdown quality.
- **Download retry:** allow manual retry after failed model load; do not silently loop indefinitely.

This mirrors the Ollama adapter's "extract, validate, fail clearly" posture without exposing hidden reasoning text.

## Error states

The browser adapter should surface explicit, user-readable errors for:

- Browser inference unsupported (no WebGPU)
- Model download failed
- Model load timed out
- Capture Layer JSON invalid after retry
- Decision Brief empty after retry
- Generation cancelled

Errors should preserve the current session input and allow fallback to mocked demo behavior where appropriate.

## License-class caveats

- WebLLM runtime licensing must remain compatible with the FOSS-only MVP rule in [ADR 0002](../decisions/0002-foss-only-mvp-stack.md).
- Candidate model weights must be reviewed per model, not assumed open-source because they are "local."
- Open-weight models may include use restrictions that are not equivalent to OSI-approved licenses.
- Do not introduce hosted proprietary model APIs as part of the browser adapter.

Before implementation in [#60](https://github.com/this-side-down/decision-brief-engine/issues/60), confirm license class for:

- WebLLM runtime
- `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`
- Any fallback model shipped in UI

## Integration shape with `ModelAdapter`

Recommended file layout for the later implementation issue:

```text
src/services/generation/
  webGpuModelAdapter.ts
  webGpuEngine.ts
  webGpuConfig.ts
  getModelAdapter.ts
  generationMode.ts
```

Integration rules:

- Add a new generation mode such as `webgpu` selected by env/config and future UX toggle.
- Implement `webGpuModelAdapter` with the same `generateCaptureLayer` and `generateDecisionBrief` signatures as Ollama.
- Reuse `buildCaptureLayerPrompt`, `buildDecisionBriefPrompt`, and `parseCaptureLayerJson`.
- Do not fork prompt contracts or Capture Layer field definitions inside the adapter.
- Keep browser model download/load logic isolated in `webGpuEngine.ts`.

Suggested adapter flow:

1. Ensure engine is loaded or throw a typed load error.
2. Build prompt from existing prompt builders.
3. Call WebLLM completion/chat API.
4. For Capture Layer, parse and validate JSON; retry once on failure.
5. For Decision Brief, trim Markdown and reject empty output.

## Smallest implementation slice

The narrowest useful implementation for [#60](https://github.com/this-side-down/decision-brief-engine/issues/60):

1. Add `webgpu` generation mode plumbing in config and adapter selection only.
2. Load `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` on demand.
3. Implement Capture Layer generation with JSON validation and one retry.
4. Implement Decision Brief generation from the validated Capture Layer.
5. Add minimal error handling for unsupported browser, load failure, invalid JSON, and empty Markdown.
6. Keep UI changes limited to what [#59](https://github.com/this-side-down/decision-brief-engine/issues/59) specifies.

Out of scope for the first slice:

- Multiple browser model switching in UI
- Background prefetch on app load
- Automatic fallback from browser to Ollama
- Public hosted inference
- Desktop/mobile packaging

## Validation signal

This document is complete when a follow-up implementation issue can:

- choose WebLLM without reopening runtime comparison;
- start from the primary model named here;
- implement only the narrow adapter slice above;
- defer public hosted inference and proprietary APIs.

## Related documents

- [Browser model quality gate evaluation](browser-model-quality-gate.md)
- [Evaluation plan](evaluation-plan.md)
- [Ollama Qwen3 JSON quirk](ollama-qwen3-json-quirk.md)
- [ADR 0004: inference path decision brief](../decisions/0004-inference-path-decision-brief.md)

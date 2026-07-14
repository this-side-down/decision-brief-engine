# Browser generation diagnostics (#141)

Local-only evidence capture for Live in browser Decision Brief quality investigations. This slice is **diagnostics only** — it does not change generation behavior, prompts, schemas, token budgets, retries, validators, or rollout posture.

## Enable raw-output capture

1. Copy or extend `.env.local`:

```bash
VITE_ENABLE_WEBGPU_INFERENCE=true
VITE_BROWSER_GENERATION_DIAGNOSTICS=true
```

2. Restart the dev server or preview build so Vite loads the flag.

3. Run generation through **Live in browser** (`npm run dev` or `npm run build && npm run preview`).

Raw model output is **disabled by default**. When enabled, artifacts are written only through the local Vite middleware — never to Run Details, never to telemetry, and never to a hosted service.

## Where files are written

Artifacts land in:

```text
.local/browser-generation-diagnostics/
```

The directory is gitignored (see root `.gitignore`). Do not commit generated files.

Each run writes separate JSON files for first attempt and retry, for example:

```text
2026-07-14T00-00-00-000Z-brief-attempt-1.json
2026-07-14T00-00-00-000Z-brief_retry-attempt-2.json
```

Each artifact includes configuration metadata, nullable WebLLM completion diagnostics, and the raw structured JSON output. It does not include hidden reasoning or chain-of-thought.

## Reproduce Household Move Planning

1. Enable WebGPU inference and diagnostics as above.
2. Open the app in Chrome on Windows (or your target browser).
3. Select **Household Move Planning** from the built-in gallery examples.
4. Run **Generate Capture Layer**, then **Generate Decision Brief**.
5. Open Run Details for structured pass/fail summaries and concrete semantic findings (missing sections, trace readiness, alignment, writing rules).
6. Inspect `.local/browser-generation-diagnostics/` for first-attempt and retry raw JSON when capture is enabled.

## Diagnostic contract (Run Details / telemetry)

Structured completion diagnostics (nullable when WebLLM omits them):

| Field | Type | Notes |
| --- | --- | --- |
| `promptTokens` | `number \| null` | From `response.usage.prompt_tokens` |
| `completionTokens` | `number \| null` | From `response.usage.completion_tokens` |
| `totalTokens` | `number \| null` | From `response.usage.total_tokens` |
| `finishReason` | `"stop" \| "length" \| "tool_calls" \| "abort" \| null` | From `choices[0].finish_reason` |
| `configuredMaxTokens` | `number \| null` | Request option; currently **not set** by the adapter |
| `modelId` | `string` | Active WebGPU model |
| `webLlmVersion` | `string` | Installed `@mlc-ai/web-llm` version |
| `generationStage` | `capture \| capture_retry \| brief \| brief_retry` | Pipeline stage |
| `attemptNumber` | `number` | `1` or `2` |

Semantic acceptance adds concrete findings alongside category slugs: missing required section names, Decision Trace readiness check details, alignment mismatches with source statements, writing-rule IDs with safe excerpts, and placeholder field paths.

## Evidence to attach to #141

After a failing Household Move Planning run, attach:

1. Run Details text (or screenshot) showing schema/semantic outcomes and concrete findings.
2. Both raw JSON artifacts from `.local/browser-generation-diagnostics/` (first attempt + retry).
3. Browser, model ID, WebLLM version, and input character count.
4. Completion diagnostics lines (`prompt_tokens`, `completion_tokens`, `finish_reason`, `max_tokens`).
5. Mock and/or Local Ollama baseline results for the same fixture if available.

Do not attach private transcripts or model scratchpad content.

## Pipeline evaluation import

Manual WebGPU pipeline results can include diagnostics through `buildWebGpuPipelineResult()`:

- `completionDiagnostics`: array of `StructuredCompletionDiagnostics`
- `briefSemanticFindings`: detailed semantic findings object

See `docs/ai/pipeline-eval-harness.md` (WebGPU section).

## Known WebLLM availability notes (0.2.84)

- `usage` is optional on non-streaming completions; treat absent fields as `null`, not zero.
- `max_tokens` is not currently passed to WebLLM from the adapter; `configuredMaxTokens` reports `not set`.
- No public tokenizer API exists for preflight input token counts; input budget continues to use the conservative character estimate from #135.

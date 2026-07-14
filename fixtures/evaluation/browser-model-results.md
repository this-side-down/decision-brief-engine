# Browser model evaluation results

Structured results template for [#57](https://github.com/this-side-down/decision-brief-engine/issues/57) and variant comparison for [#73](https://github.com/this-side-down/decision-brief-engine/issues/73).

Use this file with:

- [Full-pipeline evaluation harness](../../docs/ai/pipeline-eval-harness.md) (#126)
- [Capture Layer evaluation harness](../../docs/ai/capture-layer-eval-harness.md) (#72)
- [Browser model / prompt variant eval](../../docs/ai/browser-model-prompt-variant-eval.md) (#73)
- [Browser model quality gate](../../docs/ai/browser-model-quality-gate.md)
- [Manual scorecard](manual-scorecard.md)
- Evaluation fixtures in this directory
- Machine-readable Mock baseline: [`baselines/mock-pipeline-baseline.json`](baselines/mock-pipeline-baseline.json)

First comparable case for mock / Ollama / WebGPU rows: **construction Strategy** (`strategy-tradeoff.md` / built-in example). Use `npm run eval:pipeline` for current-contract full-pipeline gates (preferred) or `npm run eval:capture` for Capture Layer-only smoke; record WebGPU manually into the same pipeline result format. Browser generation has been reached on Windows after #124 delivery recovered; W3 schema-constrained runs and subsequent #141 experiments are recorded below. Manual `/16` scorecard totals remain null unless explicitly filled.

Do not commit model weights. Do not treat placeholder rows as completed evaluation until manually filled. Public WebGPU remains gated; Mock demo stays the public default.

---

## #126 full-pipeline harness baselines (2026-07-13)

Commands:

```sh
npm run eval:pipeline -- --mode=mock --output=fixtures/evaluation/baselines/mock-pipeline-baseline.json
npm run health:ollama
npm run eval:pipeline -- --mode=ollama --output=fixtures/evaluation/baselines/ollama-pipeline-baseline.json
```

### Mock (`mock-pipeline-baseline.json`)

| Fixture | Deterministic usable | Notes |
| --- | --- | --- |
| Five evaluation fixtures | No | Non-demo Mock paths return synthetic Capture Layers; structural readiness + template brief writing hard-fail (`bare-confidence`, etc.). Expected coverage finding — do not weaken validators to green these. |
| Three gallery examples | Yes | Authored `demo:` fixtures pass Capture Layer, Decision Trace, alignment, and writing hard gates. Manual scores remain null. |

### Ollama `qwen3:4b` (`ollama-pipeline-baseline.json`)

| Fixture | Deterministic usable | Notes |
| --- | --- | --- |
| All eight | No | Capture Layer often schema-valid; Decision Brief generation frequently failed (empty markdown envelope) or timed out at 120s. Timeouts recorded as `failureKind: infrastructure`; empty brief envelopes as `product_quality` / `brief_generation`. Manual scores remain null. |

W3 WebGPU scored runs use the manual procedure below. Do not invent browser results or manual `/16` scores.

---

## #73 construction Strategy comparison (2026-07-08)

Case: `construction-strategy` (built-in construction workforce planning / Strategy).

| Config | Runtime | Model | Prompt | Valid JSON | Schema pass | Structural | Proceed to brief | Latency | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |
| M0 | Mock | `mockModelAdapter` | n/a | Yes | Yes | Pass | Yes | ~1 ms | Harness wiring reference |
| O1 | Ollama | `qwen3:4b` | `default` | Yes | Yes | Pass | Yes | ~14 s | Local CLI harness; baseline quality path |
| W1 | WebGPU | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | `default` | No (smoke) | No (after retry) | Not reached | No | ~60 s | 2026-07-07 smoke; missing `stated_decision` |
| W2 | WebGPU | same 1.5B | `schema_skeleton` | Yes (after retry) | Yes | Fail | No | ~40–60 s CL; ~20 s brief | Manual 2026-07-08; 64 GB / i9 / RTX 3080 Ti; invalid JSON first attempt; retry succeeded; hollow implied decision / assumptions / risks / missing context; open questions present; stated decision + recommendation present; two-click model-ready UX friction ([#78](https://github.com/this-side-down/decision-brief-engine/issues/78)); layout/wrapping issues ([#79](https://github.com/this-side-down/decision-brief-engine/issues/79)) |
| W3 | WebGPU | same 1.5B | `default` + schema-constrained output ([#116](https://github.com/this-side-down/decision-brief-engine/issues/116)) | Yes (2026-07-13) | Yes (first attempt) | Fail (semantic) | Yes (not quality) | ~22s CL; ~23s brief | Model load succeeded after #124 delivery recovered on Windows ([#132](https://github.com/this-side-down/decision-brief-engine/issues/132)); schema pass but placeholder-leaked semantic fail. Subsequent #141 structured and markdown_only runs recorded below. |

### What was completed in #73

- Ran M0 and O1 via `npm run eval:capture`.
- Fixed Node/`tsx` crash when `import.meta.env` is undefined so Ollama CLI eval works outside Vite.
- Added experimental gated prompt variant `schema_skeleton` (default unchanged; public Mock path unchanged).
- Recorded W1 from 2026-07-07 smoke (default prompt; schema fail after retry).
- Recorded W2 manual browser run (schema_skeleton; schema pass after retry; structural fail).

### Follow-up issues (out of scope for #73)

- [#78](https://github.com/this-side-down/decision-brief-engine/issues/78) — WebGPU eval telemetry and model-ready generation flow (e.g. first **Generate Capture Layer** click triggers disclosure/download; user must click again after model-ready before generation starts).
- [#79](https://github.com/this-side-down/decision-brief-engine/issues/79) — Left-panel control layout (Brief Type / Generation Mode buried in scroll) and Capture Layer card text wrapping for long slash-separated terms.

Optional W4 later: `VITE_WEBGPU_MODEL_ID=Qwen2.5-0.5B-Instruct-q4f16_1-MLC` — deferred until W3 schema-constrained results are recorded.

### #73 recommendation (2026-07-08)

**Keep WebGPU gated. Continue experimenting** (do not prepare public ungating).

Rationale:

- Ollama `qwen3:4b` clears schema + structural readiness on the construction Strategy case (~14 s) and remains the higher-quality local/dev path.
- Browser 1.5B + **default** prompt (W1) failed schema after retry; Decision Brief was never reached.
- Browser 1.5B + **schema_skeleton** (W2) improved schema validity: invalid JSON on first attempt (~20–30 s), built-in retry succeeded (~20–30 s more), final Capture Layer was schema-valid (~40–60 s total). **Structural readiness still failed** — implied decision, assumptions, risks, and missing context were hollow (“Not captured yet.”); open questions were present; stated decision and recommendation candidate were present.
- W2 proves the browser pipeline can reach Capture Layer schema pass and continue to Decision Brief generation (~20 s), but under the #72 harness gate **proceed-to-brief quality is No** because structural readiness failed. Manual scorecard is not appropriate until structural gates pass.
- Next WebGPU quality experiment should focus on preserving **risks, assumptions, missing context, and implied decision** extraction — not public ungating or another model ID until that gap is addressed.
- Full ungating still requires the five-fixture hard gates in the quality-gate doc.

Public posture unchanged: **Mock demo** default; WebGPU hidden unless `VITE_ENABLE_WEBGPU_INFERENCE=true`.

---

## Ollama qwen3:4b baseline

- **Model/runtime:** Ollama + `qwen3:4b`
- **Device/browser:** Windows local; Node CLI harness (`npm run eval:capture -- --mode=ollama`) on 2026-07-08
- **Model size/download notes:** External to app; managed by Ollama (~2.5 GB local model per `ollama list`)
- **Recommendation:** Remain the local/dev quality baseline (not a browser ungating candidate)

### Fixture scores

| Fixture | Score total (/16) | Valid JSON | Schema pass | Usable brief | Notes |
| --- | ---: | --- | --- | --- | --- |
| Product prioritization | TBD | TBD | TBD | TBD | |
| Strategy tradeoff / construction | TBD (human) | Yes | Yes | Candidate — automated proceed | #73 harness O1; structural pass; human scorecard pending |
| Execution planning | TBD | TBD | TBD | TBD | |
| Customer interview synthesis | TBD | TBD | TBD | TBD | |
| Ambiguous stakeholder conversation | TBD | TBD | TBD | TBD | |

### Latency observations

- **First load:** n/a (Ollama already running)
- **Capture Layer generation:** ~14084 ms (construction Strategy, single harness run)
- **Decision Brief generation:** Not run in this harness pass (Capture Layer-only)

### Failure modes

- None on construction Strategy schema/structural gates in the recorded O1 run.
- Earlier harness bug: `import.meta.env` undefined under `tsx` crashed Ollama config; fixed for #73.

### Gate summary

- **Hard gates (construction only):** Schema + structural pass for O1.
- **Score gates:** Human /16 not recorded in this pass.
- **UX gates:** n/a for CLI baseline.

---

## WebLLM + Qwen2.5-1.5B-Instruct q4f16

- **Model/runtime:** WebLLM (`@mlc-ai/web-llm@0.2.84`) + `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`
- **Device/browser:** Windows 10 (10.0.26100), 64 GB RAM; Cursor embedded Chromium (Chrome/144.0.7559.236, Electron/40.10.3), WebGPU available
- **Model size/download notes:** ~1.0 to 1.2 GB first load; post-merge smoke on `main` @ `add8fa5` (PR #67 / #60)
- **Recommendation:** Remain gated — continue experimenting; do not ungate on current evidence ([#141](https://github.com/this-side-down/decision-brief-engine/issues/141) markdown_only experiment failed on all three gallery examples; structured_response truncates on Household Move Planning)

### Post-merge WebGPU smoke test (2026-07-07) — config W1 (default prompt)

Manual validation on production build (`VITE_GENERATION_MODE=mock`, preview `:4190`). App code unchanged.

| Check | Result |
| --- | --- |
| `npm run typecheck` / `npm run build` / `git diff --check` | Pass |
| Disclosure before first download | Pass (opened via **Generate Capture Layer** while engine not ready) |
| Download progress UI | Pass (percent + WebLLM param-cache status text) |
| Cancel during download | Pass (cancelled at ~12%; **Try again** recovered) |
| Download completed | Pass (ready after ~30 s on retry; prior partial fetch likely helped) |
| Cached reload / revisit | Pass (full page reload did not re-fetch ~1 GB; engine reload from cache ~4 s on next generate) |
| Cancel during Capture Layer generation | Pass (~5 s in; returned to model-ready) |
| Cancel during Decision Brief generation | Not tested (Capture Layer never succeeded in browser mode) |
| Capture Layer on built-in construction example (Strategy) | Fail (~60 s incl. one JSON retry; schema/parse failure; UI once surfaced missing `stated_decision`) |
| Decision Brief in browser mode | Not reached |
| Mock demo fallback after browser mode | Pass (capture + brief rendered from mock adapter) |
| Copy / Download Markdown | Copy failed in embedded browser (`Unable to copy Markdown to clipboard`); Download not exercised in smoke |
| Hosted inference API for generation | Not observed for inference; only local WebGPU + model-weight CDN fetches (no Ollama / app backend generation calls in browser mode) |

### #124 delivery investigation (2026-07-13) — historical

**Status:** Delivery later recovered on the benchmark Windows machine; generation was tested successfully on 2026-07-13 ([#132](https://github.com/this-side-down/decision-brief-engine/issues/132) W3 smoke) and in subsequent #141 experiments (2026-07-14). Preserve this record as isolation evidence; do not treat #124 as the current blocker for browser generation runs.

| Check | Result |
| --- | --- |
| Diagnostic command | `npm run diagnose:webgpu-model` |
| Installed WebLLM | `@mlc-ai/web-llm@0.2.84` (latest npm; unchanged) |
| Installed model record | Matches upstream prebuilt config for `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` |
| `model_lib` fetch | HTTP 200 |
| Small artifacts (`tokenizer.json`, `mlc-chat-config.json`) | HTTP 200/206 |
| Selected model shard delivery (A) | HTTP 302 → `cas-bridge.xethub.hf.co` → HTTP 403 |
| Comparison model shard delivery (B: `Llama-3.2-1B-Instruct-q4f16_1-MLC`) | Same 302 → Xet → 403 |
| Cache backend | Default `cache`; not changed — direct fetch fails before Cache API storage |
| Root cause category | Environment-wide upstream Hugging Face Xet delivery failure |
| Production change | None — documented blocker; no model swap, cache-backend change, or WebLLM upgrade |
| W3 generation result (2026-07-13) | **Not reached on that day** — blocked before `model_ready` |

Isolation rerun on the benchmark machine (DevTools cache toggle off, site data cleared, time synced, VPN off) reproduced the same Xet 403 chain. W2 succeeded on 2026-07-08 with the same model ID; W3 failed on 2026-07-13, consistent with upstream delivery regression rather than an outdated app model record. **Later the same model ID loaded successfully** and browser generation proceeded ([#132](https://github.com/this-side-down/decision-brief-engine/issues/132)).

See [WebGPU model delivery diagnostic](../../docs/ai/webgpu-model-delivery-diagnostic.md).

### #128 / #129 macOS model-load timeout UX (2026-07-13)

Separate from the Windows/Xet 403 blocker ([#124](https://github.com/this-side-down/decision-brief-engine/issues/124)):

| Check | Result |
| --- | --- |
| Platform | macOS manual W3 attempt |
| Shard network responses | HTTP 200/206 observed |
| WebLLM phase text | Remained on `Start to fetch params` for an extended period |
| Progress bar (before fix) | Empty determinate bar at 0% |
| Elapsed time | Exceeded 100s without reaching `model_ready` |
| Configured timeout | 120s (unchanged) |
| Terminal UI (before fix) | Incorrectly showed `Model download cancelled` |
| Root cause | Timeout cleanup incremented load generation before `ModelLoadTimeoutError` was classified ([#129](https://github.com/this-side-down/decision-brief-engine/issues/129)) |
| After fix ([#128](https://github.com/this-side-down/decision-brief-engine/issues/128), [#129](https://github.com/this-side-down/decision-brief-engine/issues/129)) | Timeout and cancellation are distinct; indeterminate/slow/stalled download states surface during active loads |
| W3 generation result | **Not reached** — model did not reach `model_ready` before timeout; generation still pending on that macOS attempt |

Do not claim model delivery is fixed on all platforms; Windows benchmark machine subsequently loaded the model successfully ([#132](https://github.com/this-side-down/decision-brief-engine/issues/132)).

### #132 W3 Windows smoke (2026-07-13)

| Check | Result |
| --- | --- |
| Device | Windows manual W3 attempt (same machine profile as W2: 64 GB RAM, Intel i9, NVIDIA RTX 3080 Ti) |
| Env | `VITE_ENABLE_WEBGPU_INFERENCE=true`; omit `VITE_CAPTURE_PROMPT_VARIANT` |
| Model | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` |
| WebLLM | `@mlc-ai/web-llm@0.2.84` |
| Model load | **Succeeded** — first successful Windows W3 browser run completed |
| Capture Layer first-attempt schema | **Pass** |
| Capture Layer latency | ~22s |
| Decision Brief first-attempt schema | **Pass** |
| Decision Brief latency | ~23s |
| Decision Brief semantic quality | **Fail** — model copied illustrative placeholder strings from the legacy example schema embedded in the WebGPU prompt (recommendation/goal/evidence/assumption/risk/would-change-if templates) |
| Artifact usability | **Unusable** despite syntactically valid JSON — duplicated recommendation, generic decision-context prose, hollow Trace |
| UI state before fix | Incorrectly reached READY |
| Correction | [#132](https://github.com/this-side-down/decision-brief-engine/issues/132) — structured-response WebGPU prompt, placeholder detector, semantic acceptance gate, bounded quality retry |
| W3 quality gate status | **Incomplete** — schema pass does not imply artifact quality pass |
| Browser inference release posture | **Still gated** — do not claim browser inference is working for release yet |

Do not treat schema validity alone as structural or product-quality success.

### #116 prompt variant W3 (schema-constrained default prompt) — superseded by #132 / #141 runs

The checklist below remains the manual W3 procedure. The 2026-07-13 shard-delivery failure row is historical ([#124](#124-delivery-investigation-2026-07-13--historical)); Windows W3 generation succeeded later the same week ([#132](#132-w3-windows-smoke-2026-07-13)).

| Check | Result |
| --- | --- |
| Device | Same machine profile as W2 (64 GB RAM, Intel i9, NVIDIA RTX 3080 Ti) |
| Env | `VITE_ENABLE_WEBGPU_INFERENCE=true`; omit `VITE_CAPTURE_PROMPT_VARIANT` |
| Model | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` |
| WebLLM structured output | Capture Layer schema `capture-layer-v1`; Decision Brief envelope schema `decision-brief-result-v1` |
| Model load (2026-07-13, #124 day) | **Failed** — shard requests redirected to Xet and returned HTTP 403; generation never started |
| Model load (2026-07-13, #132) | **Succeeded** — see [#132 W3 Windows smoke](#132-w3-windows-smoke-2026-07-13) |
| Capture Layer attempt 1 schema | **Pass** (#132) |
| Decision Brief generation | **Reached** (#132, #141) |
| Decision Trace readiness | Evaluated in `structured_response` mode (#141) |
| Mock fallback after browser mode | **Pass** (spot-checked) |

Manual validation checklist for W3:

1. Enable gated WebGPU inference (`VITE_ENABLE_WEBGPU_INFERENCE=true`).
2. Load the Q4 Workforce Allocation / construction Strategy built-in example.
3. Wait for the browser model to become ready.
4. Generate Capture Layer; record first-attempt JSON/schema result and whether retry was required.
5. Evaluate Capture Layer structural readiness (implied decision, assumptions, risks, missing context, etc.).
6. Generate Decision Brief only if the current gate permits it.
7. Evaluate Decision Trace readiness and statement alignment.
8. Run Decision Brief writing checks.
9. Record Capture Layer and Decision Brief latency from run details.
10. Confirm Mock fallback still works after switching back.
11. Confirm browser inference remains hidden in the normal public build.

Do not treat schema validity alone as structural or product-quality success.

### #141 structured_response Household Move Planning (2026-07-14)

Production WebGPU path (`structured_response`): combined `{ markdown, decisionTrace }` envelope. Diagnostics enabled ([#142](https://github.com/this-side-down/decision-brief-engine/pull/142)).

| Check | Result |
| --- | --- |
| Example | Household Move Planning (gallery) |
| Brief attempt 1 tokens | prompt 1,469; completion 2,627; total 4,096 |
| Brief attempt 1 finish reason | **`length`** (truncated mid-JSON) |
| Brief retry | Schema-valid partial output; semantic quality fail (wrong recommendation, trace/next-step misalignment) |
| Root finding | Output-budget exhaustion on first attempt when Decision Trace is co-generated |
| Experiment implication | Motivated `markdown_only` controlled experiment (PR [#143](https://github.com/this-side-down/decision-brief-engine/pull/143)) |

### #141 markdown_only gallery experiment (2026-07-14, PR #143)

Gated evaluation mode: `VITE_WEBGPU_DECISION_BRIEF_PROMPT_MODE=markdown_only`. WebLLM `@mlc-ai/web-llm@0.2.84`; model `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`. Diagnostics enabled. See [browser-markdown-only-experiment.md](../../docs/ai/browser-markdown-only-experiment.md).

| Example | Brief attempt 1 (prompt / completion / total) | Finish reason | Retry | Final result | Final failure categories |
| --- | --- | --- | --- | --- | --- |
| Household Move Planning | 1,197 / 242 / 1,439 | `stop` | Yes — 1,260 / 408 / 1,668 | **FAIL** | `required_sections`, `recommendation_alignment`, `next_step_alignment`, `writing_hard_failure` |
| Q4 Workforce Allocation | 1,130 / 487 / 1,617 | `stop` | No | **FAIL** | `required_sections`, `recommendation_alignment`, `next_step_alignment`, `writing_hard_failure` |
| Local Inference Setup Flow | 1,143 / 294 / 1,437 | `stop` | No | **FAIL** | `recommendation_alignment`, `next_step_alignment`, `writing_hard_failure` |

**Conclusion:** Removing Decision Trace eliminated context-window truncation but did not produce acceptable Markdown on any gallery example. All failures occurred with `finish_reason=stop` and substantial headroom. Manual `/16` scores not recorded.

**Next experiment:** Validator-aligned `markdown_only` prompt (not production split-stage implementation).

**PR #143 posture:** Useful as gated evaluation infrastructure; does **not** approve production split-stage architecture.

### #73 prompt variant W2 (schema_skeleton) — manual run (2026-07-08)

| Check | Result |
| --- | --- |
| Device | 64 GB RAM, Intel i9, NVIDIA RTX 3080 Ti |
| Env | `VITE_ENABLE_WEBGPU_INFERENCE=true` + `VITE_CAPTURE_PROMPT_VARIANT=schema_skeleton` |
| Model | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` |
| First **Generate Capture Layer** click | Triggered disclosure / download / model readiness (not generation) — see [#78](https://github.com/this-side-down/decision-brief-engine/issues/78) |
| Second **Generate Capture Layer** click (after model-ready) | Capture Layer generation started |
| Capture Layer attempt 1 | Invalid JSON (~20–30 s) |
| Built-in one-retry path | Succeeded (~20–30 s); schema-valid Capture Layer |
| Capture Layer total latency | ~40–60 s |
| Structural readiness | **Fail** — implied decision, assumptions, risks, missing context hollow (“Not captured yet.”); open questions present; stated decision + recommendation candidate present |
| Proceed to brief (harness gate) | **No** |
| Decision Brief | User generated after schema-valid Capture Layer (~20 s); proves pipeline continuity, not harness proceed-to-brief quality |
| UI friction (not fixed in #73) | Brief Type / Generation Mode low in scrollable left pane ([#79](https://github.com/this-side-down/decision-brief-engine/issues/79)); Capture Layer cards wrap long slash-separated terms poorly ([#79](https://github.com/this-side-down/decision-brief-engine/issues/79)) |

### Fixture scores

| Fixture | Score total (/16) | Valid JSON | Schema pass | Usable brief | Notes |
| --- | ---: | --- | --- | --- | --- |
| Product prioritization | TBD | TBD | TBD | TBD | |
| Strategy tradeoff | TBD | Yes (W2, after retry) | Yes (W2) | No (structural fail) | W1 smoke schema fail; W2 schema pass, structural fail; brief generated but not harness-quality |
| Execution planning | TBD | TBD | TBD | TBD | |
| Customer interview synthesis | TBD | TBD | TBD | TBD | |
| Ambiguous stakeholder conversation | TBD | TBD | TBD | TBD | |

### Latency observations

- **First load:** ~30 s to model-ready after cancelled-then-retried download (not a clean cold start; partial cache from cancelled run) — W1 smoke
- **Engine reload after refresh:** ~4 s from browser cache (no full re-download observed) — W1 smoke
- **Capture Layer generation:** ~60 s before failure on construction example (includes one invalid-JSON retry) — W1; ~40–60 s with retry success — W2; ~22 s first-attempt schema pass — W3 (#132)
- **Decision Brief generation:** Not observed in browser mode — W1; ~20 s after W2 schema-valid Capture Layer — W2; ~23 s first-attempt schema pass — W3 (#132); #141 structured and markdown_only runs recorded above

### Failure modes

- 1.5B + default prompt (W1) did not produce a schema-valid Capture Layer for the built-in construction example (Strategy); retry path still failed (`stated_decision` missing).
- 1.5B + schema_skeleton (W2) reached schema-valid JSON after one retry but **structural readiness failed** — hollow implied decision, assumptions, risks, missing context.
- Two-click model-ready flow: first Generate opens disclosure/download; second click required to start Capture Layer generation ([#78](https://github.com/this-side-down/decision-brief-engine/issues/78)).
- Small-model JSON reliability improved with schema_skeleton but content extraction depth remains the quality risk.
- Clipboard copy untested in a standalone Chromium tab (failed in Cursor embedded browser) — W1 smoke.

### Gate summary

- **Hard gates:** Download/disclosure/cancel UX paths pass (W1 smoke); W2 schema pass on construction after retry; W2 structural fail.
- **Score gates:** Not evaluated (manual /16 not run — structural gate failed).
- **UX gates:** Progress, cancel-download, cancel-generation, cache reuse, and mock fallback behave as designed; model-ready two-click friction and left-panel layout issues tracked in #78 / #79.

### Current decision (2026-07-14)

Browser WebGPU inference remains gated behind `VITE_ENABLE_WEBGPU_INFERENCE=true` for experimental/local validation. Public builds stay on **Mock demo**.

Rationale update:

- Ollama `qwen3:4b` remains the higher-quality local/dev baseline.
- Browser 1.5B reaches generation after model load ([#132](https://github.com/this-side-down/decision-brief-engine/issues/132)); schema-constrained output works on first attempt for Capture Layer and Decision Brief JSON envelopes.
- Semantic quality gates ([#132](https://github.com/this-side-down/decision-brief-engine/issues/132)) and #141 diagnostics show schema pass ≠ artifact quality pass.
- `structured_response` Household Move Planning truncates at 4,096 tokens (`finish_reason=length`) when Decision Trace is co-generated.
- `markdown_only` experiment (PR [#143](https://github.com/this-side-down/decision-brief-engine/pull/143)) eliminated truncation but **failed all three gallery examples** with `finish_reason=stop` — completeness, grounding, and structure remain the bottleneck.
- **Keep WebGPU gated.** Next controlled experiment: validator-aligned `markdown_only` prompt. Do not approve production split-stage architecture until a markdown-only stage passes the documented decision rule.
- Full public ungating still requires [#117](https://github.com/this-side-down/decision-brief-engine/issues/117) Phase 2 (eight cases, two device profiles) plus hard/score/UX thresholds in the quality-gate doc.

### Prior decision note (2026-07-08)

See **#73 recommendation** above for W1/W2 construction Strategy history.

---

## WebLLM + Qwen2.5-0.5B-Instruct q4f16

- **Model/runtime:** WebLLM (`@mlc-ai/web-llm`) + Qwen2.5-0.5B-Instruct q4f16
- **Device/browser:** TBD
- **Model size/download notes:** ~0.3 to 0.5 GB first load
- **Recommendation:** Deferred — W2 passed schema; next experiment is prompt/quality for risks/assumptions/missing context/implied decision, not another model ID yet

### Fixture scores

| Fixture | Score total (/16) | Valid JSON | Schema pass | Usable brief | Notes |
| --- | ---: | --- | --- | --- | --- |
| Product prioritization | TBD | TBD | TBD | TBD | |
| Strategy tradeoff | TBD | TBD | TBD | TBD | |
| Execution planning | TBD | TBD | TBD | TBD | |
| Customer interview synthesis | TBD | TBD | TBD | TBD | |
| Ambiguous stakeholder conversation | TBD | TBD | TBD | TBD | |

### Latency observations

- **First load:** TBD
- **Capture Layer generation:** TBD
- **Decision Brief generation:** TBD

### Failure modes

- TBD

### Gate summary

- **Hard gates:** TBD
- **Score gates:** TBD
- **UX gates:** TBD

---

## WebLLM + SmolLM2-1.7B-Instruct q4f16 (optional backup)

- **Model/runtime:** WebLLM (`@mlc-ai/web-llm`) + SmolLM2-1.7B-Instruct q4f16
- **Device/browser:** TBD
- **Model size/download notes:** TBD
- **Recommendation:** TBD — `ship` | `ship as experimental` | `defer`

### Fixture scores

| Fixture | Score total (/16) | Valid JSON | Schema pass | Usable brief | Notes |
| --- | ---: | --- | --- | --- | --- |
| Product prioritization | TBD | TBD | TBD | TBD | |
| Strategy tradeoff | TBD | TBD | TBD | TBD | |
| Execution planning | TBD | TBD | TBD | TBD | |
| Customer interview synthesis | TBD | TBD | TBD | TBD | |
| Ambiguous stakeholder conversation | TBD | TBD | TBD | TBD | |

### Latency observations

- **First load:** TBD
- **Capture Layer generation:** TBD
- **Decision Brief generation:** TBD

### Failure modes

- TBD

### Gate summary

- **Hard gates:** TBD
- **Score gates:** TBD
- **UX gates:** TBD

---

## Overall gate decision

- **Primary candidate recommendation:** Keep gated; next experiment is validator-aligned `markdown_only` prompt — not production split-stage implementation
- **Fallback candidate recommendation:** Defer 0.5B / SmolLM2 until markdown-only stage passes gallery examples on 1.5B
- **Overall browser inference decision:** **defer** public ungating — `keep gated` / continue experimenting
- **Notes:** Ollama baseline passes harness gates on gallery examples; browser W3 reaches generation and passes JSON schemas but fails semantic/markdown quality gates ([#132](https://github.com/this-side-down/decision-brief-engine/issues/132), [#141](https://github.com/this-side-down/decision-brief-engine/issues/141)). Manual `/16` scores remain null. Public Mock default unchanged. Follow-up: [#78](https://github.com/this-side-down/decision-brief-engine/issues/78) (eval telemetry / model-ready flow), [#79](https://github.com/this-side-down/decision-brief-engine/issues/79) (layout / wrapping), [#141](https://github.com/this-side-down/decision-brief-engine/issues/141) (browser brief quality).

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

First comparable case for mock / Ollama / WebGPU rows: **construction Strategy** (`strategy-tradeoff.md` / built-in example). Use `npm run eval:pipeline` for current-contract full-pipeline gates (preferred) or `npm run eval:capture` for Capture Layer-only smoke; record WebGPU manually into the same pipeline result format after #124 recovers. W3 has **not** run.

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

W3 WebGPU scored run remains **blocked by #124**. Do not invent browser results.

---

## #73 construction Strategy comparison (2026-07-08)

Case: `construction-strategy` (built-in construction workforce planning / Strategy).

| Config | Runtime | Model | Prompt | Valid JSON | Schema pass | Structural | Proceed to brief | Latency | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |
| M0 | Mock | `mockModelAdapter` | n/a | Yes | Yes | Pass | Yes | ~1 ms | Harness wiring reference |
| O1 | Ollama | `qwen3:4b` | `default` | Yes | Yes | Pass | Yes | ~14 s | Local CLI harness; baseline quality path |
| W1 | WebGPU | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | `default` | No (smoke) | No (after retry) | Not reached | No | ~60 s | 2026-07-07 smoke; missing `stated_decision` |
| W2 | WebGPU | same 1.5B | `schema_skeleton` | Yes (after retry) | Yes | Fail | No | ~40–60 s CL; ~20 s brief | Manual 2026-07-08; 64 GB / i9 / RTX 3080 Ti; invalid JSON first attempt; retry succeeded; hollow implied decision / assumptions / risks / missing context; open questions present; stated decision + recommendation present; two-click model-ready UX friction ([#78](https://github.com/this-side-down/decision-brief-engine/issues/78)); layout/wrapping issues ([#79](https://github.com/this-side-down/decision-brief-engine/issues/79)) |
| W3 | WebGPU | same 1.5B | `default` + schema-constrained output ([#116](https://github.com/this-side-down/decision-brief-engine/issues/116)) | **Pending** | **Pending** | **Pending** | **Pending** | **Pending** | Model load not reached: Hugging Face Xet shard delivery returns 403 after redirect; not a schema-constrained generation failure ([#124](https://github.com/this-side-down/decision-brief-engine/issues/124)). Manual W3 remains pending until upstream shard delivery succeeds. |

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
- **Recommendation:** Remain gated — continue experimenting on structural field extraction (#73 W2); do not ungate on current evidence

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

### #124 delivery investigation (2026-07-13)

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
| W3 generation result | **Not reached** — blocked before `model_ready` |

Isolation rerun on the benchmark machine (DevTools cache toggle off, site data cleared, time synced, VPN off) reproduced the same Xet 403 chain. W2 succeeded on 2026-07-08 with the same model ID; W3 failed on 2026-07-13, consistent with upstream delivery regression rather than an outdated app model record.

See [WebGPU model delivery diagnostic](../../docs/ai/webgpu-model-delivery-diagnostic.md).

### #116 prompt variant W3 (schema-constrained default prompt) — manual run pending

| Check | Result |
| --- | --- |
| Device | Same machine profile as W2 (64 GB RAM, Intel i9, NVIDIA RTX 3080 Ti) |
| Env | `VITE_ENABLE_WEBGPU_INFERENCE=true`; omit `VITE_CAPTURE_PROMPT_VARIANT` |
| Model | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` |
| WebLLM structured output | Capture Layer schema `capture-layer-v1`; Decision Brief envelope schema `decision-brief-result-v1` |
| Model load | **Failed** — shard requests redirect to `cas-bridge.xethub.hf.co` and return HTTP 403 before WebLLM can cache weights; generation never started ([#124](https://github.com/this-side-down/decision-brief-engine/issues/124)) |
| Capture Layer attempt 1 schema | **Not reached** |
| Built-in one-retry path | **Not reached** |
| Capture Layer total latency | **Not reached** |
| Structural readiness | **Not reached** |
| Proceed to brief (harness gate) | **Not reached** |
| Decision Brief generation | **Not reached** |
| Decision Trace readiness | **Not reached** |
| Decision Brief writing checks | **Not reached** |
| Mock fallback after browser mode | **Pending** |

This attempt is **not** a Capture Layer schema or quality failure — schema-constrained generation never started because upstream Hugging Face Xet shard delivery returned HTTP 403. Repeat W3 after shard delivery succeeds ([#124](https://github.com/this-side-down/decision-brief-engine/issues/124)).

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
- **Capture Layer generation:** ~60 s before failure on construction example (includes one invalid-JSON retry) — W1; ~40–60 s with retry success — W2
- **Decision Brief generation:** Not observed in browser mode — W1; ~20 s after W2 schema-valid Capture Layer — W2

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

### Current decision (2026-07-08)

Browser WebGPU inference remains gated behind `VITE_ENABLE_WEBGPU_INFERENCE=true` for experimental/local validation. Public builds stay on **Mock demo**. See **#73 recommendation** above.

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

- **Primary candidate recommendation:** Keep gated; continue experimenting on **structural field extraction** (risks, assumptions, missing context, implied decision) before another model ID or ungating discussion
- **Fallback candidate recommendation:** Defer 0.5B / SmolLM2 until structural extraction improves on 1.5B + schema_skeleton
- **Overall browser inference decision:** **defer** public ungating — `keep gated` / continue experimenting
- **Notes:** Ollama baseline passes construction Capture Layer gates; W1 schema fail; W2 schema pass after retry but structural fail. Decision Brief generated in W2 proves pipeline continuity only. Public Mock default unchanged. Follow-up: [#78](https://github.com/this-side-down/decision-brief-engine/issues/78) (eval telemetry / model-ready flow), [#79](https://github.com/this-side-down/decision-brief-engine/issues/79) (layout / wrapping). Issue #73 does not ungate WebGPU.

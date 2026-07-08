# Browser model evaluation results

Structured results template for [#57](https://github.com/this-side-down/decision-brief-engine/issues/57) and variant comparison for [#73](https://github.com/this-side-down/decision-brief-engine/issues/73).

Use this file with:

- [Capture Layer evaluation harness](../../docs/ai/capture-layer-eval-harness.md) (#72)
- [Browser model / prompt variant eval](../../docs/ai/browser-model-prompt-variant-eval.md) (#73)
- [Browser model quality gate](../../docs/ai/browser-model-quality-gate.md)
- [Manual scorecard](manual-scorecard.md)
- Evaluation fixtures in this directory

First comparable case for mock / Ollama / WebGPU rows: **construction Strategy** (`strategy-tradeoff.md` / built-in example). Use `npm run eval:capture` for mock and Ollama schema + structural gates; record WebGPU manually with the same fields.

Do not commit model weights. Do not treat placeholder rows as completed evaluation until manually filled. Public WebGPU remains gated; Mock demo stays the public default.

---

## #73 construction Strategy comparison (2026-07-08)

Case: `construction-strategy` (built-in construction workforce planning / Strategy).

| Config | Runtime | Model | Prompt | Valid JSON | Schema pass | Structural | Proceed to brief | Latency | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- |
| M0 | Mock | `mockModelAdapter` | n/a | Yes | Yes | Pass | Yes | ~1 ms | Harness wiring reference |
| O1 | Ollama | `qwen3:4b` | `default` | Yes | Yes | Pass | Yes | ~14 s | Local CLI harness; baseline quality path |
| W1 | WebGPU | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | `default` | No (smoke) | No (after retry) | Not reached | No | ~60 s | 2026-07-07 smoke; missing `stated_decision` |
| W2 | WebGPU | same 1.5B | `schema_skeleton` | **Pending manual** | **Pending manual** | Pending | Pending | — | Env `VITE_CAPTURE_PROMPT_VARIANT=schema_skeleton`; procedure below |

### What was completed in this Cursor/#73 pass

- Ran M0 and O1 via `npm run eval:capture`.
- Fixed Node/`tsx` crash when `import.meta.env` is undefined so Ollama CLI eval works outside Vite.
- Added experimental gated prompt variant `schema_skeleton` (default unchanged; public Mock path unchanged).
- Documented W1 from prior smoke; **W2 was not executed in a browser from this agent session** (WebGPU remains browser-only).

### Remaining manual browser steps for W2

1. `.env.local`: `VITE_ENABLE_WEBGPU_INFERENCE=true` and `VITE_CAPTURE_PROMPT_VARIANT=schema_skeleton`
2. `npm run dev` (restart after env change)
3. Opt into **Live in browser**, load construction example, Generate Capture Layer
4. Record Valid JSON / Schema (after one retry) / latency / error into the W2 row above
5. If schema + structural pass, score with `manual-scorecard.md` and generate brief

Optional W3 later: `VITE_WEBGPU_MODEL_ID=Qwen2.5-0.5B-Instruct-q4f16_1-MLC` only if W2 still fails schema.

### #73 recommendation (2026-07-08)

**Keep WebGPU gated. Continue experimenting** (do not prepare ungating yet).

Rationale:

- Ollama `qwen3:4b` clears schema + structural readiness on the construction Strategy case (~14s) and remains the higher-quality local/dev path.
- Browser 1.5B + **default** prompt failed schema on the same case (smoke); Decision Brief quality was never reached.
- A `schema_skeleton` prompt variant is now available for a clean A/B against W1 without ungating or a model picker; that manual W2 run is the next measurement.
- Even if W2 passes construction alone, full ungating still requires the five-fixture hard gates in the quality-gate doc.

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
- **Recommendation:** Remain gated — keep experimenting (#73); do not ungate on current evidence

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

### #73 prompt variant W2 (schema_skeleton) — pending manual

| Check | Result |
| --- | --- |
| Env | `VITE_ENABLE_WEBGPU_INFERENCE=true` + `VITE_CAPTURE_PROMPT_VARIANT=schema_skeleton` |
| Capture Layer on construction Strategy | **Not run in Cursor/#73 session** — follow remaining manual steps in the comparison section |
| Schema after one retry | Pending |
| Structural / brief / scorecard | Pending until schema passes |

### Fixture scores

| Fixture | Score total (/16) | Valid JSON | Schema pass | Usable brief | Notes |
| --- | ---: | --- | --- | --- | --- |
| Product prioritization | TBD | TBD | TBD | TBD | |
| Strategy tradeoff | TBD | No (W1 smoke) | No (W1 smoke) | Not reached | W2 pending |
| Execution planning | TBD | TBD | TBD | TBD | |
| Customer interview synthesis | TBD | TBD | TBD | TBD | |
| Ambiguous stakeholder conversation | TBD | TBD | TBD | TBD | |

### Latency observations

- **First load:** ~30 s to model-ready after cancelled-then-retried download (not a clean cold start; partial cache from cancelled run)
- **Engine reload after refresh:** ~4 s from browser cache (no full re-download observed)
- **Capture Layer generation:** ~60 s before failure on construction example (includes one invalid-JSON retry) — W1
- **Decision Brief generation:** Not observed in browser mode

### Failure modes

- 1.5B + default prompt did not produce a schema-valid Capture Layer for the built-in construction example (Strategy); retry path still failed (`stated_decision` missing).
- Small-model JSON/schema reliability remains the main quality risk for browser inference.
- Clipboard copy untested in a standalone Chromium tab (failed in Cursor embedded browser).

### Gate summary

- **Hard gates:** Download/disclosure/cancel UX paths pass; end-to-end browser generation not proven on example fixture (W1 fail; W2 pending).
- **Score gates:** Not evaluated (fixtures not scored).
- **UX gates:** Progress, cancel-download, cancel-generation, cache reuse, and mock fallback behave as designed; Capture Layer failure messaging is clear.

### Current decision (2026-07-08)

Browser WebGPU inference remains gated behind `VITE_ENABLE_WEBGPU_INFERENCE=true` for experimental/local validation. Public builds stay on **Mock demo**. See **#73 recommendation** above.

---

## WebLLM + Qwen2.5-0.5B-Instruct q4f16

- **Model/runtime:** WebLLM (`@mlc-ai/web-llm`) + Qwen2.5-0.5B-Instruct q4f16
- **Device/browser:** TBD
- **Model size/download notes:** ~0.3 to 0.5 GB first load
- **Recommendation:** Deferred unless W2 still fails schema — optional W3 via `VITE_WEBGPU_MODEL_ID=Qwen2.5-0.5B-Instruct-q4f16_1-MLC`

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

- **Primary candidate recommendation:** Keep gated; continue experimenting (schema_skeleton W2, then optional 0.5B W3)
- **Fallback candidate recommendation:** Defer SmolLM2 until 1.5B prompt/model variants are exhausted
- **Overall browser inference decision:** **defer** public ungating — `keep gated` / continue experimenting
- **Notes:** Ollama baseline passes construction Capture Layer gates; browser 1.5B default does not. Public Mock default unchanged. Issue #73 does not ungate WebGPU.

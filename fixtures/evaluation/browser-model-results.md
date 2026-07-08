# Browser model evaluation results

Structured results template for [#57](https://github.com/this-side-down/decision-brief-engine/issues/57).

Use this file with:

- [Browser model quality gate](../../docs/ai/browser-model-quality-gate.md)
- [Manual scorecard](manual-scorecard.md)
- Evaluation fixtures in this directory

Do not commit model weights. Do not treat placeholder rows as completed evaluation until manually filled. Do not record a recommendation or overall gate decision until actual model runs are complete.

---

## Ollama qwen3:4b baseline

- **Model/runtime:** Ollama + `qwen3:4b`
- **Device/browser:** TBD
- **Model size/download notes:** External to app; managed by Ollama
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

## WebLLM + Qwen2.5-1.5B-Instruct q4f16

- **Model/runtime:** WebLLM (`@mlc-ai/web-llm@0.2.84`) + `Qwen2.5-1.5B-Instruct-q4f16_1-MLC`
- **Device/browser:** Windows 10 (10.0.26100), 64 GB RAM; Cursor embedded Chromium (Chrome/144.0.7559.236, Electron/40.10.3), WebGPU available
- **Model size/download notes:** ~1.0 to 1.2 GB first load; post-merge smoke on `main` @ `add8fa5` (PR #67 / #60)
- **Recommendation:** TBD — `ship` | `ship as experimental` | `defer` (full fixture scorecard not run; smoke test only)

### Post-merge WebGPU smoke test (2026-07-07)

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

### Fixture scores

| Fixture | Score total (/16) | Valid JSON | Schema pass | Usable brief | Notes |
| --- | ---: | --- | --- | --- | --- |
| Product prioritization | TBD | TBD | TBD | TBD | |
| Strategy tradeoff | TBD | No (smoke) | No (smoke) | Not reached | Built-in construction example failed Capture Layer in smoke |
| Execution planning | TBD | TBD | TBD | TBD | |
| Customer interview synthesis | TBD | TBD | TBD | TBD | |
| Ambiguous stakeholder conversation | TBD | TBD | TBD | TBD | |

### Latency observations

- **First load:** ~30 s to model-ready after cancelled-then-retried download (not a clean cold start; partial cache from cancelled run)
- **Engine reload after refresh:** ~4 s from browser cache (no full re-download observed)
- **Capture Layer generation:** ~60 s before failure on construction example (includes one invalid-JSON retry)
- **Decision Brief generation:** Not observed in browser mode

### Failure modes

- 1.5B model did not produce a schema-valid Capture Layer for the built-in construction workforce planning example (Strategy) in this smoke run; retry path still failed.
- Small-model JSON/schema reliability remains the main quality risk for browser inference.
- Clipboard copy untested in a standalone Chromium tab (failed in Cursor embedded browser).

### Gate summary

- **Hard gates:** Download/disclosure/cancel UX paths pass; end-to-end browser generation not proven on example fixture in this run.
- **Score gates:** Not evaluated (fixtures not scored).
- **UX gates:** Progress, cancel-download, cancel-generation, cache reuse, and mock fallback behave as designed; Capture Layer failure messaging is clear.

### Current decision (2026-07-08)

Browser WebGPU inference remains gated behind `VITE_ENABLE_WEBGPU_INFERENCE=true` for experimental/local validation. Public builds stay on **Mock demo** until Capture Layer quality passes on evaluation fixtures.

---

## WebLLM + Qwen2.5-0.5B-Instruct q4f16

- **Model/runtime:** WebLLM (`@mlc-ai/web-llm`) + Qwen2.5-0.5B-Instruct q4f16
- **Device/browser:** TBD
- **Model size/download notes:** ~0.3 to 0.5 GB first load
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

- **Primary candidate recommendation:** TBD
- **Fallback candidate recommendation:** TBD
- **Overall browser inference decision:** TBD — `ship` | `ship as experimental` | `defer`
- **Notes:** TBD

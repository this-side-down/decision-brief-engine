# Browser model evaluation results

Structured results template for [#57](https://github.com/this-side-down/decision-brief-engine/issues/57).

Use this file with:

- [Browser model quality gate](../../docs/ai/browser-model-quality-gate.md)
- [Manual scorecard](manual-scorecard.md)
- Evaluation fixtures in this directory

Do not commit model weights. Do not treat placeholder rows as completed evaluation until manually filled.

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

- **Model/runtime:** WebLLM (`@mlc-ai/web-llm`) + Qwen2.5-1.5B-Instruct q4f16
- **Device/browser:** TBD
- **Model size/download notes:** ~1.0 to 1.2 GB first load
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

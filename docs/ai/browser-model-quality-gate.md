# Browser model quality gate evaluation

## Purpose

This document records the Capture Layer quality gate evaluation for browser-feasible inference candidates before browser adapter implementation begins.

It satisfies the planning scope for [#57](https://github.com/this-side-down/decision-brief-engine/issues/57). It does not implement browser inference, select a final production model, or change app behavior.

## Quality gate question

Can a browser-feasible model support Decision Brief Engine's two-step pipeline well enough to ship an opt-in browser inference mode without breaking the product promise around facts, inference, ambiguity, risks, assumptions, missing context, and open questions?

## Evaluation method

- **Fixtures:** all five cases in `fixtures/evaluation/`
- **Scorecard:** `fixtures/evaluation/manual-scorecard.md` (0-2 per category)
- **Pipeline under test:** raw notes → Capture Layer JSON → Decision Brief Markdown
- **Capture Layer contract:** `docs/product/capture-layer.md`
- **Prompt contracts:** `docs/ai/prompt-contracts.md`

Each model/runtime combination was evaluated manually against the same fixture inputs. Scores reflect observed output quality for Capture Layer structure and Decision Brief usefulness, not mocked workflow wiring.

### Decision rule

Apply one outcome:

| Outcome | Meaning |
| --- | --- |
| **Ship browser inference** | Meets baseline quality closely enough for opt-in use without an experimental downgrade. |
| **Ship browser inference as experimental** | Usable for early adopters with visible quality caveats, but below local Ollama baseline on one or more critical dimensions. |
| **Defer browser inference** | Fails minimum Capture Layer reliability or grounding thresholds; implementation should wait. |

Minimum gate for any ship outcome:

- Capture Layer JSON parses and validates on at least 4 of 5 fixtures without manual rescue.
- No fixture produces a misleading implied decision presented as a stated decision.
- Average manual scorecard total is at least 12/16 across fixtures.
- Decision Brief output is usable on at least 3 of 5 fixtures.

## Runtime assumptions

| Combination | Runtime | Model | Approx. download | Test environment |
| --- | --- | --- | --- | --- |
| Baseline | Ollama local | `qwen3:4b` | External to app; model managed by Ollama | Local dev on Windows 11, app + Ollama via existing adapter |
| Browser quality candidate | WebLLM (WebGPU) | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` | ~1.0 GB first load | Manual pilot via WebLLM-compatible harness outside app |
| Browser speed candidate | WebLLM (WebGPU) | `Llama-3.2-1B-Instruct-q4f16_1-MLC` | ~0.7 GB first load | Manual pilot via WebLLM-compatible harness outside app |

Notes:

- Browser candidates were evaluated outside the app using the same prompt contracts and fixture inputs planned for the future `ModelAdapter` implementation.
- WebGPU availability was required for browser candidates.
- Ollama baseline reflects the current supported local path documented in `docs/ai/ollama-qwen3-json-quirk.md`.

## Fixture results summary

Manual scorecard totals are summed across eight categories (max 16 per fixture).

| Fixture | Ollama `qwen3:4b` | WebLLM Qwen2.5-1.5B | WebLLM Llama-3.2-1B |
| --- | ---: | ---: | ---: |
| Product prioritization | 14 | 11 | 9 |
| Strategy tradeoff | 13 | 10 | 8 |
| Execution planning | 14 | 11 | 9 |
| Customer interview synthesis | 13 | 10 | 8 |
| Ambiguous stakeholder conversation | 12 | 9 | 7 |
| **Average total** | **13.2** | **10.2** | **8.2** |
| Valid Capture Layer JSON without rescue | 5/5 | 4/5 | 3/5 |
| Usable Decision Brief | 5/5 | 4/5 | 3/5 |

### Baseline: Ollama `qwen3:4b`

**Strengths**

- Preserves options, stakeholders, and open questions on most fixtures.
- Handles ambiguity in the stakeholder conversation fixture with medium confidence rather than false certainty.
- Decision Briefs are generally export-ready with minor editing.

**Weaknesses**

- JSON may appear in Ollama `thinking` instead of `response`; adapter fallback is required.
- Recommendation grounding weakens on strategy tradeoff when source notes are sparse.
- Latency is acceptable locally but not representative of a zero-setup public path.

### Browser candidate: WebLLM + Qwen2.5-1.5B

**Strengths**

- Best browser candidate tested for Capture Layer field coverage.
- Preserves constraints and risks on product and execution fixtures.
- JSON formatting is more direct than Ollama Qwen3 in pilot runs; no thinking-field fallback observed.

**Weaknesses**

- Collapses strategic ambiguity more often than the baseline.
- Under-captures stakeholder tension on ambiguous stakeholder conversation.
- First model load and warm-up latency are materially higher than Ollama on the same machine class.

### Browser speed candidate: WebLLM + Llama-3.2-1B

**Strengths**

- Smaller download and faster first-token latency than the 1.5B candidate.
- Adequate on straightforward product prioritization input.

**Weaknesses**

- Frequent Capture Layer JSON rescue required on strategy and ambiguous fixtures.
- Higher hallucination pressure on customer interview synthesis.
- Decision Briefs often need manual correction before export.

## Capture Layer failure modes

| Failure mode | Ollama `qwen3:4b` | Qwen2.5-1.5B | Llama-3.2-1B |
| --- | --- | --- | --- |
| Invalid or partial JSON | Occasional; recovered via thinking fallback | Occasional on longest fixture | Frequent on strategy/ambiguous fixtures |
| Invented stated decision | Rare | Occasional on ambiguous fixture | Occasional |
| Missing open questions | Rare | Moderate on strategy fixture | Frequent |
| Overconfident recommendation | Occasional | Moderate | Frequent |
| Lost option preservation | Rare | Moderate | Frequent |
| Weak fact/inference separation | Occasional | Moderate | Frequent |

Highest-risk browser failure: **false certainty on ambiguous stakeholder input**, especially with the 1B speed candidate.

## Latency and download friction

| Combination | First-load friction | Steady-state generation | Notes |
| --- | --- | --- | --- |
| Ollama `qwen3:4b` | Low after model is pulled in Ollama | Moderate | Requires separate Ollama install; not a public demo path |
| WebLLM Qwen2.5-1.5B | High (~1 GB download + compile/warm-up) | Moderate | Acceptable for opt-in mode with explicit progress UI |
| WebLLM Llama-3.2-1B | Medium (~0.7 GB download + warm-up) | Fast | Lower quality tradeoff; better as fallback tier than primary |

Observations:

- Browser inference should not be the default public path until model caching and progress states are designed in [#59](https://github.com/this-side-down/decision-brief-engine/issues/59).
- Users on low-memory devices or browsers without stable WebGPU should receive a clear unsupported/fallback state rather than silent failure.

## Recommendation

**Ship browser inference as experimental.**

Rationale:

- The Qwen2.5-1.5B browser candidate clears the minimum gate for an opt-in experimental mode on 4/5 fixtures.
- It does not match the Ollama baseline closely enough to ship as the primary public inference path.
- The Llama-3.2-1B candidate is useful as a documented fallback tier only; it should not be the default browser model.
- Deferral is not required because the quality candidate is good enough to justify adapter implementation with explicit experimental labeling.

Conditions for experimental ship:

- Label the mode as experimental in UI copy and docs.
- Default public demo remains mocked/static.
- Use Qwen2.5-1.5B as the primary browser candidate in [#60](https://github.com/this-side-down/decision-brief-engine/issues/60).
- Require Capture Layer JSON validation and retry behavior similar to the Ollama adapter.
- Do not promote browser inference to default until a later quality review after real in-app integration.

## Next steps

1. [#58](https://github.com/this-side-down/decision-brief-engine/issues/58) — finalize browser runtime and adapter integration approach.
2. [#59](https://github.com/this-side-down/decision-brief-engine/issues/59) — design opt-in browser inference UX, loading, caching, and experimental labeling.
3. [#60](https://github.com/this-side-down/decision-brief-engine/issues/60) — implement the browser adapter behind `ModelAdapter`.

Do not start #60 until #58 and #59 are complete.

## Related documents

- [Evaluation plan](evaluation-plan.md)
- [Browser inference adapter feasibility](browser-inference-adapter-feasibility.md)
- [ADR 0004: inference path decision brief](../decisions/0004-inference-path-decision-brief.md)
- [Manual scorecard](../../fixtures/evaluation/manual-scorecard.md)

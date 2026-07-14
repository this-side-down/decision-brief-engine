# Browser markdown-only Decision Brief experiment (#141)

Controlled evaluation to determine whether **Qwen2.5-1.5B** can produce an acceptable Decision Brief Markdown artifact when the Decision Trace output burden is removed.

This is an **experiment**, not a production-path migration. Production WebGPU generation remains `structured_response` unless explicitly overridden for local evaluation.

## Enable markdown_only mode

Set in `.env.local` (or your Vite env file):

```bash
VITE_ENABLE_WEBGPU_INFERENCE=true
VITE_WEBGPU_DECISION_BRIEF_PROMPT_MODE=markdown_only
```

Optional but recommended for evidence capture:

```bash
VITE_BROWSER_GENERATION_DIAGNOSTICS=true
```

Restart `npm run dev` or rebuild with `npm run build && npm run preview` so Vite loads the flag.

| Value | Behavior |
| --- | --- |
| *(unset)* or `structured_response` | Production path: JSON `{ markdown, decisionTrace }` with full semantic gate |
| `markdown_only` | Experiment path: JSON `{ markdown }` only; Decision Trace checks marked not applicable |

## What changes in markdown_only mode

- **Input:** unchanged Capture Layer and brief-type guidance.
- **Output schema:** `{ "markdown": "..." }` only — no `decisionTrace` field requested or validated.
- **Validators:** Markdown-relevant checks only (required sections, recommendation alignment, suggested-next-step correspondence, writing hard failures, placeholder leakage, summary/sentence constraints). Decision Trace readiness is **not applicable**, not passed.
- **Retry wording:** unchanged (`buildDecisionBriefQualityRetrySuffix`).
- **Model / max_tokens / Context Map / chunking:** unchanged.

## Decision rule

### Pass

- `finish_reason` is `stop`
- No truncation (`finish_reason` is not `length`)
- All required Markdown sections present
- Recommendation corresponds to Capture Layer
- All Capture Layer suggested next steps are represented
- No writing hard failures
- No placeholder leakage on the accepted attempt

### Fail

- Truncation (`finish_reason: length`)
- Wrong recommendation vs Capture Layer
- Omitted or invented suggested next steps
- Missing required sections
- Writing hard failure
- Placeholder leakage on the final accepted output

## Reproduce Household Move Planning locally

1. Configure `.env.local` as above (`markdown_only` + WebGPU + optional diagnostics).
2. Build and preview: `npm run build && npm run preview`.
3. Open the app in **Chrome** (Windows target).
4. Select **Household Move Planning** from the built-in gallery.
5. Run **Generate Capture Layer**, then **Generate Decision Brief**.
6. Open **Run Details** — expect:
   - `Decision Brief experiment mode: markdown_only (Decision Trace checks not applicable)`
   - Completion diagnostics (prompt/completion/total tokens, finish reason)
   - Concrete Markdown findings (sections, alignment, writing, placeholders)
7. If diagnostics are enabled, inspect `.local/browser-generation-diagnostics/`:
   - `*-brief-attempt-1.json`
   - `*-brief_retry-attempt-2.json` (if retry occurred)
   - `configuration.briefPromptMode` should be `markdown_only`

## Diagnostic contract

Retains #142 diagnostics:

| Field | Notes |
| --- | --- |
| `promptTokens` / `completionTokens` / `totalTokens` | From WebLLM usage |
| `finishReason` | `stop`, `length`, etc. |
| `rawOutput` | Local capture only when `VITE_BROWSER_GENERATION_DIAGNOSTICS=true` |
| Semantic findings | Markdown-only categories; trace readiness omitted |

Run Details never includes raw JSON output.

## Related issues

- **#141** — browser Decision Brief quality investigation (this experiment)
- **#142** — diagnostics slice (merged; retained here)

Do not treat a passing markdown-only run as approval to ship split-stage production without further evidence.

## Results (2026-07-14)

Manual runs on all three built-in gallery examples after PR #143 merged the gated `markdown_only` infrastructure. Diagnostics enabled; raw artifacts stored locally only (not committed).

### Configuration

| Setting | Value |
| --- | --- |
| WebLLM | `@mlc-ai/web-llm@0.2.84` |
| Model | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` |
| Brief prompt mode | `markdown_only` (`VITE_WEBGPU_DECISION_BRIEF_PROMPT_MODE=markdown_only`) |
| Diagnostics | `VITE_BROWSER_GENERATION_DIAGNOSTICS=true` |
| Capture Layer | Unchanged production path (`capture-layer-v1`) |
| Validators | Unchanged markdown-only acceptance gate |

### Gallery example outcomes

| Example | Attempt 1 (prompt / completion / total) | Finish reason | Retry | Final result | Failure categories (final) |
| --- | --- | --- | --- | --- | --- |
| Household Move Planning | 1,197 / 242 / 1,439 | `stop` | Yes — 1,260 / 408 / 1,668, `stop` | **FAIL** | `required_sections`, `recommendation_alignment`, `next_step_alignment`, `writing_hard_failure` (missing Confidence; recommendation misalignment; next steps collapsed into prose; sentence-length violations) |
| Q4 Workforce Allocation | 1,130 / 487 / 1,617 | `stop` | No | **FAIL** | `required_sections`, `recommendation_alignment`, `next_step_alignment`, `writing_hard_failure` |
| Local Inference Setup Flow | 1,143 / 294 / 1,437 | `stop` | No | **FAIL** | `recommendation_alignment`, `next_step_alignment`, `writing_hard_failure` |

All three examples **FAIL** the documented decision rule. No example reached an accepted attempt that passed all pass criteria.

### Conclusion

- Removing Decision Trace eliminated the context-window truncation observed in `structured_response` mode (Household Move Planning structured run: prompt 1,469; completion 2,627; total 4,096; `finish_reason=length`).
- It did **not** produce acceptable Markdown across any of the three gallery examples.
- All failures occurred with `finish_reason=stop` and substantial context headroom — the bottleneck is content completeness, grounding, and structure, not output-budget exhaustion.
- A production split-stage pipeline is **not yet justified** because the proposed first Markdown stage itself fails on every gallery example tested.
- **PR #143 does not approve production split-stage architecture.** It ships gated evaluation infrastructure only.

### Next experiment

**Validator-aligned `markdown_only` prompt** — revise the experiment prompt (not production `structured_response`) so section structure, recommendation correspondence, and discrete suggested-next-step representation are explicit requirements aligned with existing validators. Do not implement split-stage production until a markdown-only stage passes the documented decision rule on gallery examples.

---

## E2b — validator-aligned markdown_only prompt (#145)

Follow-up controlled experiment after E2 (PR #143) failed all three gallery examples with `finish_reason=stop` but semantic acceptance failures. Parent investigation: **#141**. Implementation: **#145**.

### Hypothesis

The remaining bottleneck is **prompt-validator misalignment**. The E2 `markdown_only` prompt did not state several hard requirements already enforced by `evaluateDecisionBriefMarkdownOnlyAcceptance`, `evaluateBriefMarkdownAlignment`, and `evaluateDecisionBriefWriting`. Explicitly stating those requirements may allow Qwen2.5-1.5B to produce acceptable Markdown without changing model, schema, validators, or retry behavior.

### Controlled variable

Only the evaluation-only `markdown_only` Decision Brief prompt wording — aligned with existing deterministic validators (section headings as `##`, non-empty sections, recommendation preservation, discrete next-step list items with exact count, writing hard gates, explained Confidence, grounding rules).

### Frozen variables

Unchanged from E2 / #145:

| Variable | Value |
| --- | --- |
| WebLLM | `@mlc-ai/web-llm@0.2.84` |
| Model | `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` |
| Brief prompt mode | `markdown_only` |
| Capture Layer | Unchanged production path |
| Markdown-only JSON schema | `{ "markdown": "..." }` only |
| Validators / thresholds | Unchanged |
| `max_tokens` / context | Unchanged |
| Retry count / retry suffix | Unchanged |
| Production `structured_response` | Unchanged |
| Decision Trace generation | Unchanged (not requested in markdown_only) |
| Public gating / Mock default | Unchanged |

### Gallery cases

Same three built-in gallery examples as E2:

1. **Household Move Planning**
2. **Q4 Workforce Allocation**
3. **Local Inference Setup Flow**

### Pass rule (E2b)

All three gallery examples must produce an **accepted** markdown-only result after at most **one bounded retry**, with:

- Final accepted attempt `finish_reason=stop`
- Valid markdown-only JSON response
- All required sections present and non-empty
- Recommendation corresponding to `capture_layer.recommendation_candidate`
- Every Capture Layer suggested next step represented as a separate Markdown list item
- Exact next-step count match — no additional or invented next steps
- No writing hard failures
- No placeholder leakage

Warnings and report-only writing findings do **not** independently fail the experiment.

### Reproduction procedure

1. Configure `.env.local` (see [Enable markdown_only mode](#enable-markdown_only-mode) above).
2. Build and preview: `npm run build && npm run preview`.
3. Open the app in **Chrome** (Windows target).
4. For each gallery example:
   - Select the example from the built-in gallery.
   - Run **Generate Capture Layer**, then **Generate Decision Brief**.
   - Open **Run Details** and record diagnostics.
5. If `VITE_BROWSER_GENERATION_DIAGNOSTICS=true`, inspect `.local/browser-generation-diagnostics/` for attempt artifacts.

### Required evidence fields

| Field | Notes |
| --- | --- |
| Example name | Gallery case |
| Attempt count | 1 or 2 (bounded retry) |
| `promptTokens` / `completionTokens` / `totalTokens` | Per attempt |
| `finishReason` | Must be `stop` on accepted attempt |
| Acceptance result | pass / fail |
| Failure categories | If fail: `required_sections`, `recommendation_alignment`, `next_step_alignment`, `writing_hard_failure`, `placeholder_leakage` |
| Writing hard failures | Rule IDs and excerpts |
| Alignment details | Recommendation / next-step mismatch sources |

### Results (2026-07-14)

Manual E2b gallery runs completed on the PR #146 branch using the validator-aligned `markdown_only` prompt. Diagnostics enabled; raw artifacts stored locally only (not committed).

| Example | Attempt 1 (prompt / completion / total) | Finish reason | Retry (prompt / completion / total) | Retry finish | Final result | Failure categories (final) |
| --- | --- | --- | --- | --- | --- | --- |
| Q4 Workforce Allocation | 1,499 / 368 / 1,867 | `stop` | 1,560 / 366 / 1,926 | `stop` | **FAIL** | `recommendation_alignment`, `next_step_alignment`, `writing_hard_failure` |
| Local Inference Setup Flow | 1,459 / 364 / 1,823 | `stop` | 1,516 / 274 / 1,790 | `stop` | **FAIL** | `next_step_alignment`, `writing_hard_failure` |
| Household Move Planning | 1,677 / 376 / 2,053 | `stop` | 1,734 / 435 / 2,169 | `stop` | **FAIL** | `required_sections`, `writing_hard_failure` |

All three examples **FAIL** the E2b pass rule. No example reached an accepted attempt that passed all pass criteria.

#### Q4 Workforce Allocation

- **First attempt:** 1,499 prompt / 368 completion / 1,867 total, `finish_reason=stop`
- **Retry:** yes — 1,560 prompt / 366 completion / 1,926 total, `finish_reason=stop`
- **Final result:** FAIL
- **Final categories:** `recommendation_alignment`, `next_step_alignment`, `writing_hard_failure`
- **Capture next steps:** 5
- **Brief next steps:** 1 (collapsed into prose instead of discrete list items)
- **Sentence-length hard failure:** 37 words
- **Capture recommendation candidate was hollow:** `1. Option #1`

#### Local Inference Setup Flow

- **First attempt:** 1,459 prompt / 364 completion / 1,823 total, `finish_reason=stop`
- **Retry:** yes — 1,516 prompt / 274 completion / 1,790 total, `finish_reason=stop`
- **Final result:** FAIL
- **Final categories:** `next_step_alignment`, `writing_hard_failure`
- **Capture next steps:** 5
- **Brief next steps:** 1 (collapsed into prose)
- **Em-dash hard failure**
- **First attempt recommendation mismatch:**
  - capture: `1) status strip only`
  - brief expanded to a different recommendation
- **Retry corrected recommendation alignment** but did not correct next-step representation or writing quality

#### Household Move Planning

- **First attempt:** 1,677 prompt / 376 completion / 2,053 total, `finish_reason=stop`
- **Retry:** yes — 1,734 prompt / 435 completion / 2,169 total, `finish_reason=stop`
- **Final result:** FAIL
- **Final categories:** `required_sections`, `writing_hard_failure`
- **First attempt:**
  - Capture next steps: 8
  - Brief next steps: 1 (collapsed into semicolon-separated prose)
  - Sentence-length failures: 44, 41, 38, and 65 words
- **Retry omitted the required Confidence section**

### Final conclusion

E2b failed **0/3**. All first attempts ended with `finish_reason=stop` and substantial context headroom (totals 1,823–2,053 vs the 4,096-token ceiling observed in E2 truncation).

Prompt-validator alignment did **not** produce an acceptable Markdown stage. The leading explanation is a **capability ceiling** for `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` under the current browser configuration and decision-grade artifact contract. Some failures were compounded by hollow upstream Capture Layer content (e.g. Q4 recommendation candidate `1. Option #1`). Household Move Planning demonstrates an independent Markdown prompt-following failure even without final recommendation misalignment (retry dropped the required Confidence section).

This is a bounded conclusion about the current model, configuration, and product contract — not all browser models or all browser inference.

**Posture after E2b:**

- Do **not** run a trace-only experiment.
- Do **not** implement production split-stage generation.
- Do **not** start **#117**.
- Keep WebGPU gated.
- Keep Mock as public default.
- Keep Local Ollama as the real-generation quality baseline.
- **#141** should hand the formal rollout posture to **#75** after this evidence is merged.

### Decision rule (applied)

- **3/3 pass:** Keep **#141** open. Recommend the next controlled Decision Trace isolation experiment. Do **not** implement a production split pipeline.
- **Any failure:** Do **not** start **#117** or implement split-stage production. Record exact tokens, finish reason, attempts, deterministic failure categories, and whether the 1.5B model capability ceiling is the leading explanation.

**E2b outcome:** 0/3 pass. The trace-only isolation experiment is **not recommended**. Split-stage production and **#117** remain blocked.
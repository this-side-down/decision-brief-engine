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
# Public demo milestone (`v0.1.0`)

Decision Brief Engine now has a credible public workflow demo: a three-column layout, durable example scenarios, export polish, and local inference tooling that make the product legible to evaluators without exposing unfinished runtime paths.

Production demo: https://decision-brief-engine.vercel.app/

GitHub release target: **`v0.1.0`** — Public Demo Milestone. See [CHANGELOG.md](../../CHANGELOG.md).

## Summary

This milestone completes the first portfolio-ready public surface for Decision Brief Engine. A visitor can load a messy example, choose a brief type, walk through Capture Layer → Decision Brief → export, and understand how the product treats decision support differently from note summarization.

The demo defaults to **Mock generation** so the hosted app stays fast, reliable, and reviewable. Real inference remains local-first: **Local Ollama** is the strongest quality path for developers and evaluators, with health checks and generation telemetry. **Browser WebGPU** exists but stays gated until quality and UX meet the bar.

Recent merged work:

| Area | Issues | Outcome |
| --- | --- | --- |
| Demo layout and setup | #79 / #80 | Setup bar, cleaner three-column workflow |
| Example gallery | #71 / #81 | Three durable fixtures in the public demo |
| Export and share | #74 / #82 | Copy/download polish for Decision Brief Markdown |
| Local Ollama setup | #61 / #83 | `npm run health:ollama`, setup docs, actionable failure copy |
| Generation transparency | #78 / #84 | Elapsed time, retries, timeouts, run details, WebGPU model-ready flow |

## What the public demo now supports

- **Three-column workflow**: Input Workspace → Capture Layer → Decision Brief
- **Brief type selection**: Product, Strategy, or Execution before generation
- **Example gallery**: Load durable scenarios from the setup bar without pasting notes manually
- **Capture Layer as intermediate artifact**: Structured fields for decisions, risks, assumptions, open questions, and missing context
- **Decision Brief generation and edit**: Markdown output the user can review before export
- **Export actions**: Copy to clipboard and download `.md` with sensible filenames
- **Mode-aware setup copy**: Accurate guidance for Mock demo, gated WebGPU, and Local Ollama dev builds
- **Generation telemetry** (Local Ollama and gated WebGPU): Elapsed time during long runs, retry status, timeout messages, and post-run details

The public hosted app does **not** call external models. It uses fixture-backed mock generation so evaluators can review workflow shape and output structure without local setup.

## Example scenarios

Three featured examples ship as durable fixtures under `fixtures/examples/`. Each includes messy notes, an expected Capture Layer baseline, and an expected Decision Brief for mock generation and tests.

### Q4 Workforce Allocation / Strategy

A general contractor allocating scarce senior field leadership and hiring capacity across Q4 projects under schedule, safety, and client-risk pressure.

**Why it is featured:** Exercises strategy-shaped tradeoffs, stakeholder tension, and portfolio staffing decisions. Also serves as the evaluation harness input for CLI Capture Layer checks.

### Local Inference Setup Flow / Product

Whether to add guided health checks, model status, endpoint validation, and clearer failure states for local inference setup.

**Why it is featured:** Meta-product scenario that mirrors the repo’s local-first posture. The mock output reflects developer-experience decisions around inference credibility—not just domain content.

### Household Move Planning / Execution

Coordinate a near-term household move with budget limits, pet requirements, work authorization uncertainty, and timing dependencies.

**Why it is featured:** Shows execution-shaped planning outside enterprise software—messy life logistics with constraints, dependencies, and incomplete information.

## Runtime posture

| Path | Public default? | Role |
| --- | --- | --- |
| **Mock demo** | Yes | Hosted Vercel demo; fixture-backed, no model download |
| **Local Ollama** | Dev/eval only (`VITE_GENERATION_MODE=ollama`) | Strongest real-generation quality path today |
| **Live in browser (WebGPU)** | Gated (`VITE_ENABLE_WEBGPU_INFERENCE=true`) | Experimental; hidden from public builds by default |

**Mock demo** keeps the public app trustworthy. Reviewers see the full workflow and representative output without waiting on hardware or model downloads.

**Local Ollama** (`qwen3:4b` by default) is the recommended path for real Capture Layer and Decision Brief generation on a developer machine. Setup is validated with `npm run health:ollama` and documented in [ollama-local-setup.md](../ai/ollama-local-setup.md).

**WebGPU** remains intentionally gated. Browser inference is implemented with disclosure, download progress, and cancel handling, but public ungating waits on Capture Layer quality and structural readiness—not just “it runs.”

Public hosted inference (sending user notes to a remote model API) remains **out of scope** for this milestone.

## Transparency decisions

Decision Brief Engine treats transparency as **operational and structural**, not as exposure of raw model internals.

- **Capture Layer is the “show your work” artifact.** It makes stated and implied decisions, risks, assumptions, open questions, and missing context inspectable before the final brief.
- **No raw model thinking is shown.** Hidden reasoning, scratchpad output, and chain-of-thought are not surfaced in the UI or exports.
- **Generation telemetry shows what happened during a run:** runtime mode, elapsed time, retry status, timeout duration, final errors, and a concise run-details block after completion or failure.

This framing keeps the product credible for decision support: users see structured capture and run status, not model internals.

## Validation notes

Manual validation used two benchmark profiles documented during recent inference work:

### Low-powered profile — MacBook Air M1 (2020, 16GB RAM)

- **Runtime:** Local Ollama, `qwen3:4b`
- **Scenario:** Q4 Workforce Allocation / Strategy
- **Observed:** Capture Layer completed in ~91s; Decision Brief timed out at 120s
- **Telemetry:** Elapsed time visible during generation; run details showed Capture Layer duration and Decision Brief timeout; errors routed to the Decision Brief column after follow-up fixes
- **Health check:** `npm run health:ollama` reported READY when Ollama was reachable

### High-powered profile — Desktop (64GB RAM, Intel i9, NVIDIA RTX 3080 Ti)

- **Runtime:** Gated WebGPU (manual eval)
- **Scenario:** Construction Strategy comparison (W2 prompt variant)
- **Observed:** Capture Layer attempts ~20–30s each; Decision Brief ~20s; schema pass after retry but structural readiness still failed on hollow fields
- **Follow-up:** #78 improved model-ready flow (single Generate intent through disclosure/load) and added timing transparency

These profiles are reference points, not SLA commitments. They show why mock-first public demos and local telemetry matter on uneven hardware.

## Remaining work

- **WebGPU quality gate:** Structural readiness and Capture Layer depth must improve before any public ungating discussion.
- **Hosted inference:** Still out of scope; requires separate data-handling and deployment decisions.
- **Deeper eval and benchmarking:** CLI harness covers mock and Ollama; WebGPU remains manual. Broader device matrix and prompt/model comparisons continue in evaluation docs.
- **Generation timeouts on slow hardware:** Local Ollama uses configurable `VITE_OLLAMA_TIMEOUT_MS`; very slow machines may need longer limits or slimmer models—telemetry makes that visible, not hidden.

## Reusable lessons

1. **Durable fixtures double as demo and eval assets.** The same example files power the public gallery, mock adapter output, schema tests, and CLI evaluation—reducing drift between “what visitors see” and “what we measure.”

2. **A mock-first public demo can still be credible.** Fixture-backed generation lets the hosted app demonstrate workflow, Capture Layer structure, and export behavior without pretending to run real inference in the browser.

3. **Local-first inference needs health checks and timing transparency.** Reachability checks, model availability, and elapsed-time status turn “is it working?” from guesswork into actionable feedback—especially on slower machines where multi-minute Capture Layer runs are normal.

## Related documentation

- [Live browser inference UX](./live-browser-inference-ux.md)
- [Local Ollama setup and health check](../ai/ollama-local-setup.md)
- [Capture Layer contract](./capture-layer.md)
- [Public demo examples](../../fixtures/examples/README.md)
- [Browser model evaluation results](../../fixtures/evaluation/browser-model-results.md)

# 0004 — Select the next inference path after local Ollama

## Status

Accepted

## Decision to make

After mocked generation and local Ollama inference, which inference path should Decision Brief Engine implement next to move from a developer-local workflow toward built-in product inference without breaking the FOSS-only MVP rule?

## Current state

- The public Vercel app runs the mocked/static workflow by default.
- Local development supports real inference through Ollama and `qwen3:4b` behind the provider-neutral `ModelAdapter` boundary.
- Generation follows a two-step pipeline: Capture Layer JSON first, Decision Brief Markdown second.
- [ADR 0002](0002-foss-only-mvp-stack.md) keeps hosted proprietary model APIs out of MVP scope.
- [ADR 0003](0003-foss-inference-topology.md) selected local/self-hosted FOSS inference as the first real adapter target; that path is now implemented for local development.
- Public hosted inference is not implemented and remains deferred.
- Browser WebGPU inference has emerged as a strong candidate because it could provide built-in public inference without a server, hosted API, or raw-note transfer off the user's device.

## Decision criteria

- Preserve the FOSS-only MVP runtime constraint.
- Keep generation behind the existing `ModelAdapter` boundary.
- Minimize new backend, auth, persistence, and data-handling surface area for the next milestone.
- Support the two-step Capture Layer → Decision Brief pipeline without redesigning the UI flow.
- Make the public product path inspectable and understandable to users.
- Prefer paths that can ship incrementally behind explicit opt-in or mode selection.
- Avoid selecting a path that requires enterprise deployment architecture before the core workflow quality is proven.
- Keep non-selected paths intentionally deferred with explicit rationale.

## Options considered

### Option 1: Public hosted inference

Benefits:

- Can offer real generation on the public demo without local setup.
- Offloads model execution and hardware requirements from user devices.
- Can reuse the same prompt contracts behind a server-side adapter.

Risks:

- Requires a separate data-handling review before user notes leave the browser.
- Introduces backend deployment, uptime, cost, and abuse-management concerns.
- Conflicts with the current FOSS-only MVP posture if implemented through hosted proprietary model APIs.
- Expands product scope into auth, persistence, billing, or rate limiting sooner than necessary.

Decision:

- Deferred. Any public hosted path requires an explicit future ADR, data-handling review, and FOSS-compatible runtime selection.

### Option 2: Local desktop or self-contained package

Benefits:

- Bundles the UI and inference runtime into one installable product.
- Avoids browser memory and WebGPU variability for users who prefer a native app.
- Can wrap Ollama or another local FOSS runtime without changing prompt contracts.

Risks:

- Adds packaging, distribution, update, and platform-support work unrelated to the current web MVP.
- Does not solve built-in public inference on the existing Vercel demo.
- Shifts focus from the current browser-first product codebase.

Decision:

- Deferred until there is explicit product demand for a packaged desktop distribution.

### Option 3: Local-first Ollama package

Benefits:

- Reuses the adapter and prompt pipeline already implemented for local development.
- Keeps inference on the user's machine with a known FOSS runtime.
- Lowest incremental engineering cost relative to the current codebase.

Risks:

- Still requires users to install and run Ollama outside the app.
- Does not provide built-in inference for the public mocked demo.
- Positions the product as a local developer tool rather than a self-contained workflow for general users.

Decision:

- Retained as the supported local development and evaluation path, but not selected as the next product milestone beyond current local Ollama support.

### Option 4: Mobile or on-device inference

Benefits:

- Keeps inference local to the user's device.
- Could support offline or field workflows later.

Risks:

- Requires a separate mobile client, model packaging strategy, and device-class evaluation work.
- Memory, battery, and model-size constraints are tighter than desktop or browser targets.
- Does not address the current web MVP or public demo gap.

Decision:

- Deferred until after the web product path proves stable built-in inference.

### Option 5: Browser WebGPU inference

Benefits:

- Can provide built-in public inference without introducing a hosted backend or proprietary model API.
- Keeps raw notes on the user's device during generation.
- Fits the existing frontend-first architecture behind a new `ModelAdapter` implementation.
- Aligns with the FOSS-only MVP rule when the selected in-browser runtime, model runner, and model pass license review.
- Can ship as an explicit opt-in generation mode while the mocked demo remains the default public path.

Risks:

- Requires large model downloads and acceptable first-run latency in the browser.
- Output quality, JSON reliability, and two-step pipeline stability must be revalidated for in-browser models.
- Browser, GPU, and memory variability can affect reliability across devices.
- Model selection and license review remain gating work before adoption.

Decision:

- Selected as the next concrete implementation target.

### Option 6: Hybrid staged path

Benefits:

- Keeps the mocked public demo as the safe default while real inference paths roll out incrementally.
- Preserves local Ollama for developer evaluation and quality comparison.
- Allows browser WebGPU inference to ship behind explicit opt-in without forcing all users onto heavy in-browser downloads immediately.
- Keeps deferred paths visible instead of implicitly rejected.

Risks:

- Requires clear mode labeling so users understand which path is active.
- Adds documentation and release-milestone overhead across multiple inference states.

Decision:

- Selected as the overall rollout strategy. Browser WebGPU inference is the next implementation step within this staged path.

## Recommendation

Adopt a **hybrid staged inference path** with **browser WebGPU inference** as the next implementation milestone.

Rollout shape:

1. **Public default:** mocked/static workflow on Vercel.
2. **Local development and evaluation:** Ollama + `qwen3:4b` through the existing adapter.
3. **Next product milestone:** opt-in browser WebGPU inference behind a new `ModelAdapter` implementation after model, license, and quality review.
4. **Deferred:** public hosted inference, desktop/mobile distribution, and any path requiring hosted proprietary model APIs.

This keeps the current product stable, preserves the FOSS-only constraint, and moves toward built-in public inference without adding backend infrastructure in the next milestone.

## Assumptions

- The two-step Capture Layer → Decision Brief pipeline remains the product contract.
- A FOSS-compatible in-browser runtime and model can be identified that meets JSON reliability needs for Capture Layer generation, or can be adapted with validation and retry behavior similar to the current Ollama path.
- Browser WebGPU support is acceptable for an opt-in early-adopter path before it becomes the public default.
- The mocked demo remains valuable as a zero-setup workflow validation path even after browser inference exists.
- Release milestones will document which inference modes exist in each version.

## Risks

- In-browser model quality or JSON conformance may be insufficient for Capture Layer generation without additional prompt or validation work.
- Large model downloads may be unacceptable for some users or networks even as an opt-in mode.
- Device variability may create support burden if browser inference is labeled as generally available too early.
- Parallel inference modes can confuse users unless mode labels, docs, and release notes stay aligned.
- Premature selection of a final in-browser model before evaluation may create rework.

## Deferred paths

- Public hosted inference, pending FOSS runtime selection and data-handling review.
- Desktop or self-contained distributable packages.
- Mobile/on-device inference clients.
- Replacing the mocked public demo default before browser inference quality is validated.
- Hosted proprietary model APIs.

## Next implementation issue

The browser inference backlog is already sequenced in GitHub. Continue with these issues in order:

1. [#57](https://github.com/this-side-down/decision-brief-engine/issues/57) — Evaluate browser-feasible models against Capture Layer quality gate
2. [#58](https://github.com/this-side-down/decision-brief-engine/issues/58) — Research WebGPU browser inference adapter feasibility
3. [#59](https://github.com/this-side-down/decision-brief-engine/issues/59) — Design live browser inference UX
4. [#60](https://github.com/this-side-down/decision-brief-engine/issues/60) — Implement WebGPU browser inference adapter

Do not start #60 until #57, #58, and #59 are complete.

These issues should stay within the hybrid staged path: opt-in browser WebGPU inference behind the existing `ModelAdapter` boundary, without adding hosted inference, desktop/mobile distribution, persistence, auth, billing, or backend services.

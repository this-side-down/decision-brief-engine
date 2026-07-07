# 0003 — Target local/self-hosted FOSS inference for first real adapter

## Status

Accepted

## Decision

For the first real inference path after mocked generation, Decision Brief Engine will target local or self-hosted FOSS-compatible inference behind the provider-neutral model adapter.

This decision only chooses the target topology for the first real FOSS adapter. It does not select a final model, implement inference, add production deployment architecture, or introduce hosted proprietary model APIs.

Mocked generation remains the first implementation path. The real adapter should come after the UI pipeline, Capture Layer JSON flow, Decision Brief Markdown flow, and Markdown export work end to end with fixtures.

## Options considered

### Option 1: In-browser inference

Benefits:

- Keeps inference on the user's device.
- Avoids introducing a server or backend endpoint for generation.
- Can support a highly local and inspectable product path if browser performance is acceptable.
- Keeps hosted proprietary model APIs out of the MVP path.

Risks:

- Requires large model downloads in the browser.
- Exposes the MVP to browser, device, memory, and GPU variability early.
- Can make first-run latency and reliability difficult to reason about.
- May constrain model choice and output quality before the product flow is proven.

MVP fit:

- Useful as a later option after the product flow proves valuable.
- Poor first real-adapter target because it adds device and browser complexity before the core workflow is validated.

Decision:

- Deferred for MVP real-adapter wiring.
- Keep it available as a later FOSS-compatible topology option.

### Option 2: Local or self-hosted inference behind an adapter

Benefits:

- Keeps the browser UI simpler.
- Avoids large in-browser model download and browser/device variability for the first real adapter.
- Keeps the FOSS-only runtime constraint intact when the engine, model runner, inference engine, and model pass license review.
- Works naturally with the mocked-first provider-neutral adapter boundary.
- Allows the UI and prompt pipeline to remain stable while inference implementation changes behind the adapter.
- Lets in-browser inference remain a later option after the product flow proves useful.

Risks:

- Requires a local or self-hosted inference process outside the browser UI.
- Hardware, latency, and context-window limits still matter.
- Adds an API boundary or local service boundary when real inference is wired.
- Still requires model and runtime license review before adoption.

MVP fit:

- Best first real-adapter target because it isolates inference complexity behind the adapter while preserving the frontend-first product workflow.
- Compatible with mocked generation, provider-neutral prompt contracts, and Markdown export.

Decision:

- Selected as the target topology for the first real FOSS-compatible adapter.

## Consequences

- The MVP should continue to implement mocked generation before real inference.
- UI components should depend on the provider-neutral model adapter, not on an inference engine, model runner, model, or topology.
- The first real adapter should target a local or self-hosted FOSS-compatible inference path after license review.
- In-browser inference should not be implemented unless a later issue explicitly pulls it into scope.
- This ADR does not add production deployment architecture or enterprise infrastructure.

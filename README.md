# Decision Brief Engine

Decision Brief Engine is an AI-native product experiment for turning messy notes into structured decision briefs.

Instead of simply summarizing text, it captures underlying intent, decisions, risks, constraints, and unresolved questions before generating executive-ready output. The **Capture Layer** is the user-facing “show your work” artifact. Raw model thinking, hidden reasoning, and chain-of-thought are not exposed.

## Status

**Current release:** v0.1.0 — Public Demo Milestone  
**Public demo:** https://decision-brief-engine.vercel.app/  
**Release notes:** https://github.com/this-side-down/decision-brief-engine/releases/tag/v0.1.0

The hosted demo runs in Mock mode by default for reliability. Local Ollama is the strongest real-generation path for local evaluation. Browser WebGPU remains gated while quality improves.

v0.1.0 is the first portfolio-ready public demo milestone: example gallery, export polish, Local Ollama health check, and generation telemetry. See [Public demo milestone](docs/product/public-demo-milestone.md) for the full write-up.

## v0.2 planning

v0.2 planning is focused on closing the recommendation transparency gap by adding a structured Decision Trace between the Capture Layer and Decision Brief.

The goal is to make recommendations and next steps traceable to captured intent, evidence, assumptions, risks, constraints, alternatives, and missing context without exposing raw model thinking or chain-of-thought.

See:

- [v0.2 Decision Trace direction](docs/product/v0.2-decision-trace-direction.md)
- [ADR: Traceable recommendation rationale](docs/architecture/adr-traceable-recommendation-rationale.md)

## Why

Most AI note takers answer:

"What was said?"

Decision Brief Engine answers:

"What matters?"

## MVP workflow

- Paste notes
- Select brief type
- Generate a structured Capture Layer
- Produce a Decision Brief
- Export Markdown

## Key constraints

- The Capture Layer is generated before the final Decision Brief.
- The final Decision Brief exports as Markdown.
- The MVP runtime stack is FOSS-only.
- Generation can start mocked before local or self-hosted FOSS-compatible inference is wired in.

## Local inference (Ollama)

Local development can run real local inference with Ollama and `qwen3:4b`.

Set in `.env.local`:

```sh
VITE_GENERATION_MODE=ollama
VITE_OLLAMA_BASE_URL=/ollama
VITE_OLLAMA_MODEL=qwen3:4b
VITE_OLLAMA_HOST=http://127.0.0.1:11434
```

Validate setup before generating:

```sh
npm run health:ollama
```

See [Local Ollama setup and health check](docs/ai/ollama-local-setup.md) for Mac and Windows setup paths, troubleshooting, and a local smoke-test checklist. See `docs/ai/ollama-qwen3-json-quirk.md` for operational notes and the current Qwen3 JSON-mode behavior.

## Browser inference (experimental, gated)

The public demo defaults to **Mock demo**. Browser WebGPU inference is experimental and hidden unless `VITE_ENABLE_WEBGPU_INFERENCE=true` is set at build time. When enabled, users can opt into **Live in browser** for local WebGPU inference with a one-time model download. **Local Ollama** remains the local/dev path when `VITE_GENERATION_MODE=ollama` is set.

See `docs/product/live-browser-inference-ux.md` for mode behavior, disclosure copy, and fallback states.

## Data handling (v0)

This is implementation guidance for the current v0 state, not a legal privacy policy.

### Public hosted demo

- The public Vercel demo runs the mocked workflow by default.
- No model call is made by the public mocked demo.
- No backend, database, persistence, or auth layer is used by the public mocked demo.

### Local Ollama mode

- In local Ollama mode, pasted notes are sent to the locally configured Ollama runtime.
- The app keeps session state in browser memory for the active session.
- The app does not intentionally persist pasted notes, generated Capture Layers, or generated briefs.
- Copy/download export actions are user-initiated browser actions.
- Model thinking is not shown or stored by the app.

### Future public inference

- Any public hosted inference path requires a separate data-handling review before user notes are sent to a hosted model runtime.

## Documentation

- [MVP product specification](docs/product/mvp-spec.md)
- [Capture Layer contract](docs/product/capture-layer.md)
- [MVP brief types](docs/product/brief-types.md)
- [Live browser inference UX](docs/product/live-browser-inference-ux.md)
- [Public demo milestone](docs/product/public-demo-milestone.md)
- [v0.2 Decision Trace direction](docs/product/v0.2-decision-trace-direction.md)
- [MVP architecture](docs/architecture/mvp-architecture.md)
- [ADR: Traceable recommendation rationale](docs/architecture/adr-traceable-recommendation-rationale.md)
- [Conceptual data model](docs/architecture/data-model.md)
- [AI prompt contracts](docs/ai/prompt-contracts.md)
- [Evaluation plan](docs/ai/evaluation-plan.md)
- [Capture Layer evaluation harness](docs/ai/capture-layer-eval-harness.md)
- [Browser model / prompt variant eval](docs/ai/browser-model-prompt-variant-eval.md)
- [Browser model quality gate evaluation](docs/ai/browser-model-quality-gate.md)
- [Browser inference adapter feasibility](docs/ai/browser-inference-adapter-feasibility.md)
- [Local Ollama setup and health check](docs/ai/ollama-local-setup.md)
- [Qwen3/Ollama JSON-mode quirk](docs/ai/ollama-qwen3-json-quirk.md)
- [Implementation build plan](docs/implementation/build-plan.md)
- [MVP implementation checklist](docs/implementation/mvp-checklist.md)
- [ADR 0002: FOSS-only MVP runtime stack](docs/decisions/0002-foss-only-mvp-stack.md)
- [ADR 0004: inference path decision brief](docs/decisions/0004-inference-path-decision-brief.md)
- [Release and versioning policy](docs/project/release-process.md)
- [Changelog](CHANGELOG.md)
- [Repository maintenance](docs/repo-maintenance.md)

## Development

```sh
npm install
npm run dev
npm run typecheck
npm test
npm run build
npm run preview
npm run health:ollama
```

### Capture Layer evaluation (#72)

```sh
npm run eval:capture -- --mode=mock
npm run eval:capture -- --mode=ollama
npm run eval:capture -- --mode=webgpu
```

See [Capture Layer evaluation harness](docs/ai/capture-layer-eval-harness.md). WebGPU remains a documented manual browser procedure. Prompt variant comparison: [browser-model-prompt-variant-eval.md](docs/ai/browser-model-prompt-variant-eval.md).

## Product Lab

This project is part of an ongoing exploration into AI-native product systems, decision support, and intent-centric workflows.

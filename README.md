# Decision Brief Engine

Decision Brief Engine is an AI-native decision brief engine for turning messy notes into structured Capture Layers and decision-ready Markdown briefs.

Instead of simply summarizing text, it captures the underlying intent, decisions, risks, constraints, and unresolved questions before generating executive-ready output.

## Why

Most AI note takers answer:

"What was said?"

Decision Brief Engine answers:

"What matters?"

## Current product state

- This repository is the Decision Brief Engine product codebase.
- The public Vercel app is a mocked/static workflow validation demo by default.
- Local development supports real local inference through Ollama (`qwen3:4b`) when enabled with environment variables.
- Public hosted inference is not implemented yet and requires a separate deployment and data-handling decision.

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

## Public app status

Production demo: https://decision-brief-engine.vercel.app/

The hosted app is currently deployed on Vercel as a mocked/static workflow demo. It should not be interpreted as a public hosted inference deployment.

## Local inference (Ollama)

Local development can run real local inference with Ollama and `qwen3:4b`.

Set in `.env.local`:

```sh
VITE_GENERATION_MODE=ollama
VITE_OLLAMA_BASE_URL=/ollama
VITE_OLLAMA_MODEL=qwen3:4b
VITE_OLLAMA_HOST=http://127.0.0.1:11434
```

See `docs/ai/ollama-qwen3-json-quirk.md` for operational notes and the current Qwen3 JSON-mode behavior.

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
- [MVP architecture](docs/architecture/mvp-architecture.md)
- [Conceptual data model](docs/architecture/data-model.md)
- [AI prompt contracts](docs/ai/prompt-contracts.md)
- [Evaluation plan](docs/ai/evaluation-plan.md)
- [Qwen3/Ollama JSON-mode quirk](docs/ai/ollama-qwen3-json-quirk.md)
- [Implementation build plan](docs/implementation/build-plan.md)
- [MVP implementation checklist](docs/implementation/mvp-checklist.md)
- [ADR 0002: FOSS-only MVP runtime stack](docs/decisions/0002-foss-only-mvp-stack.md)
- [Repository maintenance](docs/repo-maintenance.md)

## Development

```sh
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

## Product Lab

This project is part of an ongoing exploration into AI-native product systems, decision support, and intent-centric workflows.

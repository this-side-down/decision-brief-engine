# Decision Brief Engine

Decision Brief Engine helps product and operations teams turn messy conversations into structured decision briefs.

Instead of simply summarizing text, it captures the underlying intent, decisions, risks, constraints, and unresolved questions before generating executive-ready output.

## Why

Most AI note takers answer:

"What was said?"

Decision Brief Engine answers:

"What matters?"

## MVP

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

## Demo

Production demo: https://decision-brief-engine.vercel.app/

The app is currently deployed on Vercel as a static frontend preview/demo host only.

## Documentation

- [MVP product specification](docs/product/mvp-spec.md)
- [Capture Layer contract](docs/product/capture-layer.md)
- [MVP brief types](docs/product/brief-types.md)
- [MVP architecture](docs/architecture/mvp-architecture.md)
- [Conceptual data model](docs/architecture/data-model.md)
- [AI prompt contracts](docs/ai/prompt-contracts.md)
- [Evaluation plan](docs/ai/evaluation-plan.md)
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

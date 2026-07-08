# Changelog

All notable product milestones for Decision Brief Engine are documented here.

This project uses pre-1.0 versioning (`v0.x.y`) for capability milestones rather than strict mature semver guarantees. See [docs/project/release-process.md](docs/project/release-process.md) for tagging and release guidance.

Version comparison links will be added when tags are created.

## [Unreleased]

### Added

- Inference path decision brief comparing public hosted, desktop/local, Ollama, mobile, browser WebGPU, and hybrid rollout options ([ADR 0004](docs/decisions/0004-inference-path-decision-brief.md)).
- Lightweight pre-1.0 release and versioning policy ([docs/project/release-process.md](docs/project/release-process.md)).
- Browser model quality gate evaluation for Capture Layer readiness ([#57](docs/ai/browser-model-quality-gate.md)).
- Browser WebGPU adapter feasibility research and recommended integration shape ([#58](docs/ai/browser-inference-adapter-feasibility.md)).

## [0.2.0] - TBD

### Product state

- Public Vercel demo: mocked/static workflow by default.
- Local development: real inference through Ollama + `qwen3:4b` behind the `ModelAdapter` boundary.
- Public hosted inference: not implemented.

### Added

- Local Ollama generation mode for Capture Layer and Decision Brief generation.
- v0 readiness documentation for product posture, privacy guidance, and evaluation language cleanup.

### Deferred

- Browser WebGPU inference.
- Public hosted inference.
- Desktop and mobile distribution.

## [0.1.0] - TBD

### Product state

- Public Vercel demo: mocked/static workflow baseline.
- Local inference: not implemented in the product codebase.

### Added

- Core MVP workflow: paste notes, select brief type, generate Capture Layer, generate Decision Brief, export Markdown.
- Mocked generation path behind a provider-neutral model adapter boundary.
- FOSS-only MVP documentation and architecture baseline.

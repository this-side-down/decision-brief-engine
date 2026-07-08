# Changelog

All notable product milestones for Decision Brief Engine are documented here.

This project uses pre-1.0 versioning (`v0.x.y`) for capability milestones rather than strict mature semver guarantees. See [docs/project/release-process.md](docs/project/release-process.md) for tagging and release guidance.

## [Unreleased]

### Planned

- WebGPU Capture Layer quality gate and structural readiness improvements before any public ungating.
- Deeper eval and benchmarking across low- and high-powered device profiles.
- Public hosted inference (out of scope until separate data-handling and deployment review).

## v0.1.0 — Public Demo Milestone

Decision Brief Engine v0.1.0 establishes the first coherent public demo milestone.

### Added

- Cleaner three-column demo layout with setup bar.
- Public example gallery with durable fixtures:
  - Q4 Workforce Allocation / Strategy
  - Local Inference Setup Flow / Product
  - Household Move Planning / Execution
- Example-specific mock Capture Layer and Decision Brief outputs.
- Copy/download/export polish with example-aware Markdown filenames.
- Local Ollama health check via `npm run health:ollama`.
- Local Ollama setup documentation for Mac and Windows.
- Generation telemetry with elapsed time, retries, timeout status, and run details.
- WebGPU model-ready flow that preserves explicit generation intent after disclosure/model load.

### Runtime posture

- Mock demo remains the public default.
- Local Ollama is the strongest real-generation path for local evaluation.
- Browser WebGPU remains gated pending quality improvements.
- Hosted inference remains out of scope.

### Product transparency

- Capture Layer is the user-facing “show your work” artifact.
- Raw model thinking, hidden reasoning, scratchpad output, and chain-of-thought are not exposed.

See [docs/product/public-demo-milestone.md](docs/product/public-demo-milestone.md) for the full milestone write-up.

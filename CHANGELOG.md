# Changelog

All notable product milestones for Decision Brief Engine are documented here.

This project uses pre-1.0 versioning (`v0.x.y`) for capability milestones rather than strict mature semver guarantees. See [docs/project/release-process.md](docs/project/release-process.md) for tagging and release guidance.

## [Unreleased]

### Planned

- WebGPU Capture Layer quality gate and structural readiness improvements before any public ungating.
- Deeper eval and benchmarking across low- and high-powered device profiles.
- Public hosted inference (out of scope until separate data-handling and deployment review).

## v0.2.0 — Decision Trace Milestone

Decision Brief Engine v0.2.0 makes recommendations auditable by adding a structured Decision Trace between the Capture Layer and the final Decision Brief, then refining the UI hierarchy so understanding, judgment, and the portable brief do not compete as peer documents.

### Added

- Decision Trace schema and architecture decision record for traceable recommendation rationale.
- Single-envelope Decision Brief generation contract that returns both Markdown and structured Decision Trace output.
- Decision Trace parser and validation for trace entries, confidence, basis fields, and non-generic `would_change_if` conditions.
- Hand-authored Decision Trace fixtures for the three public gallery examples.
- Structural readiness gates for Decision Trace coverage, groundedness, confidence, basis completeness, and change-condition usefulness.
- In-app Traceable Basis UI inside the existing Decision Brief column, with compact progressive disclosure for recommendations and next steps.
- Markdown export support for Decision Trace, so copied and downloaded briefs remain self-contained and auditable.

### Changed

- Traceable Basis is compact by default and no longer repeats full recommendation or next-step statements as collapsed titles.
- Capture Layer remains fully visible before brief generation, then becomes secondary behind a compact summary once a Decision Brief exists.
- Decision Brief is more clearly the primary reading surface after generation.

### Runtime posture

- Mock demo remains the public default.
- Local Ollama remains the strongest real-generation path for local evaluation.
- Browser WebGPU remains gated pending quality improvements.
- Hosted inference remains out of scope.

### Product transparency

- Capture Layer remains the source-of-understanding artifact.
- Decision Trace becomes the source-of-judgment artifact.
- Decision Brief remains the portable output artifact.
- Raw model thinking, hidden reasoning, scratchpad output, and chain-of-thought are not exposed.

### Deferred

- Responsive/narrow viewport improvements, tracked separately in #101.
- Public hosted inference.
- WebGPU public ungating.
- Persistence, accounts, collaboration, and long-lived project history.
- Option scoring matrices, rationale graphs, or argument-tree UI.

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

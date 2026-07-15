# Changelog

All notable product milestones for Decision Brief Engine are documented here.

This project uses pre-1.0 versioning (`v0.x.y`) for capability milestones rather than strict mature semver guarantees. See [docs/project/release-process.md](docs/project/release-process.md) for tagging and release guidance.

## [Unreleased]

### Planned

- Re-enter browser inference evaluation with stronger WebGPU model candidates under #149.
- Improve bounded Capture quality retry effectiveness under #162.

## v0.3.0 — Long-Form Decision Capture

**2026-07-15**

Decision Brief Engine v0.3.0 adds reliable long-form decision capture for realistic meeting and interview material while preserving source coverage, grounded recommendations, and typed failure behavior.

### Added

- Hierarchical processing for long decision material with planning, chunk-level Capture, deterministic merge behavior, and source-coverage checks.
- Two long-form evaluation fixtures covering platform rearchitecture and regional launch readiness.
- Grounded Capture Layer next-step validation before Decision Brief generation.
- Deterministic source-bound Decision Trace construction for recommendation and next-step rationale.
- Exact Stage A section-body schema with application-owned canonical headings.
- Targeted correction of only failing model-owned Decision Brief sections.
- Capture and Stage A retry diagnostics with typed terminal failures.

### Changed

- Passing Decision Brief sections remain byte-for-byte unchanged during targeted correction.
- Recommendation and Suggested Next Steps remain application-owned and source-bound.
- Summary correction uses a 50-word operating target against the unchanged 60-word validator.
- Sentence correction uses a 30-word operating target against the unchanged 35-word validator.
- Local Ollama `qwen3:4b` is the supported real-generation baseline for ordinary and long-form inputs.

### Quality evidence

- Q4 workforce allocation, platform rearchitecture, and regional launch readiness each produced usable full artifacts.
- Both required long-form fixtures cleared Capture Layer, Decision Brief, Decision Trace, alignment, writing, and groundedness gates.
- Five of six final counted Local Ollama artifacts were usable.
- One Platform run ended in a typed Capture quality failure after the model repeated an unsupported placeholder on its single bounded retry.
- No validator was weakened, no content was silently truncated, and no trace basis was fabricated.

### Known limitation

Local generation can return a typed quality failure when its single bounded correction cannot recover a source-grounded Capture Layer next step. The application rejects that output before Decision Brief generation rather than silently accepting or fabricating an artifact. Follow-up work is tracked in #162.

### Runtime posture

- Mock demo remains the public default.
- Local Ollama `qwen3:4b` remains the supported real-generation path.
- Browser WebGPU remains experimental and gated for v0.3.0.
- Hosted inference remains deferred.

## v0.2.1 — Decision Brief Workspace and Writing Quality Polish

**2026-07-13**

### Added

- Rendered Decision Brief Preview with an explicit Edit Markdown mode.
- Deterministic writing-quality checks for canonical Decision Brief fixtures.

### Changed

- The generated workflow prioritizes the Decision Brief while keeping Raw Input and Capture Layer accessible.
- Markdown edits immediately update Preview, copy, and download output.
- Recommendation wording is aligned across Capture Layer, Decision Brief, and Decision Trace.
- Fixture writing is more concise, decision-first, and domain-aware.
- Singleton basis fields render as plain text while multi-item fields retain bullets.
- Mock conditional wording is clearer and grammatically complete.

### Fixed

- Rendered Preview content remains inside its scrolling surface.
- Expanded Traceable Basis content can be scrolled while its summary remains visible.
- Nested Basis disclosure chevrons correctly indicate open and closed state.
- Canned-language checks avoid obvious substring and legitimate-word false positives.

### Runtime posture

- Mock demo remains the public default.
- Local Ollama remains the strongest real-generation path.
- Browser WebGPU remains experimental and gated.
- Hosted inference remains deferred.

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
- Generated workflow UI redesign exploration, tracked separately in #105.
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

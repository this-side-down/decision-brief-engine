# Release and Versioning Policy

## Purpose

Decision Brief Engine uses lightweight pre-1.0 versioning so product milestones stay traceable without adding heavyweight release automation or enterprise process overhead.

This policy applies to the Decision Brief Engine product codebase. It does not define npm publishing, desktop/mobile distribution, or hosted-service SLA commitments.

## Version format

Use semantic-looking pre-1.0 versions:

```text
v0.x.y
```

Recommended meaning before `1.0.0`:

- `0.x.0` — meaningful product capability milestones
- `0.x.y` — bug fixes, docs corrections, and small polish within a milestone
- `1.0.0` — reserved for a stable user-facing product promise; do not tag until that bar is met

Pre-1.0 versions describe product milestones, not strict mature semver guarantees. Breaking changes may occur between `0.x.0` releases while the product contract is still evolving.

## Current product states to track

Each release should make clear which inference and deployment states exist:

- mocked/static public Vercel demo
- local Ollama + `qwen3:4b` inference for development and evaluation (higher-quality local path)
- experimental gated browser WebGPU inference (`VITE_ENABLE_WEBGPU_INFERENCE=true`; not public by default)
- deferred public hosted inference

Do not describe the public demo as hosted inference. Do not describe local Ollama mode as a general-user default for the public app.

## Milestone mapping

Use the following milestone map unless a later ADR or issue explicitly changes it:

| Version | Milestone |
| --- | --- |
| `v0.1.0` | Public demo milestone: mock default, example gallery, export polish, Local Ollama dev tools, gated WebGPU, generation telemetry |
| `v0.2.0` | Decision Trace milestone: structured recommendation rationale, trace fixtures/eval gates, in-app traceable basis UI, trace-aware Markdown export, and IA polish for understanding/judgment/output hierarchy |
| `v0.3.0` | Long-Form Decision Capture: hierarchical processing of realistic long decision material, complete source coverage, auditable merge behavior, Mock demonstration, and Local Ollama validation |

Intermediate `0.x.y` releases should note whether they change product behavior or docs only.

## When to create a GitHub tag and release

Create a GitHub tag and GitHub Release when a milestone meaningfully changes what the product can do or what readers should expect from the repository.

Tag when:

- a milestone in `CHANGELOG.md` is complete enough to reference externally;
- a new inference mode becomes user-visible or documented as supported;
- docs or product posture changes are substantial enough that Git history alone is insufficient.

Do not tag for:

- routine doc typo fixes unless they are bundled into a patch release;
- unfinished experiments behind unmerged branches;
- internal refactors with no user-visible or milestone change.

## Release process

1. Confirm the milestone work is merged to `main`.
2. Update `CHANGELOG.md` with the release date and final notes.
3. Run validation:
   - `npm run typecheck`
   - `npm run build`
   - For inference-mode changes, run manual smoke checks for mock default, optional WebGPU flag, and Ollama locked mode; record browser model results in `fixtures/evaluation/` when relevant.
4. Create an annotated Git tag matching the version, for example `v0.1.0`.
5. Create a GitHub Release from that tag.
6. Copy the corresponding `CHANGELOG.md` section into the GitHub Release description.

This repository does not use semantic-release automation, release branches, or npm publishing as part of the release process.

## Release note content

Each GitHub Release should include:

- the milestone version and date;
- which inference modes exist in that version;
- whether the public Vercel app is mocked-only or supports built-in inference;
- notable docs or evaluation changes;
- explicit deferred items when relevant.

Keep release notes concise and product-oriented. Prefer capability statements over commit dumps.

Example structure:

```markdown
## v0.1.0 — Public Demo Milestone

### Product state
- Public Vercel demo: mocked/static workflow with example gallery
- Local development: Ollama + qwen3:4b via ModelAdapter; health check CLI
- Browser inference: experimental, gated behind build flag

### Highlights
- ...

### Deferred
- Public hosted inference
- WebGPU public ungating pending quality gate
```

## Changelog maintenance

- Keep `CHANGELOG.md` at the repository root.
- Add entries under `[Unreleased]` while work is in progress.
- Move entries into a dated version section when a milestone is tagged.
- Prefer user-visible and milestone language over internal refactor details.

## Non-goals

This policy does not add:

- semantic-release automation;
- npm package publishing;
- release branches;
- migration policy;
- enterprise support commitments;
- in-app version display requirements;
- desktop or mobile distribution versioning rules.

## Related documents

- [CHANGELOG.md](../../CHANGELOG.md)
- [ADR 0004: inference path decision brief](../decisions/0004-inference-path-decision-brief.md)
- [README product state section](../../README.md)

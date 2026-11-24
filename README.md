# Decision Brief Engine

Decision Brief Engine turns messy notes into structured decision briefs with a visible Capture Layer and a source-bound Decision Trace.

The **Capture Layer** records decisions, risks, constraints, and unresolved questions. The **Decision Trace** links recommendations and next steps to captured evidence, assumptions, alternatives, and missing context. The final brief exports as Markdown. Raw model thinking and chain-of-thought are not exposed.

## Status

**Current release:** v0.3.3 — Responsive Workspace and Build Transparency\
**Public demo:** https://dbe.this-side-down.com/  
**Release notes:** https://github.com/this-side-down/decision-brief-engine/releases/tag/v0.3.3

The hosted demo runs in Mock mode by default for reliability. Local Ollama with `qwen3:4b` remains the supported real-generation path for long inputs. Experimental browser inference can be enabled explicitly for short-to-medium notes using WebGPU and WebLLM with `Qwen3.5-4B-q4f16_1-MLC`.

v0.3.3 adds a responsive workspace, in-app Build details for runtime and data handling, and a documented human-directed, AI-assisted development workflow. The required CI check runs tests, typecheck, and build. A manual advisory workflow validates DBE in a pinned Chainguard Wolfi image.

v0.3.0 added hierarchical processing for realistic long meeting and interview material, source-coverage protection, grounded suggested next steps, canonical Decision Brief generation, deterministic source-bound Decision Trace construction, and typed bounded correction behavior.

A measured limitation remains: Local generation can return a typed quality failure when its single bounded correction cannot recover a source-grounded Capture Layer next step. The application rejects that output before Decision Brief generation rather than silently accepting or fabricating an artifact.

v0.1.0 is the first public demo milestone: example gallery, export polish, Local Ollama health check, and generation telemetry. See [Public demo milestone](docs/product/public-demo-milestone.md) for the full write-up.

## Engineering quality

DBE uses React 19, TypeScript 6, Vite 8, and Tailwind 4. The required [CI check](.github/workflows/ci.yml) runs `npm ci` and `npm run check` on Node 22: tests, TypeScript typecheck, and the production build.

For additional pre-push feedback, contributors and coding agents can check one gallery fixture:

```sh
npm run --silent eval:pipeline -- --mode=mock --fixture=platform-rearchitecture-review --json --fail-on-quality
```

The evaluator returns exit `3` for a product-quality failure and keeps its JSON output parseable. Without `--fail-on-quality`, completed quality failures are report-only. See the [pipeline evaluation guide](docs/ai/pipeline-eval-harness.md) for diagnostics and exit codes. Local feedback is advisory; the required PR check remains the merge gate.

The manual [Wolfi compatibility workflow](.github/workflows/wolfi-check.yml) runs `npm ci` and `npm run check` in a pinned Chainguard Wolfi image. It is advisory and separate from the required Node 22 check. See [AI-native development](docs/project/ai-native-development.md) for the review, privacy, and tool-authority boundaries.

### Chainguard Checks and Workspaces

The optional [Chainguard check](.chainguard/ci.yaml) runs dependency installation, the strict Mock evaluator, and the full project check on pull requests and commits to main. It is advisory; GitHub Actions remains the required merge gate.

The [Workspace environment](.chainguard/develop.yaml) provides Node 22, npm, and Claude Code. With `chainctl` installed and Workspaces enabled for your account, open a session from a clean checkout, then run the same declared check:

```sh
chainctl develop
# In the Workspace:
run-ci dbe-check
```

`run-ci` checks the working tree, including uncommitted edits. Hosted Checks independently validates the pull request merged into its base. The Workspace uses normal internet access and adds Claude Code; the hosted check restricts network access to the npm registry.

These optional developer tools require Chainguard access and available allowance. Claude sign-in is needed only to use the coding agent. DBE and the Mock demo do not require either service.

A separate GitLab CI/CD portability experiment is tracked in [#184](https://github.com/this-side-down/decision-brief-engine/issues/184); GitHub remains the public source and Vercel deployment source.

## v0.3 Long-Form Decision Capture

v0.3 processes long decision material through hierarchical Capture, deterministic merge behavior, and source-coverage checks before producing a canonical Decision Brief and traceable Decision Trace.

The long-form path preserves beginning, middle, and end signals, rejects unsupported next steps before brief generation, and uses a single bounded targeted correction for failing model-owned brief sections. Passing sections remain unchanged, while Recommendation and Suggested Next Steps remain source-bound.

See [CHANGELOG.md](CHANGELOG.md) for the full release summary.

## v0.2 Decision Trace

v0.2 closes the recommendation transparency gap by adding a structured Decision Trace between the Capture Layer and Decision Brief, then polishing the UI hierarchy so Capture Layer (understanding), Decision Trace (judgment), and Decision Brief (portable output) read as one flow instead of three peer documents.

Recommendations and next steps are traceable to captured intent, evidence, assumptions, risks, constraints, alternatives, and missing context without exposing raw model thinking or chain-of-thought. Traceable Basis stays compact by default, and Capture Layer becomes secondary behind a compact summary once a Decision Brief exists. See [CHANGELOG.md](CHANGELOG.md) for the full v0.2.0 milestone summary.

See:

- [v0.2 Decision Trace direction](docs/product/v0.2-decision-trace-direction.md)
- [ADR: Traceable recommendation rationale](docs/architecture/adr-traceable-recommendation-rationale.md)

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

The public demo defaults to **Mock demo**. Browser WebGPU inference is experimental and hidden unless `VITE_ENABLE_WEBGPU_INFERENCE=true` is set at build time. When enabled, users can opt into **Live in browser** for local WebGPU inference with a one-time model download of about 2.2 GiB.

The selected browser model is `Qwen3.5-4B-q4f16_1-MLC` through `@mlc-ai/web-llm` 0.2.84. Browser inference currently supports short-to-medium notes and the three browser-compatible examples: Household Move Planning, Q4 Workforce Allocation, and Local Inference Setup Flow. Long-form browser support is tracked in #166. **Local Ollama** remains the local/dev path when `VITE_GENERATION_MODE=ollama` is set.

See `docs/product/live-browser-inference-ux.md` for mode behavior, disclosure copy, and fallback states, and `docs/ai/browser-generation-diagnostics.md` for the measured v0.3.1 browser procedure and limitations.

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
- [Decision Trace schema](docs/architecture/decision-trace-schema.md)
- [MVP architecture](docs/architecture/mvp-architecture.md)
- [ADR: Traceable recommendation rationale](docs/architecture/adr-traceable-recommendation-rationale.md)
- [Conceptual data model](docs/architecture/data-model.md)
- [AI prompt contracts](docs/ai/prompt-contracts.md)
- [Evaluation plan](docs/ai/evaluation-plan.md)
- [Capture Layer evaluation harness](docs/ai/capture-layer-eval-harness.md)
- [Browser model / prompt variant eval](docs/ai/browser-model-prompt-variant-eval.md)
- [Browser model quality gate evaluation](docs/ai/browser-model-quality-gate.md)
- [Browser inference adapter feasibility](docs/ai/browser-inference-adapter-feasibility.md)
- [Browser generation diagnostics](docs/ai/browser-generation-diagnostics.md)
- [Local Ollama setup and health check](docs/ai/ollama-local-setup.md)
- [Qwen3/Ollama JSON-mode quirk](docs/ai/ollama-qwen3-json-quirk.md)
- [Implementation build plan](docs/implementation/build-plan.md)
- [MVP implementation checklist](docs/implementation/mvp-checklist.md)
- [ADR 0002: FOSS-only MVP runtime stack](docs/decisions/0002-foss-only-mvp-stack.md)
- [ADR 0004: inference path decision brief](docs/decisions/0004-inference-path-decision-brief.md)
- [Release and versioning policy](docs/project/release-process.md)
- [AI-native development](docs/project/ai-native-development.md)
- [Changelog](CHANGELOG.md)
- [Repository maintenance](docs/repo-maintenance.md)

## Development

Use Node 22, matching CI. From a fresh checkout:

```sh
npm ci
npm run dev
```

The default Mock workflow needs no model runtime or model-provider account. Before submitting a change, run:

```sh
npm run check
```

For focused checks, use `npm run typecheck` or `npm test`. `npm run build` creates the production bundle, and `npm run preview` serves it locally. Optional local inference setup is documented above.

### Capture Layer evaluation (#72)

```sh
npm run eval:capture -- --mode=mock
npm run eval:capture -- --mode=ollama
npm run eval:capture -- --mode=webgpu
```

See [Capture Layer evaluation harness](docs/ai/capture-layer-eval-harness.md). WebGPU remains a documented manual browser procedure. Prompt variant comparison: [browser-model-prompt-variant-eval.md](docs/ai/browser-model-prompt-variant-eval.md).

## Contributing

Use [issues](https://github.com/this-side-down/decision-brief-engine/issues) for bug reports and proposed changes. Keep pull requests focused, describe the behavior changed, and include validation results. Use synthetic or explicitly public fixtures and follow the [development and privacy guidance](docs/project/ai-native-development.md).

## Product Lab

This project is part of an ongoing exploration into AI-native product systems, decision support, and intent-centric workflows.

## License

Licensed under the [MIT License](LICENSE).

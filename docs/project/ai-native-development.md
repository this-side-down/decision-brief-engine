# AI-Native Development

Decision Brief Engine is human-directed and AI-assisted. This document makes that operating model inspectable without treating AI output as authority or lowering the standard for public code.

## Authority

- The human product owner controls product intent, scope, sensitive-data boundaries, merge decisions, releases, and public claims.
- AI tools may support research, product reasoning, repository analysis, implementation, tests, documentation, and review.
- GitLab tracks primary development and delivery. GitHub retains the public source history, issues, pull requests, checks, decisions, and releases.
- No agent may merge, tag, release, add hosted data handling, or change the product boundary without explicit human authority.

Tool assignments can change. The authority model does not.

## Change workflow

1. Start from a bounded issue or an explicit product decision.
2. Inspect the live repository and preserve existing architecture, deployment, versioning, and release contracts.
3. Make the smallest coherent change on a branch.
4. Add or update deterministic evidence with the behavior.
5. Run `npm run check`.
6. Open a pull request or merge request that explains the outcome, boundary, and validation.
7. Let the existing protected-branch and human merge process decide what ships.

AI-assisted changes receive the same review and quality bar as any other change. Generated code is not accepted because it was generated, and human-written code is not exempt from evidence.

See [the DBE typecheck experiment (#190)](https://github.com/this-side-down/decision-brief-engine/issues/190) for the evidence behind the advisory pre-push check and why CI validates the current merge inputs.

Maintainers can run [Wolfi compatibility](../../.github/workflows/wolfi-check.yml) from the GitHub Actions tab after lockfile, Node, or build-tool changes. It runs `npm ci` and `npm run check` in a pinned Chainguard Wolfi image and records the selected revision, image digest, and runtime versions. The existing required PR check remains the merge gate.

## Production delivery

DBE is hosted on Vercel. Maintainers use a private GitLab repository as the primary development and release source; this GitHub repository retains public source history, issues, releases, and reviewed updates. Public contributions continue through GitHub issues and pull requests. Maintainers reconcile accepted changes into the primary delivery repository before release.

The release gate is a maintainer-controlled procedure:

1. Review and merge the change into protected GitLab main.
2. Require a successful native main-push pipeline on the actual merged revision. The required job runs `npm ci`, the fixed strict Mock evaluator with parseable JSON, and `npm run check` for tests, typecheck, and build. Verify the recorded source identity and artifact checksums.
3. Build a staged Vercel production deployment from that same revision, using Node 22, `npm ci`, and `npm run build`. Keep automatic production-domain assignment disabled. Vercel rebuilds source separately from the GitLab artifact, so record the deployment identity as well as the source revision.
4. Check the staged app's Mock generation, Decision Trace, Markdown export, and desktop/mobile layout. Recheck main, CI, deployment source, and the current production mapping before the release maintainer promotes that exact staged production build.
5. Verify the public domain and app after promotion, confirm the manual domain-assignment policy, and retain the previous eligible production deployment for rollback.

GitLab's full validation result and Vercel's staged source revision are checked explicitly before promotion. The native Vercel build status covers its separate build. The prior MR result describes the inputs it tested; a changed base or source requires fresh validation. See [#190](https://github.com/this-side-down/decision-brief-engine/issues/190) and [#184](https://github.com/this-side-down/decision-brief-engine/issues/184) for the underlying experiments and delivery decisions.

Rollback restores a retained production deployment in the same Vercel project. Select the recorded last known good deployment as the rollback target. Verify the public domain and Mock flow afterward and keep automatic domain assignment off. Restoring a build and reverting the project's Git connection or build settings are separate recovery actions.

Wolfi compatibility remains manual and advisory in GitLab as well. Chainguard hosted Checks supplies advisory feedback on the public GitHub workflow; Workspaces supplies isolated working-tree feedback for contributors and coding agents. GitLab's required pipeline owns GitLab validation. Enabling merged-results pipelines or merge trains is a separate maintainer decision tied to available GitLab entitlements.

## Public repository standard

- Keep abstractions proportional to repeated product needs.
- Prefer stable browser and framework primitives over a new dependency when they solve the problem cleanly.
- Keep domain contracts and inference adapters independent from presentation details.
- Use synthetic or explicitly public fixtures. Do not commit private personal, customer, or other sensitive source material.
- Never commit prompts containing secrets, credentials, or sensitive source content.
- Keep private project URLs, account identifiers, session/runner identifiers, personal paths, and raw operational logs out of public changes. Use placeholders or sanitized summaries for delivery examples.
- Record failed experiments and measured limitations without converting them into product claims.
- Preserve attribution required by dependencies and the repository's MIT license.

## AI transparency boundary

DBE's product views show the Capture Layer, Decision Trace, validation findings, bounded correction outcomes, and diagnostic metadata.

The public Mock demo is deterministic and makes no model call. Local Ollama and gated browser inference remain explicit runtime choices with documented boundaries.

By default, DBE keeps decision content in session memory. The browser stores the selected generation-mode preference and may cache downloaded WebGPU model files.

Developers can enable [local WebGPU diagnostics](../ai/browser-generation-diagnostics.md) on their local Vite server to save raw model output to disk. This capture is off by default.

## Framework posture

The current application uses React, TypeScript, Vite, and Tailwind because they support the shipped product and its deployment path. A newer framework is not adopted for novelty alone. It must first prove user value, accessibility, local-only compatibility, maintainability, and an exit path in a bounded experiment outside the shipped runtime.

# AI-Native Development

Decision Brief Engine is human-directed and AI-assisted. This document makes that operating model inspectable without treating AI output as authority or lowering the standard for public code.

## Authority

- The human product owner controls product intent, scope, sensitive-data boundaries, merge decisions, releases, and public claims.
- AI tools may support research, product reasoning, repository analysis, implementation, tests, documentation, and review.
- GitHub issues, pull requests, checks, decisions, and releases are the durable project record.
- No agent may merge, tag, release, add hosted data handling, or change the product boundary without explicit human authority.

Tool assignments can change. The authority model does not.

## Change workflow

1. Start from a bounded issue or an explicit product decision.
2. Inspect the live repository and preserve existing architecture, deployment, versioning, and release contracts.
3. Make the smallest coherent change on a branch.
4. Add or update deterministic evidence with the behavior.
5. Run `npm run check`.
6. Open a pull request that explains the outcome, boundary, and validation.
7. Let the existing protected-branch and human merge process decide what ships.

AI-assisted changes receive the same review and quality bar as any other change. Generated code is not accepted because it was generated, and human-written code is not exempt from evidence.

## Public repository standard

- Keep abstractions proportional to repeated product needs.
- Prefer stable browser and framework primitives over a new dependency when they solve the problem cleanly.
- Keep domain contracts and inference adapters independent from presentation details.
- Use synthetic or explicitly public fixtures. Do not commit private Career OS, household, customer, or custody-sensitive source material.
- Never commit prompts containing secrets, credentials, or sensitive source content.
- Record failed experiments and measured limitations without converting them into product claims.
- Preserve attribution required by dependencies and the repository's MIT license.

## AI transparency boundary

DBE exposes inspectable product artifacts: the Capture Layer, Decision Trace, validation findings, bounded correction outcomes, and privacy-safe diagnostics. It does not expose or store raw model thinking, hidden reasoning, scratchpads, or chain-of-thought.

The public Mock demo is deterministic and makes no model call. Local Ollama and gated browser inference remain explicit runtime choices with documented boundaries.

Decision content is not automatically persisted by DBE. The browser stores the selected generation-mode preference, and the opt-in WebGPU runtime may cache downloaded model files in browser-managed storage; neither is server-side decision storage.

## Framework posture

The current application uses React, TypeScript, Vite, and Tailwind because they support the shipped product and its deployment path. A newer framework is not adopted for novelty alone. It must first prove user value, accessibility, local-only compatibility, maintainability, and an exit path in a bounded experiment outside the shipped runtime.

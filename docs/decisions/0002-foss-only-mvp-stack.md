# 0002 — Require FOSS-only MVP runtime stack

## Status

Accepted

## Decision

The Decision Brief Engine MVP will use only free and open-source software in the runtime stack, including AI engines, model runners, inference engines, and models.

This constraint also applies to the frontend framework, build tooling, styling, and any server or backend layer introduced for the MVP.

Hosted proprietary model APIs are out of scope for MVP implementation. The MVP may use mocked generation before local or self-hosted FOSS inference is wired in. No final model is selected by this decision, and any candidate model must pass license review before adoption.

## Rationale

- Keeps the product inspectable and locally reproducible.
- Supports enterprise deployment paths where hosted proprietary AI APIs are not acceptable.
- Reduces dependency on a single vendor.
- Separates prompt/data contracts from provider-specific APIs.
- Creates a clearer path to private, self-hosted, or air-gapped evaluation later.

## Consequences

- Model quality may be lower than best hosted proprietary APIs.
- Latency and hardware requirements may matter sooner.
- Model selection requires license review.
- Prompt contracts must remain provider-neutral.
- MVP implementation should support mocked generation before FOSS inference is wired in.

## Implementation guidance

- Prefer local or self-hosted inference for the MVP.
- Use a model adapter boundary so the UI and prompt pipeline are not tightly coupled to one engine, model runner, inference engine, or model.
- Keep prompt and data contracts provider-neutral.
- Treat license compatibility as a product and architecture requirement, not a cleanup task.
- Avoid production deployment architecture and enterprise infrastructure while implementing the MVP constraint.

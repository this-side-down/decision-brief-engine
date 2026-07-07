# Evaluation fixtures

## Purpose

These fixtures support repeatable manual testing of the mocked Decision Brief Engine MVP pipeline.

They are for workflow and wiring readiness: raw notes -> Capture Layer -> Decision Brief -> edit -> export. They do not evaluate real model quality, and they do not compare output to proprietary hosted models.

## How to use manually

1. Open the app locally with `npm run dev`.
2. Copy the fixture's raw input into the Input Workspace.
3. Select the fixture's target brief type.
4. Generate the mocked Capture Layer.
5. Generate the mocked Decision Brief.
6. Review the output against the expected qualities and known risks.
7. Score the result with `fixtures/evaluation/manual-scorecard.md`.

## Fixture map

- `product-prioritization.md`: Product
- `strategy-tradeoff.md`: Strategy
- `execution-planning.md`: Execution
- `customer-interview-synthesis.md`: Product
- `ambiguous-stakeholder-conversation.md`: Strategy

## Notes

- Current scoring indicates mocked workflow readiness only.
- Future local or self-hosted FOSS inference can reuse these fixtures for output-quality evaluation.
- Do not add an automated evaluation runner for these fixtures.

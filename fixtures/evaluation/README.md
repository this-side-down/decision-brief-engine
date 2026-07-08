# Evaluation fixtures

## Purpose

These fixtures support repeatable Capture Layer and Decision Brief evaluation for Decision Brief Engine.

They cover:

- Mocked workflow/wiring readiness
- Local Ollama output quality signals
- Experimental browser WebGPU Capture Layer quality (manual)

They do not compare outputs to proprietary hosted models.

## Capture Layer harness (#72)

Use the harness documented in [`docs/ai/capture-layer-eval-harness.md`](../../docs/ai/capture-layer-eval-harness.md).

```sh
# Mock (automated)
npm run eval:capture -- --mode=mock

# Local Ollama (automated; requires Ollama)
npm run eval:capture -- --mode=ollama

# WebGPU (prints manual procedure; run in browser)
npm run eval:capture -- --mode=webgpu
```

First evaluation case: built-in construction Strategy example (`strategy-tradeoff.md` / construction messy transcript).

Pass/fail order:

1. Schema validity (hard gate)
2. Structural readiness (automated hollow-field checks)
3. Manual scorecard (`manual-scorecard.md`) for product quality
4. Ungating thresholds remain in [`docs/ai/browser-model-quality-gate.md`](../../docs/ai/browser-model-quality-gate.md)

Record comparable rows in `browser-model-results.md`.

## How to use manually (full fixture set)

1. Open the app locally with `npm run dev`.
2. Copy the fixture's raw input into the Input Workspace.
3. Select the fixture's target brief type.
4. Generate the Capture Layer (mock, Ollama, or gated WebGPU).
5. Only if Capture Layer schema/structural gates pass, generate the Decision Brief.
6. Review the output against the expected qualities and known risks.
7. Score the result with `fixtures/evaluation/manual-scorecard.md`.

## Fixture map

- `product-prioritization.md`: Product
- `strategy-tradeoff.md`: Strategy (first harness case; construction workforce planning)
- `execution-planning.md`: Execution
- `customer-interview-synthesis.md`: Product
- `ambiguous-stakeholder-conversation.md`: Strategy

## Notes

- Mock scores show wiring readiness; Ollama/WebGPU scores are local quality signals, not production certification.
- Do not add hosted proprietary model APIs to this evaluation path.
- Extending the CLI beyond the construction Strategy case is optional follow-on work; the five-fixture ungating set remains defined in the quality gate doc.

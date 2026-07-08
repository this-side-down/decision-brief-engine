# Public demo examples

Durable fixtures for the in-app example gallery and mock demo generation.

## Layout

Each example lives under `fixtures/examples/<example-id>/`:

| File | Purpose |
|------|---------|
| `metadata.json` | Title, brief type, description, positioning tags |
| `messy-notes.md` | Raw input loaded by the gallery |
| `expected-capture-layer.json` | Structured baseline for mock Capture Layer output and schema tests |
| `expected-decision-brief.md` | Final mock Decision Brief output for the public demo |

## Featured examples

| ID | Brief type | Title |
|----|------------|-------|
| `specialty-trades-expansion` | Strategy | Specialty Trades Expansion |
| `local-inference-setup-flow` | Product | Local Inference Setup Flow |
| `household-move-planning` | Execution | Household Move Planning |

The evaluation harness (`construction-strategy`) still uses the Strategy messy notes; content matches `specialty-trades-expansion/messy-notes.md`.

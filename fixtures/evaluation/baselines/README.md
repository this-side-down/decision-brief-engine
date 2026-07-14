# Evaluation baselines

Machine-readable full-pipeline evaluation records (`resultFormatVersion: 1`).

| File | Mode | Notes |
| --- | --- | --- |
| `mock-pipeline-baseline.json` | Mock | Committed reference for all eight cases |
| `ollama-pipeline-baseline.json` | Ollama `qwen3:4b` | Local run; may include timeouts / brief-generation failures |

Regenerate:

```sh
npm run eval:pipeline -- --mode=mock --output=fixtures/evaluation/baselines/mock-pipeline-baseline.json
npm run health:ollama
npm run eval:pipeline -- --mode=ollama --output=fixtures/evaluation/baselines/ollama-pipeline-baseline.json
```

Manual score fields remain `null` until a reviewer fills them. See [`docs/ai/pipeline-eval-harness.md`](../../../docs/ai/pipeline-eval-harness.md).

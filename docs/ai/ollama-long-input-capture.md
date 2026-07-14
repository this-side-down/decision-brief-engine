# Local Ollama long-input capture

## Overview

Over-threshold Local Ollama input routes through the same hierarchical planner and merge orchestration introduced in #147. Ordinary-sized input remains on the existing single-pass `ollamaModelAdapter.generateCaptureLayer` path.

`getLongInputCaptureCapability("ollama")` registers `ollamaLongInputCaptureCapability`, which extracts chunk-local partial signals through structured Ollama generation and deterministic parsing.

## Chunk extraction

Each planned chunk receives:

- current chunk text only
- chunk index and total count
- brief type guidance
- optional source label

The model returns a constrained JSON envelope with semantic fields only. Application code attaches:

- `chunkId`
- chunk `sourceRange`
- evidence `sourceChunkId` and source range
- conflict `sourceChunkIds`
- unresolved-reference `sourceChunkId`

`ollamaGenerate` accepts optional `think` and `temperature` settings. Ordinary single-pass Capture Layer and Decision Brief calls omit `think` and temperature. Chunk extraction passes `think: false`, `temperature: 0`, and the chunk JSON Schema as `format`.

Chunk parse/schema/placeholder failures throw `ChunkExtractionContractError`. The extractor retries exactly once for that typed contract failure only.

## Retry limits

Each chunk allows at most one retry, and only after parse or schema failure. Semantic weakness, merge readiness failure, and downstream writing/alignment failures are not auto-retried.

## Cancellation and timeout

Orchestration `AbortSignal` flows through:

`generateCaptureLayerForSession` → `runLongInputCapture` → `extractOllamaChunkSignals` → `ollamaGenerate` → `fetch`

- user cancellation throws `GenerationCancelledError`
- configured timeout throws an explicit timeout error
- superseded runs reject stale completion through existing long-input orchestration guards

## Structural readiness

Local Ollama long-form output always uses `STANDARD_CAPTURE_LAYER_STRUCTURAL_EXPECTATIONS`. Generic non-demo Mock long input keeps lower sample-output expectations through the Mock capability profile.

## Evaluation

Targeted long-form evaluation:

```bash
npm run health:ollama
npm run eval:pipeline -- --mode=ollama --model=qwen3:4b --fixture=platform-rearchitecture-review --fixture=regional-launch-readiness-review --output=fixtures/evaluation/baselines/ollama-long-input-v0.3-candidate.json
```

Ordinary-size regression:

```bash
npm run eval:pipeline -- --mode=ollama --model=qwen3:4b --fixture=q4-workforce-allocation
```

The harness records optional `longInputDiagnostics` for hierarchical runs: chunk count, source coverage, retry counts, and stage latency.

## Release gate posture

v0.3.0 remains **not shipped**. This slice records measured `qwen3:4b` evidence only. Validators are not weakened. Mock remains the public default. WebGPU remains gated.

See `fixtures/evaluation/baselines/ollama-long-input-v0.3-candidate.json` for the committed long-form evidence artifact produced on this branch.

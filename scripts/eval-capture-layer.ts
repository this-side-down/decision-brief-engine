#!/usr/bin/env node
/**
 * Capture Layer evaluation CLI (#72)
 *
 * Usage:
 *   npm run eval:capture -- --mode=mock
 *   npm run eval:capture -- --mode=ollama
 *   npm run eval:capture -- --mode=mock --json
 *   npm run eval:capture -- --mode=ollama --case=construction-strategy
 *
 * WebGPU cannot be automated from Node. Use the manual procedure in
 * docs/ai/capture-layer-eval-harness.md and record results with the same
 * pass/fail fields this command prints.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CONSTRUCTION_STRATEGY_EVAL_CASE,
  getCaptureLayerEvalCase,
} from "../src/evaluation/cases.ts";
import {
  printEvalResult,
  runCaptureLayerEval,
} from "../src/evaluation/runCaptureLayerEval.ts";
import type { CaptureLayerEvalMode } from "../src/evaluation/types.ts";

function parseArgs(argv: string[]) {
  const options: {
    mode: CaptureLayerEvalMode;
    caseId: string;
    json: boolean;
    outPath: string | null;
  } = {
    mode: "mock",
    caseId: "construction-strategy",
    json: false,
    outPath: null,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg.startsWith("--mode=")) {
      const mode = arg.slice("--mode=".length);
      if (mode !== "mock" && mode !== "ollama" && mode !== "webgpu") {
        throw new Error(`Unsupported mode: ${mode}`);
      }
      options.mode = mode;
      continue;
    }

    if (arg.startsWith("--case=")) {
      options.caseId = arg.slice("--case=".length);
      continue;
    }

    if (arg.startsWith("--out=")) {
      options.outPath = arg.slice("--out=".length);
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(`Capture Layer eval harness

Options:
  --mode=mock|ollama|webgpu   Generation path (default: mock)
  --case=<id>                 Evaluation case (default: construction-strategy)
  --json                      Print machine-readable JSON summary
  --out=<path>                Write full JSON result (includes captureLayer) to path
  -h, --help                  Show help

WebGPU: --mode=webgpu prints the manual procedure and exits without running inference.
`);
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.mode === "webgpu") {
    console.log(`WebGPU Capture Layer evaluation is manual (browser-only).

1. Follow: docs/ai/capture-layer-eval-harness.md (WebGPU section)
2. Use case: ${options.caseId} (built-in construction Strategy example)
3. Record the same fields as mock/ollama CLI output into
   fixtures/evaluation/browser-model-results.md

Automated CLI generation is supported for --mode=mock and --mode=ollama only.
`);
    process.exit(2);
  }

  const evalCase =
    getCaptureLayerEvalCase(options.caseId) ??
    (() => {
      throw new Error(
        `Unknown evaluation case: ${options.caseId}. Known: ${CONSTRUCTION_STRATEGY_EVAL_CASE.id}`,
      );
    })();

  const rawInputText = readFileSync(
    resolve(process.cwd(), evalCase.rawInputPath),
    "utf8",
  );

  const result = await runCaptureLayerEval({
    mode: options.mode,
    caseId: options.caseId,
    rawInputText,
  });

  printEvalResult(result, { json: options.json });

  if (options.outPath) {
    const outPath = resolve(process.cwd(), options.outPath);
    writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.error(`Wrote full result to ${outPath}`);
  }

  process.exit(result.passFail.overallAutomated === "pass" ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

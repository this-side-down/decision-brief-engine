#!/usr/bin/env node
/**
 * Full-pipeline evaluation CLI (#126)
 *
 * Usage:
 *   npm run eval:pipeline -- --mode=mock
 *   npm run eval:pipeline -- --mode=ollama
 *   npm run eval:pipeline -- --mode=mock --fixture=product-prioritization
 *   npm run eval:pipeline -- --mode=mock --json --output=tmp/pipeline-mock.json
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  formatPipelineCliHelp,
  parsePipelineCliArgs,
  PipelineCliError,
  resolveCaseIds,
} from "../src/evaluation/pipeline/cliArgs.ts";
import {
  formatPipelineRunHuman,
  runPipelineEvalSuite,
} from "../src/evaluation/pipeline/runPipelineEval.ts";
import type { PipelineRunSummary } from "../src/evaluation/pipeline/resultTypes.ts";

async function main() {
  let options;
  try {
    options = parsePipelineCliArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof PipelineCliError) {
      console.error(error.message);
      process.exit(error.exitCode);
    }
    throw error;
  }

  if (options.help) {
    console.log(formatPipelineCliHelp());
    process.exit(0);
  }

  if (options.mode === "webgpu") {
    console.log(`WebGPU full-pipeline evaluation is not automated in Node.

1. Follow docs/ai/pipeline-eval-harness.md (WebGPU section)
2. After #124 recovers, record measured results with buildWebGpuPipelineResult
   (same result format as mock/ollama)
3. Do not invent browser outputs

Use --mode=mock or --mode=ollama for automated runs.
`);
    process.exit(2);
  }

  const caseIds = resolveCaseIds(options);
  const repoRoot = process.cwd();

  let summary: PipelineRunSummary;
  try {
    summary = await runPipelineEvalSuite({
      mode: options.mode,
      caseIds,
      repoRoot,
      modelOverride: options.model,
      artifactsDir: options.artifactsDir,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Harness execution failed: ${message}`);
    process.exit(2);
  }

  if (options.outputPath) {
    const outPath = resolve(repoRoot, options.outputPath);
    writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    console.error(`Wrote run summary to ${outPath}`);
  }

  if (options.json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(formatPipelineRunHuman(summary));
  }

  if (summary.infrastructureFailure) {
    console.error(
      "Infrastructure failure detected (distinct from product-quality gate failures).",
    );
    process.exit(2);
  }

  // Harness executed successfully. Product-quality failures are recorded in
  // the result records and do not use the infrastructure exit code.
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
});

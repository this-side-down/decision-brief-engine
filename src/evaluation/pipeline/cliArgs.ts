import type { PipelineGenerationMode } from "./resultTypes";
import { PIPELINE_EVAL_CASE_IDS, getPipelineEvalCase } from "./cases";

export type PipelineCliOptions = {
  mode: PipelineGenerationMode;
  fixtureIds: string[] | null;
  all: boolean;
  outputPath: string | null;
  json: boolean;
  model: string | null;
  artifactsDir: string | null;
  help: boolean;
};

export class PipelineCliError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = "PipelineCliError";
    this.exitCode = exitCode;
  }
}

export function parsePipelineCliArgs(argv: string[]): PipelineCliOptions {
  const options: PipelineCliOptions = {
    mode: "mock",
    fixtureIds: null,
    all: true,
    outputPath: null,
    json: false,
    model: null,
    artifactsDir: null,
    help: false,
  };

  let sawFixture = false;

  for (const arg of argv) {
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--all") {
      options.all = true;
      options.fixtureIds = null;
      continue;
    }

    if (arg.startsWith("--mode=")) {
      const mode = arg.slice("--mode=".length);
      if (mode !== "mock" && mode !== "ollama" && mode !== "webgpu") {
        throw new PipelineCliError(`Unsupported mode: ${mode}`);
      }
      options.mode = mode;
      continue;
    }

    if (arg.startsWith("--fixture=")) {
      const id = arg.slice("--fixture=".length);
      if (!getPipelineEvalCase(id)) {
        throw new PipelineCliError(
          `Unknown fixture: ${id}. Known: ${PIPELINE_EVAL_CASE_IDS.join(", ")}`,
        );
      }
      if (!sawFixture) {
        options.fixtureIds = [];
        sawFixture = true;
        options.all = false;
      }
      options.fixtureIds!.push(id);
      continue;
    }

    if (arg.startsWith("--output=")) {
      options.outputPath = arg.slice("--output=".length);
      continue;
    }

    if (arg.startsWith("--model=")) {
      options.model = arg.slice("--model=".length);
      continue;
    }

    if (arg.startsWith("--artifacts=")) {
      options.artifactsDir = arg.slice("--artifacts=".length);
      continue;
    }

    throw new PipelineCliError(`Unknown argument: ${arg}`);
  }

  return options;
}

export function resolveCaseIds(options: PipelineCliOptions): string[] {
  if (options.fixtureIds && options.fixtureIds.length > 0) {
    return [...options.fixtureIds];
  }

  return [...PIPELINE_EVAL_CASE_IDS];
}

export function formatPipelineCliHelp(): string {
  return `Full-pipeline evaluation harness (#126)

Usage:
  npm run eval:pipeline -- --mode=mock
  npm run eval:pipeline -- --mode=ollama
  npm run eval:pipeline -- --mode=mock --fixture=product-prioritization
  npm run eval:pipeline -- --mode=mock --all --output=fixtures/evaluation/baselines/mock-pipeline-baseline.json

Options:
  --mode=mock|ollama|webgpu   Generation path (default: mock)
  --fixture=<id>              Run one case (repeatable). Default: all nine cases
  --all                       Run all nine cases (default)
  --output=<path>             Write run summary JSON
  --json                      Print machine-readable JSON to stdout
  --model=<ollama-model>      Override Ollama model for this run
  --artifacts=<dir>           Write per-case raw Capture Layer / brief / trace files
  -h, --help                  Show help

WebGPU: --mode=webgpu does not run browser automation. Use the import helpers
documented in docs/ai/pipeline-eval-harness.md after #124 recovers.

Manual scores remain null until a reviewer fills them.
`;
}

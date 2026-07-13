#!/usr/bin/env node
/**
 * WebGPU / WebLLM model delivery diagnostic (#124)
 *
 * Usage:
 *   npm run diagnose:webgpu-model
 *   npm run diagnose:webgpu-model -- --json
 *   npm run diagnose:webgpu-model -- --model Qwen2.5-1.5B-Instruct-q4f16_1-MLC --compare Llama-3.2-1B-Instruct-q4f16_1-MLC
 */

import {
  formatWebGpuModelDeliveryDiagnostic,
  runWebGpuModelDeliveryDiagnostic,
  serializeWebGpuModelDeliveryDiagnostic,
} from "../src/services/generation/webGpuModelDeliveryDiagnostic.ts";

function parseArgs(argv: string[]) {
  const options = {
    json: false,
    selectedModelId: undefined as string | undefined,
    comparisonModelId: undefined as string | undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--model") {
      options.selectedModelId = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--compare") {
      options.comparisonModelId = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(`WebGPU model delivery diagnostic

Options:
  --model <id>     Override selected model ID (defaults to app WebGPU config)
  --compare <id>   Comparison model ID (defaults to Llama-3.2-1B-Instruct-q4f16_1-MLC)
  --json           Print machine-readable JSON with redacted signed URLs
  -h, --help       Show help

This script is for local investigation only. It is not exposed in the public product UI.
`);
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runWebGpuModelDeliveryDiagnostic({
    selectedModelId: options.selectedModelId,
    comparisonModelId: options.comparisonModelId,
  });

  if (options.json) {
    console.log(JSON.stringify(serializeWebGpuModelDeliveryDiagnostic(result), null, 2));
  } else {
    console.log(formatWebGpuModelDeliveryDiagnostic(result));
  }

  const deliveryBlocked = result.probes.some((probe) => !probe.directFetchOk);
  process.exit(deliveryBlocked ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

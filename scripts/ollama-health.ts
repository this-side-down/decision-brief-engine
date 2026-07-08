#!/usr/bin/env node
/**
 * Ollama local inference health check (#61)
 *
 * Usage:
 *   npm run health:ollama
 *   npm run health:ollama -- --json
 *   npm run health:ollama -- --no-smoke
 */

import { runOllamaHealthCheck } from "../src/services/generation/ollamaHealthCheck.ts";

function parseArgs(argv: string[]) {
  const options = {
    json: false,
    smokeTest: true,
  };

  for (const arg of argv) {
    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--no-smoke") {
      options.smokeTest = false;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      console.log(`Ollama local inference health check

Options:
  --no-smoke   Skip the short generation smoke test
  --json       Print machine-readable JSON output
  -h, --help   Show help

Environment:
  Reads VITE_OLLAMA_BASE_URL, VITE_OLLAMA_MODEL, and VITE_OLLAMA_TIMEOUT_MS
  from the shell environment or .env.local when loaded by your shell tooling.

See docs/ai/ollama-local-setup.md for Mac and Windows setup paths.
`);
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function formatHumanResult(
  result: Awaited<ReturnType<typeof runOllamaHealthCheck>>,
): string {
  const lines = [
    "Ollama health check",
    "",
    "Configuration:",
    `  base URL: ${result.config.baseUrl}`,
    `  model:    ${result.config.model}`,
    `  timeout:  ${result.config.timeoutMs}ms`,
    "",
    "Checks:",
  ];

  for (const check of result.checks) {
    const label = check.status.toUpperCase().padEnd(4, " ");
    const detail = check.detail ? ` — ${check.detail}` : "";
    lines.push(`  [${label}] ${check.summary}${detail}`);
    if (check.status === "fail" && check.fix) {
      lines.push(`         Fix: ${check.fix}`);
    }
  }

  lines.push("");
  lines.push(`Result: ${result.ready ? "READY" : "NOT READY"}`);

  if (!result.ready && result.reason) {
    lines.push(`Next step: ${result.reason}`);
  }

  return lines.join("\n");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const result = await runOllamaHealthCheck({
    smokeTest: options.smokeTest,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatHumanResult(result));
  }

  process.exit(result.ready ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

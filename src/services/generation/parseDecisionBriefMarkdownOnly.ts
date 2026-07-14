import type { DecisionBriefResult } from "./types";
import { stripDecisionTraceJsonFences } from "./parseDecisionTrace";
import { emptyDecisionTrace } from "./parseDecisionBriefResultHelpers";

/**
 * Parses evaluation-only markdown-only WebGPU output: { "markdown": "..." }.
 */
export function parseDecisionBriefMarkdownOnlyJson(rawText: string): DecisionBriefResult {
  const stripped = stripDecisionTraceJsonFences(rawText.trim());

  let parsed: unknown;

  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error("Decision Brief markdown-only result was not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Decision Brief markdown-only result must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;

  if (typeof record.markdown !== "string" || !record.markdown.trim()) {
    throw new Error(
      'Decision Brief markdown-only result is missing a non-empty "markdown" field.',
    );
  }

  if ("decisionTrace" in record) {
    throw new Error(
      'Decision Brief markdown-only result must not include "decisionTrace".',
    );
  }

  return {
    markdown: record.markdown,
    decisionTrace: emptyDecisionTrace(),
  };
}

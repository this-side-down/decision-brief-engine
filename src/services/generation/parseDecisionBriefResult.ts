import type { DecisionTrace } from "../../types/decisionTrace";
import type { DecisionBriefResult } from "./types";
import {
  stripDecisionTraceJsonFences,
  validateDecisionTraceObject,
} from "./parseDecisionTrace";
import { emptyDecisionTrace } from "./parseDecisionBriefResultHelpers";

/**
 * Parses and validates the combined Decision Brief result envelope returned by real model adapters.
 *
 * Expected model output shape:
 * {
 *   "markdown": "# Decision Brief\n...",
 *   "decisionTrace": { "entries": [...], "created_at": "..." }
 * }
 *
 * - Throws if the outer JSON is invalid or if `markdown` is missing or empty.
 * - Falls back to an empty DecisionTrace if the `decisionTrace` field is present but
 *   fails validation, so brief generation always succeeds even when trace output is malformed.
 */
export function parseDecisionBriefResultJson(rawText: string): DecisionBriefResult {
  const stripped = stripDecisionTraceJsonFences(rawText.trim());

  let parsed: unknown;

  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error("Decision Brief result was not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Decision Brief result must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;

  if (typeof record.markdown !== "string" || !record.markdown.trim()) {
    throw new Error(
      'Decision Brief result is missing a non-empty "markdown" field.',
    );
  }

  const markdown = record.markdown;

  let decisionTrace: DecisionTrace;

  try {
    decisionTrace = validateDecisionTraceObject(record.decisionTrace);
  } catch {
    decisionTrace = emptyDecisionTrace();
  }

  return { markdown, decisionTrace };
}

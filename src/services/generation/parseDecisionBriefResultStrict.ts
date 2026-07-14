import type { DecisionTrace } from "../../types/decisionTrace";
import type { DecisionBriefResult } from "./types";
import { DecisionBriefContractError } from "./decisionBriefContractErrors";
import {
  stripDecisionTraceJsonFences,
  validateDecisionTraceObject,
} from "./parseDecisionTrace";

/**
 * Strict parser for Ollama combined Decision Brief generation.
 * Throws DecisionBriefContractError on any envelope or trace contract failure.
 */
export function parseDecisionBriefResultStrict(rawText: string): DecisionBriefResult {
  const stripped = stripDecisionTraceJsonFences(rawText.trim());

  let parsed: unknown;

  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new DecisionBriefContractError("Decision Brief result was not valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new DecisionBriefContractError("Decision Brief result must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;

  if (typeof record.markdown !== "string" || !record.markdown.trim()) {
    throw new DecisionBriefContractError(
      'Decision Brief result is missing a non-empty "markdown" field.',
    );
  }

  const markdown = record.markdown;

  let decisionTrace: DecisionTrace;

  try {
    decisionTrace = validateDecisionTraceObject(record.decisionTrace);
  } catch (error) {
    throw new DecisionBriefContractError(
      error instanceof Error ? error.message : "Decision Trace validation failed.",
    );
  }

  return { markdown, decisionTrace };
}

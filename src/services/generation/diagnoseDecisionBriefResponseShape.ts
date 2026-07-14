import { stripDecisionTraceJsonFences } from "./parseDecisionTrace";

export type DecisionBriefResponseShapeDiagnosis = {
  rawLength: number;
  topLevelKeys: string[];
  valueTypes: Record<string, string>;
  markdownPresent: boolean;
  markdownLength: number;
  markdownStartsWithBrief: boolean;
  decisionTracePresent: boolean;
  entriesCount: number | null;
  parseableJson: boolean;
};

/**
 * Test-only structural diagnosis for Ollama combined-envelope responses.
 * Never logs or persists raw model text.
 */
export function diagnoseDecisionBriefResponseShape(
  rawText: string,
): DecisionBriefResponseShapeDiagnosis {
  const stripped = stripDecisionTraceJsonFences(rawText.trim());
  let parsed: Record<string, unknown> | null = null;

  try {
    const value = JSON.parse(stripped);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      parsed = value as Record<string, unknown>;
    }
  } catch {
    parsed = null;
  }

  const topLevelKeys = parsed ? Object.keys(parsed) : [];
  const valueTypes = parsed
    ? Object.fromEntries(
        topLevelKeys.map((key) => [
          key,
          Array.isArray(parsed![key])
            ? "array"
            : typeof parsed![key],
        ]),
      )
    : { topLevel: "invalid-json" };

  const markdown =
    typeof parsed?.markdown === "string" ? parsed.markdown.trim() : "";
  const entries = parsed?.decisionTrace;
  const entriesCount =
    entries &&
    typeof entries === "object" &&
    !Array.isArray(entries) &&
    Array.isArray((entries as Record<string, unknown>).entries)
      ? ((entries as Record<string, unknown>).entries as unknown[]).length
      : null;

  return {
    rawLength: rawText.length,
    topLevelKeys,
    valueTypes,
    markdownPresent: markdown.length > 0,
    markdownLength: markdown.length,
    markdownStartsWithBrief: markdown.startsWith("# Decision Brief"),
    decisionTracePresent: parsed?.decisionTrace !== undefined,
    entriesCount,
    parseableJson: parsed !== null,
  };
}

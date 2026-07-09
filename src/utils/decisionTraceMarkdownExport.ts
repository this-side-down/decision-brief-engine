import type {
  DecisionTrace,
  DecisionTraceBasis,
  DecisionTraceEntry,
} from "../types/decisionTrace";
import { groupDecisionTraceEntriesByKind } from "./decisionTraceBasisGrouping";

const TRACE_SECTION_HEADING = "## Traceable Basis";

const TRACE_SECTION_INTRO =
  "_Structured rationale connecting the recommendation and next steps above to the Capture Layer. This is a synthesized, user-facing rationale artifact — not a transcript of model reasoning._";

const BASIS_LIST_FIELDS: Array<{
  key: Exclude<keyof DecisionTraceBasis, "intent">;
  label: string;
}> = [
  { key: "supporting_evidence", label: "Supporting evidence" },
  { key: "assumptions_relied_on", label: "Assumptions relied on" },
  { key: "risks_addressed", label: "Risks addressed" },
  { key: "risks_accepted", label: "Risks accepted" },
  { key: "constraints_respected", label: "Constraints respected" },
  { key: "alternatives_considered", label: "Alternatives considered" },
  { key: "tradeoffs", label: "Tradeoffs" },
  { key: "missing_context_caveats", label: "Missing context caveats" },
];

function formatMarkdownSubList(label: string, items: string[]): string[] {
  if (items.length === 0) {
    return [];
  }

  return [`   - ${label}:`, ...items.map((item) => `     - ${item}`)];
}

function formatEntryMarkdown(entry: DecisionTraceEntry, index: number): string {
  const lines: string[] = [`${index + 1}. **${entry.statement}**`];

  lines.push(`   - Confidence: ${entry.confidence}`);

  if (entry.basis.intent.trim()) {
    lines.push(`   - Intent served: ${entry.basis.intent}`);
  }

  for (const field of BASIS_LIST_FIELDS) {
    lines.push(...formatMarkdownSubList(field.label, entry.basis[field.key]));
  }

  lines.push(...formatMarkdownSubList("Would change if", entry.would_change_if));

  return lines.join("\n");
}

function formatEntryGroupSection(title: string, entries: DecisionTraceEntry[]): string {
  if (entries.length === 0) {
    return "";
  }

  const entryBlocks = entries
    .map((entry, index) => formatEntryMarkdown(entry, index))
    .join("\n\n");

  return [`### ${title}`, "", entryBlocks].join("\n");
}

/**
 * Formats a non-empty Decision Trace as a readable, structured Markdown
 * section — grouped by Recommendations and Next steps, one numbered entry
 * per trace entry with its confidence, intent, non-empty basis fields, and
 * would_change_if conditions as nested bullets.
 *
 * Callers should only invoke this with a Decision Trace that has at least
 * one entry; use `appendDecisionTraceToMarkdown` for the null/empty-safe
 * export path.
 */
export function formatDecisionTraceMarkdown(decisionTrace: DecisionTrace): string {
  const groups = groupDecisionTraceEntriesByKind(decisionTrace);

  if (!groups) {
    return "";
  }

  const sections = [
    formatEntryGroupSection("Recommendations", groups.recommendations),
    formatEntryGroupSection("Next steps", groups.nextSteps),
  ].filter((section) => section.length > 0);

  if (sections.length === 0) {
    return "";
  }

  return [TRACE_SECTION_HEADING, "", TRACE_SECTION_INTRO, "", sections.join("\n\n")].join(
    "\n",
  );
}

/**
 * Appends a "Traceable Basis" Markdown section to an exported Decision Brief.
 *
 * Used by both the copy-to-clipboard and download export paths so exported
 * Markdown stays self-contained and auditable without a separate model
 * round trip or raw JSON dump.
 *
 * - Returns `markdown` unchanged when `decisionTrace` is `null`.
 * - Returns `markdown` unchanged when `decisionTrace.entries` is empty (no
 *   trace was generated for this brief, so nothing new is added).
 * - Otherwise appends a structured, human-readable section after the
 *   existing Decision Brief content.
 */
export function appendDecisionTraceToMarkdown(
  markdown: string,
  decisionTrace: DecisionTrace | null,
): string {
  if (!decisionTrace || decisionTrace.entries.length === 0) {
    return markdown;
  }

  const traceSection = formatDecisionTraceMarkdown(decisionTrace);

  if (!traceSection) {
    return markdown;
  }

  return `${markdown.trimEnd()}\n\n${traceSection}\n`;
}

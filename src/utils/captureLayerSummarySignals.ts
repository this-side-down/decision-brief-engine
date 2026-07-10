import type { BriefType } from "../types/brief";
import type { CaptureLayer } from "../types/captureLayer";

function formatCountClause(count: number, singularLabel: string, pluralLabel: string): string {
  return `${count} ${count === 1 ? singularLabel : pluralLabel}`;
}

/**
 * Builds the compact, count-only summary line shown on the collapsed
 * Capture Layer disclosure once a Decision Brief exists (e.g.
 * "Strategy Decision Brief · 2 goals · 3 constraints · 4 risks · Medium
 * confidence"). Intentionally surfaces counts and confidence only — never
 * full field text — since the point of collapsing is to make Capture
 * Layer secondary to the Decision Brief, not to repeat its content in a
 * different shape.
 *
 * The schema field is `goals`, not `intents`; this summary uses "goals" to
 * match the schema rather than introducing new product language.
 */
export function formatCaptureLayerSummarySignals(
  briefType: BriefType | null,
  captureLayer: CaptureLayer,
): string {
  const clauses: string[] = [];

  if (briefType) {
    clauses.push(briefType.name);
  }

  clauses.push(formatCountClause(captureLayer.goals.length, "goal", "goals"));
  clauses.push(formatCountClause(captureLayer.constraints.length, "constraint", "constraints"));
  clauses.push(formatCountClause(captureLayer.risks.length, "risk", "risks"));
  clauses.push(`${captureLayer.confidence} confidence`);

  return clauses.join(" · ");
}

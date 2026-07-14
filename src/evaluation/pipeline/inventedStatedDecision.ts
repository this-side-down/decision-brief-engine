import type { CaptureLayer } from "../../types/captureLayer";

/**
 * Detects an invented stated decision for fixtures that require absence
 * (for example the ambiguous stakeholder conversation).
 *
 * This is an evaluation-only gate that uses fixture expectations; it does not
 * change Capture Layer product validation.
 */
export function evaluateInventedStatedDecision(options: {
  captureLayer: CaptureLayer;
  expectEmptyStatedDecision: boolean;
}): { pass: boolean; finding: string | null } {
  const stated = options.captureLayer.stated_decision.trim();

  if (!options.expectEmptyStatedDecision) {
    return { pass: true, finding: null };
  }

  if (!stated) {
    return { pass: true, finding: null };
  }

  return {
    pass: false,
    finding: `Invented stated_decision treated as fact: "${stated}"`,
  };
}

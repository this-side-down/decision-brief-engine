/**
 * Deterministic usable-brief rule for the full-pipeline harness.
 * This does not replace human usable-brief judgment.
 */
export function decideDeterministicUsableBrief(options: {
  captureLayerFinalParsePass: boolean;
  captureLayerSchemaPass: boolean;
  captureLayerStructuralReadinessPass: boolean;
  inventedStatedDecision: boolean;
  decisionTraceSchemaPass: boolean | null;
  decisionTraceStructuralReadinessPass: boolean | null;
  recommendationAlignmentPass: boolean | null;
  nextStepAlignmentPass: boolean | null;
  requiredDecisionBriefSectionsPass: boolean | null;
  writingHardFailureCount: number;
  decisionBriefAttempted: boolean;
  decisionBriefGenerationSuccess: boolean;
}): boolean {
  if (!options.captureLayerFinalParsePass || !options.captureLayerSchemaPass) {
    return false;
  }

  if (!options.captureLayerStructuralReadinessPass) {
    return false;
  }

  if (options.inventedStatedDecision) {
    return false;
  }

  if (!options.decisionBriefAttempted || !options.decisionBriefGenerationSuccess) {
    return false;
  }

  if (options.decisionTraceSchemaPass !== true) {
    return false;
  }

  if (options.decisionTraceStructuralReadinessPass !== true) {
    return false;
  }

  if (options.recommendationAlignmentPass !== true) {
    return false;
  }

  if (options.nextStepAlignmentPass !== true) {
    return false;
  }

  if (options.requiredDecisionBriefSectionsPass !== true) {
    return false;
  }

  if (options.writingHardFailureCount > 0) {
    return false;
  }

  return true;
}

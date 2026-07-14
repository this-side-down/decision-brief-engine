import {
  createBasePipelineResult,
  createEmptyManualScores,
} from "./resultSchema";
import type {
  PipelineEvalResult,
  WebGpuRuntimeProfile,
} from "./resultTypes";
import { decideDeterministicUsableBrief } from "./deterministicUsableBrief";
import type { StructuredCompletionDiagnostics } from "../../services/generation/browserGenerationDiagnostics";
import type { SemanticAcceptanceDetailedFindings } from "../../services/generation/decisionBriefSemanticAcceptance";

/**
 * Construct a stable WebGPU evaluation result for later manual import.
 * Does not invent browser output — callers supply measured fields.
 */
export function buildWebGpuPipelineResult(input: {
  runId: string;
  timestamp?: string;
  buildCommit?: string | null;
  fixtureId: string;
  fixtureName: string;
  fixtureCategory: PipelineEvalResult["fixtureCategory"];
  modelId: string;
  webLlmVersion?: string | null;
  promptVariant?: string | null;
  captureLayerFirstAttemptParsePass: boolean;
  captureLayerFinalParsePass: boolean;
  captureLayerSchemaPass: boolean;
  captureLayerStructuralReadinessPass: boolean;
  captureLayerReadinessFindings?: PipelineEvalResult["captureLayerReadinessFindings"];
  inventedStatedDecisionFinding?: string | null;
  captureLayerRetryCount: number;
  captureLayerLatencyMs?: number | null;
  decisionBriefAttempted: boolean;
  decisionBriefGenerationSuccess: boolean;
  decisionBriefLatencyMs?: number | null;
  decisionTraceSchemaPass?: boolean | null;
  decisionTraceStructuralReadinessPass?: boolean | null;
  decisionTraceFindings?: PipelineEvalResult["decisionTraceFindings"];
  recommendationAlignmentPass?: boolean | null;
  nextStepAlignmentPass?: boolean | null;
  requiredDecisionBriefSectionsPass?: boolean | null;
  writingHardFailures?: string[];
  writingWarnings?: string[];
  writingReportOnlyFindings?: string[];
  evaluatorNotes?: string[];
  supportLimitations?: string[];
  rawErrorCategory?: PipelineEvalResult["rawErrorCategory"];
  webGpu?: Partial<WebGpuRuntimeProfile> | null;
  completionDiagnostics?: StructuredCompletionDiagnostics[];
  briefSemanticFindings?: SemanticAcceptanceDetailedFindings | null;
}): PipelineEvalResult {
  const invented = Boolean(input.inventedStatedDecisionFinding);
  const writingHardFailures = input.writingHardFailures ?? [];
  const deterministicUsableBrief = decideDeterministicUsableBrief({
    captureLayerFinalParsePass: input.captureLayerFinalParsePass,
    captureLayerSchemaPass: input.captureLayerSchemaPass,
    captureLayerStructuralReadinessPass:
      input.captureLayerStructuralReadinessPass,
    inventedStatedDecision: invented,
    decisionTraceSchemaPass: input.decisionTraceSchemaPass ?? null,
    decisionTraceStructuralReadinessPass:
      input.decisionTraceStructuralReadinessPass ?? null,
    recommendationAlignmentPass: input.recommendationAlignmentPass ?? null,
    nextStepAlignmentPass: input.nextStepAlignmentPass ?? null,
    requiredDecisionBriefSectionsPass:
      input.requiredDecisionBriefSectionsPass ?? null,
    writingHardFailureCount: writingHardFailures.length,
    decisionBriefAttempted: input.decisionBriefAttempted,
    decisionBriefGenerationSuccess: input.decisionBriefGenerationSuccess,
  });

  const webGpu: WebGpuRuntimeProfile = {
    webLlmVersion: input.webGpu?.webLlmVersion ?? input.webLlmVersion ?? null,
    browser: input.webGpu?.browser ?? null,
    deviceProfile: input.webGpu?.deviceProfile ?? null,
    coldLoadMs: input.webGpu?.coldLoadMs ?? null,
    warmLoadMs: input.webGpu?.warmLoadMs ?? null,
    deliveryBlocker: input.webGpu?.deliveryBlocker ?? null,
    unsupportedDevice: input.webGpu?.unsupportedDevice ?? null,
    completionDiagnostics:
      input.completionDiagnostics ?? input.webGpu?.completionDiagnostics ?? [],
    briefSemanticFindings:
      input.briefSemanticFindings ?? input.webGpu?.briefSemanticFindings ?? null,
  };

  return createBasePipelineResult({
    runId: input.runId,
    timestamp: input.timestamp ?? new Date().toISOString(),
    buildCommit: input.buildCommit ?? null,
    fixtureId: input.fixtureId,
    fixtureName: input.fixtureName,
    fixtureCategory: input.fixtureCategory,
    generationMode: "webgpu",
    modelId: input.modelId,
    runtimeLibraryVersion: webGpu.webLlmVersion,
    promptVariant: input.promptVariant ?? null,
    captureLayerFirstAttemptParsePass: input.captureLayerFirstAttemptParsePass,
    captureLayerFinalParsePass: input.captureLayerFinalParsePass,
    captureLayerSchemaPass: input.captureLayerSchemaPass,
    captureLayerStructuralReadinessPass:
      input.captureLayerStructuralReadinessPass,
    captureLayerReadinessFindings: input.captureLayerReadinessFindings ?? [],
    inventedStatedDecisionFinding: input.inventedStatedDecisionFinding ?? null,
    captureLayerRetryCount: input.captureLayerRetryCount,
    captureLayerLatencyMs: input.captureLayerLatencyMs ?? null,
    decisionBriefAttempted: input.decisionBriefAttempted,
    decisionBriefGenerationSuccess: input.decisionBriefGenerationSuccess,
    decisionBriefLatencyMs: input.decisionBriefLatencyMs ?? null,
    decisionTraceSchemaPass: input.decisionTraceSchemaPass ?? null,
    decisionTraceStructuralReadinessPass:
      input.decisionTraceStructuralReadinessPass ?? null,
    decisionTraceFindings: input.decisionTraceFindings ?? [],
    recommendationAlignmentPass: input.recommendationAlignmentPass ?? null,
    nextStepAlignmentPass: input.nextStepAlignmentPass ?? null,
    requiredDecisionBriefSectionsPass:
      input.requiredDecisionBriefSectionsPass ?? null,
    writingHardFailures,
    writingWarnings: input.writingWarnings ?? [],
    writingReportOnlyFindings: input.writingReportOnlyFindings ?? [],
    deterministicUsableBrief,
    manualScores: createEmptyManualScores(),
    evaluatorNotes: input.evaluatorNotes ?? [],
    supportLimitations: [
      "WebGPU results are recorded manually; this harness does not automate browser inference.",
      ...(input.supportLimitations ?? []),
    ],
    rawErrorCategory: input.rawErrorCategory ?? "none",
    failureKind: deterministicUsableBrief ? "none" : "product_quality",
    artifactPaths: null,
    webGpu,
    longInputDiagnostics: null,
  });
}

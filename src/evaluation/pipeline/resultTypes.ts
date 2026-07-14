import type { StructuralCheck } from "../types";
import type {
  CAPTURE_LAYER_SCHEMA_VERSION,
  DECISION_TRACE_SCHEMA_VERSION,
  PIPELINE_RESULT_FORMAT_VERSION,
} from "./constants";
import type { StructuredCompletionDiagnostics } from "../../services/generation/browserGenerationDiagnostics";
import type { DecisionArtifactDiagnostics } from "../../services/generation/decisionArtifactDiagnostics";
import type { SemanticAcceptanceDetailedFindings } from "../../services/generation/decisionBriefSemanticAcceptance";

export type PipelineGenerationMode = "mock" | "ollama" | "webgpu";

export type PipelineCaseCategory = "evaluation-fixture" | "gallery-example";

export type PipelineErrorCategory =
  | "none"
  | "cli_usage"
  | "case_load"
  | "infrastructure"
  | "capture_generation"
  | "capture_parse"
  | "capture_schema"
  | "brief_generation"
  | "trace_parse"
  | "trace_schema"
  | "unknown";

/**
 * Failure classification for harness exit-code and summary reporting.
 * Product-quality failures are recorded in the result; they are not
 * infrastructure failures.
 */
export type PipelineFailureKind =
  | "none"
  | "product_quality"
  | "infrastructure"
  | "harness_execution";

export type ManualScoreFields = {
  decisionUsefulness: number | null;
  groundingAndTraceability: number | null;
  clarity: number | null;
  actionability: number | null;
  totalScore: number | null;
  reviewerNotes: string | null;
  humanUsableBrief: boolean | null;
};

export type WebGpuRuntimeProfile = {
  webLlmVersion: string | null;
  browser: string | null;
  deviceProfile: string | null;
  coldLoadMs: number | null;
  warmLoadMs: number | null;
  deliveryBlocker: string | null;
  unsupportedDevice: boolean | null;
  completionDiagnostics?: StructuredCompletionDiagnostics[];
  briefSemanticFindings?: SemanticAcceptanceDetailedFindings | null;
};

export type LongInputCaptureDiagnostics = {
  strategy: "single_pass" | "hierarchical";
  chunkCount: number | null;
  sourceCoverageComplete: boolean | null;
  totalSourceLength: number | null;
  coveredSourceLength: number | null;
  chunkRetryCounts: Record<string, number> | null;
  totalChunkRetries: number | null;
  planningLatencyMs: number | null;
  chunkExtractionLatencyMs: number | null;
  mergeLatencyMs: number | null;
  validationLatencyMs: number | null;
};

export type { DecisionArtifactDiagnostics } from "../../services/generation/decisionArtifactDiagnostics";

export type PipelineEvalResult = {
  resultFormatVersion: typeof PIPELINE_RESULT_FORMAT_VERSION;
  runId: string;
  timestamp: string;
  buildCommit: string | null;
  fixtureId: string;
  fixtureName: string;
  fixtureCategory: PipelineCaseCategory;
  generationMode: PipelineGenerationMode;
  modelId: string | null;
  runtimeLibraryVersion: string | null;
  captureLayerSchemaVersion: typeof CAPTURE_LAYER_SCHEMA_VERSION;
  decisionTraceSchemaVersion: typeof DECISION_TRACE_SCHEMA_VERSION;
  promptVariant: string | null;
  captureLayerFirstAttemptParsePass: boolean | null;
  captureLayerFinalParsePass: boolean;
  captureLayerSchemaPass: boolean;
  captureLayerStructuralReadinessPass: boolean;
  captureLayerReadinessFindings: StructuralCheck[];
  inventedStatedDecisionFinding: string | null;
  captureLayerRetryCount: number;
  captureLayerLatencyMs: number | null;
  decisionBriefAttempted: boolean;
  decisionBriefGenerationSuccess: boolean;
  decisionBriefLatencyMs: number | null;
  decisionTraceSchemaPass: boolean | null;
  decisionTraceStructuralReadinessPass: boolean | null;
  decisionTraceFindings: StructuralCheck[];
  recommendationAlignmentPass: boolean | null;
  nextStepAlignmentPass: boolean | null;
  requiredDecisionBriefSectionsPass: boolean | null;
  writingHardFailures: string[];
  writingWarnings: string[];
  writingReportOnlyFindings: string[];
  deterministicUsableBrief: boolean;
  manualScores: ManualScoreFields;
  evaluatorNotes: string[];
  supportLimitations: string[];
  rawErrorCategory: PipelineErrorCategory;
  failureKind: PipelineFailureKind;
  artifactPaths: {
    captureLayer?: string;
    decisionBrief?: string;
    decisionTrace?: string;
  } | null;
  webGpu: WebGpuRuntimeProfile | null;
  longInputDiagnostics: LongInputCaptureDiagnostics | null;
  decisionArtifactDiagnostics: DecisionArtifactDiagnostics | null;
};

export type PipelineRunSummary = {
  resultFormatVersion: typeof PIPELINE_RESULT_FORMAT_VERSION;
  runId: string;
  timestamp: string;
  buildCommit: string | null;
  generationMode: PipelineGenerationMode;
  modelId: string | null;
  caseIds: string[];
  results: PipelineEvalResult[];
  infrastructureFailure: boolean;
  harnessExecutionError: string | null;
};

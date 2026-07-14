import type { StructuralCheck } from "../types";
import type {
  CAPTURE_LAYER_SCHEMA_VERSION,
  DECISION_TRACE_SCHEMA_VERSION,
  PIPELINE_RESULT_FORMAT_VERSION,
} from "./constants";

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
};

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

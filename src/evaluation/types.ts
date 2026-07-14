import type { CaptureLayer } from "../types/captureLayer";
import type {
  StructuralExpectation,
  StructuralCheck,
  StructuralReadinessResult,
} from "../services/generation/captureLayerStructuralReadiness";

export type { StructuralExpectation, StructuralCheck, StructuralReadinessResult };

export type CaptureLayerEvalMode = "mock" | "ollama" | "webgpu";

export type CaptureLayerEvalCase = {
  id: string;
  name: string;
  /** Path relative to repo root */
  rawInputPath: string;
  briefTypeId: "product" | "strategy" | "execution";
  sourceLabel: string;
  fixtureDocPath: string;
  structuredReferencePath?: string;
  structuralExpectations: StructuralExpectation;
};

export type SchemaCheckResult = {
  validJson: boolean;
  schemaPass: boolean;
  error: string | null;
};

export type CaptureLayerEvalResult = {
  harnessVersion: 1;
  caseId: string;
  caseName: string;
  mode: CaptureLayerEvalMode;
  model: string;
  timestamp: string;
  latencyMs: number | null;
  schema: SchemaCheckResult;
  structuralReadiness: StructuralReadinessResult;
  /** Automated gate: schema must pass, then structural readiness. */
  proceedToBrief: boolean;
  captureLayer: CaptureLayer | null;
  humanScorecard: {
    status: "pending" | "recorded";
    totalOutOf16: number | null;
    notes: string;
  };
  passFail: {
    schemaGate: "pass" | "fail";
    structuralGate: "pass" | "fail" | "skipped";
    overallAutomated: "pass" | "fail";
  };
  notes: string[];
};

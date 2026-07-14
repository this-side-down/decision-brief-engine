import type {
  CaptureLayerEvalMode,
  CaptureLayerEvalResult,
  SchemaCheckResult,
  StructuralReadinessResult,
} from "./types";
import type { StructuralCheck } from "../services/generation/captureLayerStructuralReadiness";
import { decideProceedToBrief } from "./captureLayerChecks";
import type { CaptureLayer } from "../types/captureLayer";

export type BuildEvalResultInput = {
  caseId: string;
  caseName: string;
  mode: CaptureLayerEvalMode;
  model: string;
  latencyMs: number | null;
  schema: SchemaCheckResult;
  structuralReadiness: StructuralReadinessResult | null;
  captureLayer: CaptureLayer | null;
  notes?: string[];
};

export function buildCaptureLayerEvalResult(
  input: BuildEvalResultInput,
): CaptureLayerEvalResult {
  const structural = input.structuralReadiness ?? {
    pass: false,
    checks: [],
  };
  const schemaGate = input.schema.schemaPass ? "pass" : "fail";
  const structuralGate = !input.schema.schemaPass
    ? "skipped"
    : structural.pass
      ? "pass"
      : "fail";
  const proceedToBrief = decideProceedToBrief({
    schemaPass: input.schema.schemaPass,
    structuralPass: structural.pass,
  });

  return {
    harnessVersion: 1,
    caseId: input.caseId,
    caseName: input.caseName,
    mode: input.mode,
    model: input.model,
    timestamp: new Date().toISOString(),
    latencyMs: input.latencyMs,
    schema: input.schema,
    structuralReadiness: structural,
    proceedToBrief,
    captureLayer: input.captureLayer,
    humanScorecard: {
      status: "pending",
      totalOutOf16: null,
      notes:
        "Record with fixtures/evaluation/manual-scorecard.md after reviewing output.",
    },
    passFail: {
      schemaGate,
      structuralGate,
      overallAutomated: proceedToBrief ? "pass" : "fail",
    },
    notes: input.notes ?? [],
  };
}

export function formatEvalResultMarkdown(result: CaptureLayerEvalResult): string {
  const structuralLines = result.structuralReadiness.checks
    .map(
      (check: StructuralCheck) =>
        `- ${check.pass ? "PASS" : "FAIL"} \`${check.id}\`: ${check.detail}`,
    )
    .join("\n");

  return [
    `## Capture Layer eval — ${result.caseName}`,
    "",
    `- **Case ID:** ${result.caseId}`,
    `- **Mode:** ${result.mode}`,
    `- **Model:** ${result.model}`,
    `- **Timestamp:** ${result.timestamp}`,
    `- **Latency (ms):** ${result.latencyMs ?? "n/a"}`,
    `- **Valid JSON:** ${result.schema.validJson ? "yes" : "no"}`,
    `- **Schema pass:** ${result.schema.schemaPass ? "yes" : "no"}`,
    `- **Structural readiness:** ${result.structuralReadiness.pass ? "pass" : "fail"}`,
    `- **Proceed to Decision Brief (automated):** ${result.proceedToBrief ? "yes" : "no"}`,
    `- **Overall automated gate:** ${result.passFail.overallAutomated}`,
    result.schema.error ? `- **Schema error:** ${result.schema.error}` : null,
    "",
    "### Structural checks",
    "",
    structuralLines || "- (none — schema failed first)",
    "",
    "### Human scorecard",
    "",
    `- Status: ${result.humanScorecard.status}`,
    `- Total (/16): ${result.humanScorecard.totalOutOf16 ?? "TBD"}`,
    `- Notes: ${result.humanScorecard.notes}`,
    "",
    "### Results table row (paste into browser-model-results.md)",
    "",
    "| Fixture | Score total (/16) | Valid JSON | Schema pass | Usable brief | Notes |",
    "| --- | ---: | --- | --- | --- | --- |",
    `| ${result.caseName} | TBD | ${result.schema.validJson ? "Yes" : "No"} | ${result.schema.schemaPass ? "Yes" : "No"} | ${result.proceedToBrief ? "Candidate — score manually" : "Not reached / not ready"} | automated ${result.passFail.overallAutomated}; latency ${result.latencyMs ?? "n/a"}ms |`,
    "",
    "### Notes",
    "",
    ...(result.notes.length > 0
      ? result.notes.map((note) => `- ${note}`)
      : ["- (none)"]),
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

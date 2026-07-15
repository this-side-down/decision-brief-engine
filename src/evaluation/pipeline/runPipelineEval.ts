import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  EXECUTION_DECISION_BRIEF,
  PRODUCT_DECISION_BRIEF,
  STRATEGY_DECISION_BRIEF,
} from "../../data/briefTypes";
import { generateCaptureLayerForSession } from "../../services/generation/generateCaptureLayer";
import { mockModelAdapter } from "../../services/generation/mockModelAdapter";
import { ollamaModelAdapter } from "../../services/generation/ollamaModelAdapter";
import type {
  DecisionArtifactDiagnostics,
  DecisionArtifactDiagnosticsHolder,
} from "../../services/generation/decisionArtifactDiagnostics";
import { getOllamaConfig } from "../../services/generation/ollamaConfig";
import { validateDecisionTraceObject } from "../../services/generation/parseDecisionTrace";
import {
  CAPTURE_LAYER_FIELDS,
  DECISION_BRIEF_MARKDOWN_STRUCTURE,
  type ModelAdapter,
} from "../../services/generation/types";
import type { BriefType } from "../../types/brief";
import type { CaptureLayer } from "../../types/captureLayer";
import type { DecisionTrace } from "../../types/decisionTrace";
import {
  evaluateStructuralReadiness,
  validateCaptureLayerObject,
} from "../captureLayerChecks";
import {
  evaluateDecisionBriefWriting,
  getDefaultRequiredSections,
  parseDecisionBriefSections,
} from "../decisionBriefWritingChecks";
import { evaluateDecisionTraceReadiness } from "../decisionTraceChecks";
import { evaluateArtifactAlignment } from "./alignmentChecks";
import {
  getPipelineEvalCase,
  type PipelineEvalCase,
} from "./cases";
import {
  PIPELINE_RESULT_FORMAT_VERSION,
} from "./constants";
import { decideDeterministicUsableBrief } from "./deterministicUsableBrief";
import { evaluateInventedStatedDecision } from "./inventedStatedDecision";
import { loadPipelineCaseInput } from "./loadCaseInput";
import {
  createBasePipelineResult,
  createEmptyManualScores,
  createSinglePassLongInputDiagnostics,
} from "./resultSchema";
import type {
  LongInputCaptureDiagnostics as SessionLongInputDiagnostics,
} from "../../services/generation/longInput/types";
import type {
  PipelineEvalResult,
  PipelineFailureKind,
  PipelineGenerationMode,
  PipelineRunSummary,
  LongInputCaptureDiagnostics,
} from "./resultTypes";

/**
 * Derives the recorded prompt/strategy label from request-scoped Ollama
 * diagnostics instead of hardcoding a single architecture assumption for
 * every Ollama run. "structured_response_combined" only applies to the
 * historical combined strategy; PR #157's split-stage Ollama generation
 * (Markdown-only Stage A plus deterministic Stage B) is labeled
 * "markdown_only_split_stage". Returns null when the mode is not "ollama",
 * or when Ollama diagnostics were never recorded (for example, Decision
 * Brief generation was never attempted because Capture Layer generation
 * itself failed).
 */
export function resolvePromptVariant(
  mode: PipelineGenerationMode,
  diagnostics: DecisionArtifactDiagnostics | null,
): string | null {
  if (mode !== "ollama") {
    return null;
  }

  if (diagnostics?.strategy === "split_stage") {
    return "markdown_only_split_stage";
  }

  if (diagnostics?.strategy === "combined") {
    return "structured_response_combined";
  }

  return null;
}

function resolveBriefType(
  briefTypeId: PipelineEvalCase["briefTypeId"],
): BriefType {
  switch (briefTypeId) {
    case "product":
      return PRODUCT_DECISION_BRIEF;
    case "strategy":
      return STRATEGY_DECISION_BRIEF;
    case "execution":
      return EXECUTION_DECISION_BRIEF;
  }
}

function resolveBuildCommit(): string | null {
  try {
    return execSync("git rev-parse HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function createRunId(): string {
  return `pipeline-${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function requiredSectionsPass(markdown: string): boolean {
  const sections = parseDecisionBriefSections(markdown);
  return getDefaultRequiredSections().every((name) => {
    const body = sections.get(name);
    return typeof body === "string" && body.trim().length > 0;
  });
}

function classifyFailureKind(result: {
  deterministicUsableBrief: boolean;
  rawErrorCategory: PipelineEvalResult["rawErrorCategory"];
}): PipelineFailureKind {
  if (
    result.rawErrorCategory === "infrastructure" ||
    result.rawErrorCategory === "case_load"
  ) {
    return "infrastructure";
  }

  if (result.rawErrorCategory === "cli_usage") {
    return "harness_execution";
  }

  if (result.deterministicUsableBrief) {
    return "none";
  }

  return "product_quality";
}

function toPipelineLongInputDiagnostics(
  diagnostics: SessionLongInputDiagnostics | null,
  captureSucceeded: boolean,
): LongInputCaptureDiagnostics | null {
  if (diagnostics) {
    return diagnostics;
  }

  if (captureSucceeded) {
    return createSinglePassLongInputDiagnostics();
  }

  return null;
}

async function resolveAdapter(options: {
  mode: Exclude<PipelineGenerationMode, "webgpu">;
  modelOverride: string | null;
}): Promise<{ adapter: ModelAdapter; modelId: string; runtimeLibraryVersion: string | null }> {
  if (options.mode === "mock") {
    return {
      adapter: mockModelAdapter,
      modelId: "mockModelAdapter",
      runtimeLibraryVersion: null,
    };
  }

  const config = getOllamaConfig();
  const model = options.modelOverride ?? config.model;
  if (options.modelOverride) {
    process.env.VITE_OLLAMA_MODEL = options.modelOverride;
  }

  return {
    adapter: ollamaModelAdapter,
    modelId: `ollama:${model}`,
    runtimeLibraryVersion: null,
  };
}

function writeArtifacts(options: {
  artifactsDir: string;
  fixtureId: string;
  captureLayer: CaptureLayer | null;
  briefMarkdown: string | null;
  decisionTrace: DecisionTrace | null;
}): PipelineEvalResult["artifactPaths"] {
  mkdirSync(options.artifactsDir, { recursive: true });
  const paths: NonNullable<PipelineEvalResult["artifactPaths"]> = {};

  if (options.captureLayer) {
    const path = resolve(
      options.artifactsDir,
      `${options.fixtureId}.capture-layer.json`,
    );
    writeFileSync(path, `${JSON.stringify(options.captureLayer, null, 2)}\n`);
    paths.captureLayer = path;
  }

  if (options.briefMarkdown) {
    const path = resolve(
      options.artifactsDir,
      `${options.fixtureId}.decision-brief.md`,
    );
    writeFileSync(path, `${options.briefMarkdown}\n`);
    paths.decisionBrief = path;
  }

  if (options.decisionTrace) {
    const path = resolve(
      options.artifactsDir,
      `${options.fixtureId}.decision-trace.json`,
    );
    writeFileSync(path, `${JSON.stringify(options.decisionTrace, null, 2)}\n`);
    paths.decisionTrace = path;
  }

  return Object.keys(paths).length > 0 ? paths : null;
}

export async function runSinglePipelineEval(options: {
  mode: Exclude<PipelineGenerationMode, "webgpu">;
  caseId: string;
  repoRoot: string;
  runId: string;
  buildCommit: string | null;
  modelOverride?: string | null;
  artifactsDir?: string | null;
}): Promise<PipelineEvalResult> {
  const evalCase = getPipelineEvalCase(options.caseId);
  if (!evalCase) {
    throw new Error(`Unknown pipeline case: ${options.caseId}`);
  }

  const notes: string[] = [];
  const supportLimitations: string[] = [
    "Manual score fields stay null until a human reviewer records them.",
    "Deterministic usable-brief is separate from human usable-brief judgment.",
  ];

  let loaded;
  try {
    loaded = loadPipelineCaseInput(evalCase, options.repoRoot);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return createBasePipelineResult({
      runId: options.runId,
      timestamp: new Date().toISOString(),
      buildCommit: options.buildCommit,
      fixtureId: evalCase.id,
      fixtureName: evalCase.name,
      fixtureCategory: evalCase.category,
      generationMode: options.mode,
      modelId: null,
      runtimeLibraryVersion: null,
      promptVariant: null,
      captureLayerFirstAttemptParsePass: null,
      captureLayerFinalParsePass: false,
      captureLayerSchemaPass: false,
      captureLayerStructuralReadinessPass: false,
      captureLayerReadinessFindings: [],
      inventedStatedDecisionFinding: null,
      captureLayerRetryCount: 0,
      captureLayerLatencyMs: null,
      decisionBriefAttempted: false,
      decisionBriefGenerationSuccess: false,
      decisionBriefLatencyMs: null,
      decisionTraceSchemaPass: null,
      decisionTraceStructuralReadinessPass: null,
      decisionTraceFindings: [],
      recommendationAlignmentPass: null,
      nextStepAlignmentPass: null,
      requiredDecisionBriefSectionsPass: null,
      writingHardFailures: [],
      writingWarnings: [],
      writingReportOnlyFindings: [],
      deterministicUsableBrief: false,
      manualScores: createEmptyManualScores(),
      evaluatorNotes: [`Failed to load case input: ${message}`],
      supportLimitations,
      rawErrorCategory: "case_load",
      failureKind: "infrastructure",
      artifactPaths: null,
      webGpu: null,
      longInputDiagnostics: null,
      decisionArtifactDiagnostics: null,
    });
  }

  const { adapter, modelId, runtimeLibraryVersion } = await resolveAdapter({
    mode: options.mode,
    modelOverride: options.modelOverride ?? null,
  });

  const briefType = resolveBriefType(loaded.briefTypeId);
  let captureLayer: CaptureLayer | null = null;
  let captureLatencyMs: number | null = null;
  let captureError: string | null = null;
  let rawErrorCategory: PipelineEvalResult["rawErrorCategory"] = "none";

  const captureStarted = Date.now();
  const longInputDiagnosticsHolder: {
    value: SessionLongInputDiagnostics | null;
  } = { value: null };
  try {
    captureLayer = await generateCaptureLayerForSession({
      rawInputText: loaded.rawInputText,
      briefType,
      sourceLabel: loaded.sourceLabel,
      adapter,
      mode: options.mode,
      longInputDiagnostics: longInputDiagnosticsHolder,
    });
    captureLatencyMs = Date.now() - captureStarted;
  } catch (error) {
    captureLatencyMs = Date.now() - captureStarted;
    captureError = error instanceof Error ? error.message : String(error);
    rawErrorCategory =
      options.mode === "ollama" &&
      /fetch failed|ECONNREFUSED|timed out|404|not found|Ollama/i.test(
        captureError,
      )
        ? "infrastructure"
        : "capture_generation";
    notes.push(`Capture Layer generation failed: ${captureError}`);
  }

  const schema = captureLayer
    ? validateCaptureLayerObject(captureLayer)
    : {
        validJson: false,
        schemaPass: false,
        error: captureError ?? "Capture Layer was not generated.",
        captureLayer: null,
      };

  if (captureLayer && !schema.schemaPass) {
    rawErrorCategory = schema.validJson ? "capture_schema" : "capture_parse";
  }

  const validatedCapture = schema.captureLayer;
  const structural = validatedCapture
    ? evaluateStructuralReadiness(
        validatedCapture,
        evalCase.structuralExpectations,
      )
    : { pass: false, checks: [] };

  const invented = validatedCapture
    ? evaluateInventedStatedDecision({
        captureLayer: validatedCapture,
        expectEmptyStatedDecision: evalCase.expectEmptyStatedDecision,
      })
    : { pass: true, finding: null };

  // Product pipeline permits brief generation once a Capture Layer object exists.
  const decisionBriefAttempted = validatedCapture !== null;
  let briefMarkdown: string | null = null;
  let decisionTrace: DecisionTrace | null = null;
  let briefLatencyMs: number | null = null;
  let briefGenerationSuccess = false;
  let decisionTraceSchemaPass: boolean | null = null;
  let decisionTraceStructuralPass: boolean | null = null;
  let decisionTraceFindings: PipelineEvalResult["decisionTraceFindings"] = [];
  let recommendationAlignmentPass: boolean | null = null;
  let nextStepAlignmentPass: boolean | null = null;
  let requiredSectionsOk: boolean | null = null;
  let writingHardFailures: string[] = [];
  let writingWarnings: string[] = [];
  let writingReports: string[] = [];
  const decisionArtifactDiagnosticsHolder: DecisionArtifactDiagnosticsHolder = {
    value: null,
  };

  if (!decisionBriefAttempted) {
    notes.push(
      "Decision Brief skipped because Capture Layer schema/parse gate did not pass.",
    );
  } else if (validatedCapture) {
    const briefStarted = Date.now();
    try {
      const briefResult = await adapter.generateDecisionBrief(
        {
          captureLayer: validatedCapture,
          briefType,
          briefTypeGuidance: briefType.guidance,
          markdownStructure: [...DECISION_BRIEF_MARKDOWN_STRUCTURE],
          toneGuidance: "Concise, executive-ready, direct, and decision-oriented.",
          sourceLabel: loaded.sourceLabel,
        },
        options.mode === "ollama"
          ? { diagnostics: decisionArtifactDiagnosticsHolder }
          : undefined,
      );
      briefLatencyMs = Date.now() - briefStarted;
      briefMarkdown = briefResult.markdown;
      briefGenerationSuccess = Boolean(briefMarkdown?.trim());

      try {
        decisionTrace = validateDecisionTraceObject(briefResult.decisionTrace);
        decisionTraceSchemaPass = true;
      } catch (error) {
        decisionTraceSchemaPass = false;
        rawErrorCategory =
          rawErrorCategory === "none" ? "trace_schema" : rawErrorCategory;
        notes.push(
          `Decision Trace schema failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      if (decisionTrace && decisionTraceSchemaPass) {
        const readiness = evaluateDecisionTraceReadiness(
          validatedCapture,
          decisionTrace,
        );
        decisionTraceStructuralPass = readiness.pass;
        decisionTraceFindings = readiness.checks;

        const alignment = evaluateArtifactAlignment({
          captureLayer: validatedCapture,
          decisionTrace,
          briefMarkdown: briefMarkdown ?? "",
        });
        recommendationAlignmentPass = alignment.recommendationAlignmentPass;
        nextStepAlignmentPass = alignment.nextStepAlignmentPass;
        decisionTraceFindings = [
          ...decisionTraceFindings,
          ...alignment.findings,
        ];
      }

      if (briefMarkdown) {
        requiredSectionsOk = requiredSectionsPass(briefMarkdown);
        const writing = evaluateDecisionBriefWriting(briefMarkdown, {
          captureLayer: validatedCapture,
          sourceText: loaded.rawInputText,
        });
        writingHardFailures = writing.errors.map(
          (item) => `${item.ruleId}: ${item.message}`,
        );
        writingWarnings = writing.warnings.map(
          (item) => `${item.ruleId}: ${item.message}`,
        );
        writingReports = writing.reports.map(
          (item) => `${item.ruleId}: ${item.message}`,
        );
      }
    } catch (error) {
      briefLatencyMs = Date.now() - briefStarted;
      const message = error instanceof Error ? error.message : String(error);
      notes.push(`Decision Brief generation failed: ${message}`);
      rawErrorCategory =
        options.mode === "ollama" &&
        /fetch failed|ECONNREFUSED|timed out|404|not found|Ollama/i.test(message)
          ? "infrastructure"
          : "brief_generation";
    }
  }

  if (evalCase.category === "evaluation-fixture" && options.mode === "mock") {
    supportLimitations.push(
      "Mock adapter returns synthetic Capture Layers for non-gallery eval fixtures; gallery cases use authored demo fixtures via demo: sourceLabel.",
    );
  }

  const deterministicUsableBrief = decideDeterministicUsableBrief({
    captureLayerFinalParsePass: schema.validJson,
    captureLayerSchemaPass: schema.schemaPass,
    captureLayerStructuralReadinessPass: structural.pass,
    inventedStatedDecision: !invented.pass,
    decisionTraceSchemaPass,
    decisionTraceStructuralReadinessPass: decisionTraceStructuralPass,
    recommendationAlignmentPass,
    nextStepAlignmentPass,
    requiredDecisionBriefSectionsPass: requiredSectionsOk,
    writingHardFailureCount: writingHardFailures.length,
    decisionBriefAttempted,
    decisionBriefGenerationSuccess: briefGenerationSuccess,
  });

  const artifactPaths = options.artifactsDir
    ? writeArtifacts({
        artifactsDir: options.artifactsDir,
        fixtureId: evalCase.id,
        captureLayer: validatedCapture,
        briefMarkdown,
        decisionTrace,
      })
    : null;

  const result = createBasePipelineResult({
    runId: options.runId,
    timestamp: new Date().toISOString(),
    buildCommit: options.buildCommit,
    fixtureId: evalCase.id,
    fixtureName: evalCase.name,
    fixtureCategory: evalCase.category,
    generationMode: options.mode,
    modelId,
    runtimeLibraryVersion,
    promptVariant: resolvePromptVariant(options.mode, decisionArtifactDiagnosticsHolder.value),
    captureLayerFirstAttemptParsePass: schema.validJson,
    captureLayerFinalParsePass: schema.validJson,
    captureLayerSchemaPass: schema.schemaPass,
    captureLayerStructuralReadinessPass: structural.pass,
    captureLayerReadinessFindings: structural.checks,
    inventedStatedDecisionFinding: invented.finding,
    captureLayerRetryCount:
      longInputDiagnosticsHolder.value?.totalChunkRetries ?? 0,
    captureLayerLatencyMs: captureLatencyMs,
    decisionBriefAttempted,
    decisionBriefGenerationSuccess: briefGenerationSuccess,
    decisionBriefLatencyMs: briefLatencyMs,
    decisionTraceSchemaPass,
    decisionTraceStructuralReadinessPass: decisionTraceStructuralPass,
    decisionTraceFindings,
    recommendationAlignmentPass,
    nextStepAlignmentPass,
    requiredDecisionBriefSectionsPass: requiredSectionsOk,
    writingHardFailures,
    writingWarnings,
    writingReportOnlyFindings: writingReports,
    deterministicUsableBrief,
    manualScores: createEmptyManualScores(),
    evaluatorNotes: notes,
    supportLimitations,
    rawErrorCategory,
    failureKind: classifyFailureKind({
      deterministicUsableBrief,
      rawErrorCategory,
    }),
    artifactPaths,
    webGpu: null,
    longInputDiagnostics: toPipelineLongInputDiagnostics(
      longInputDiagnosticsHolder.value,
      validatedCapture !== null,
    ),
    decisionArtifactDiagnostics:
      options.mode === "ollama"
        ? decisionArtifactDiagnosticsHolder.value
        : null,
  });

  return result;
}

export async function runPipelineEvalSuite(options: {
  mode: Exclude<PipelineGenerationMode, "webgpu">;
  caseIds: string[];
  repoRoot: string;
  modelOverride?: string | null;
  artifactsDir?: string | null;
  runId?: string;
  buildCommit?: string | null;
}): Promise<PipelineRunSummary> {
  const runId = options.runId ?? createRunId();
  const buildCommit = options.buildCommit ?? resolveBuildCommit();
  const timestamp = new Date().toISOString();
  const results: PipelineEvalResult[] = [];

  for (const caseId of options.caseIds) {
    const result = await runSinglePipelineEval({
      mode: options.mode,
      caseId,
      repoRoot: options.repoRoot,
      runId,
      buildCommit,
      modelOverride: options.modelOverride ?? null,
      artifactsDir: options.artifactsDir ?? null,
    });
    results.push(result);
  }

  const infrastructureFailure = results.some(
    (result) => result.failureKind === "infrastructure",
  );

  return {
    resultFormatVersion: PIPELINE_RESULT_FORMAT_VERSION,
    runId,
    timestamp,
    buildCommit,
    generationMode: options.mode,
    modelId: results.find((result) => result.modelId)?.modelId ?? null,
    caseIds: options.caseIds,
    results,
    infrastructureFailure,
    harnessExecutionError: null,
  };
}

export function formatPipelineRunHuman(summary: PipelineRunSummary): string {
  const lines = [
    `## Full-pipeline eval — ${summary.generationMode}`,
    "",
    `- Run ID: ${summary.runId}`,
    `- Timestamp: ${summary.timestamp}`,
    `- Build commit: ${summary.buildCommit ?? "n/a"}`,
    `- Model: ${summary.modelId ?? "n/a"}`,
    `- Cases: ${summary.caseIds.length}`,
    `- Infrastructure failure: ${summary.infrastructureFailure ? "yes" : "no"}`,
    "",
    "| Fixture | Category | Deterministic usable | Capture schema | Trace ready | Alignment | Writing hard fails | Failure kind |",
    "| --- | --- | --- | --- | --- | --- | ---: | --- |",
  ];

  for (const result of summary.results) {
    const alignment =
      result.recommendationAlignmentPass === true &&
      result.nextStepAlignmentPass === true
        ? "pass"
        : result.recommendationAlignmentPass === null
          ? "n/a"
          : "fail";
    lines.push(
      `| ${result.fixtureId} | ${result.fixtureCategory} | ${result.deterministicUsableBrief ? "yes" : "no"} | ${result.captureLayerSchemaPass ? "pass" : "fail"} | ${result.decisionTraceStructuralReadinessPass === true ? "pass" : result.decisionTraceStructuralReadinessPass === null ? "n/a" : "fail"} | ${alignment} | ${result.writingHardFailures.length} | ${result.failureKind} |`,
    );
  }

  lines.push(
    "",
    "Manual scores remain null. Fill later via fixtures/evaluation/manual-scorecard.md and the nullable manualScores fields.",
  );

  return `${lines.join("\n")}\n`;
}

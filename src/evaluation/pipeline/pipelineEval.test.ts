import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { EXAMPLE_FIXTURES } from "../../data/exampleFixtures";
import type { CaptureLayer } from "../../types/captureLayer";
import type { DecisionTrace } from "../../types/decisionTrace";
import { evaluateArtifactAlignment } from "./alignmentChecks";
import {
  PIPELINE_EVAL_CASE_IDS,
  PIPELINE_EVAL_CASES,
} from "./cases";
import {
  parsePipelineCliArgs,
  PipelineCliError,
  resolveCaseIds,
} from "./cliArgs";
import { decideDeterministicUsableBrief } from "./deterministicUsableBrief";
import { evaluateInventedStatedDecision } from "./inventedStatedDecision";
import { loadEvaluationFixtureInput } from "./loadCaseInput";
import {
  createEmptyManualScores,
  parsePipelineEvalResult,
} from "./resultSchema";
import { runSinglePipelineEval } from "./runPipelineEval";
import { buildWebGpuPipelineResult } from "./webGpuResult";
import { PIPELINE_RESULT_FORMAT_VERSION } from "./constants";

const repoRoot = process.cwd();

function spawnEvalPipelineCli(cliArgs: string[]) {
  const require = createRequire(import.meta.url);
  const tsxPackageJson = require.resolve("tsx/package.json");
  const tsxCli = join(dirname(tsxPackageJson), "dist/cli.mjs");

  return spawnSync(
    process.execPath,
    [
      tsxCli,
      "--import",
      "./scripts/register-fixture-raw-hooks.mts",
      "./scripts/eval-pipeline.ts",
      ...cliArgs,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
    },
  );
}

const usableOptions = {
  captureLayerFinalParsePass: true,
  captureLayerSchemaPass: true,
  captureLayerStructuralReadinessPass: true,
  inventedStatedDecision: false,
  decisionTraceSchemaPass: true,
  decisionTraceStructuralReadinessPass: true,
  recommendationAlignmentPass: true,
  nextStepAlignmentPass: true,
  requiredDecisionBriefSectionsPass: true,
  writingHardFailureCount: 0,
  decisionBriefAttempted: true,
  decisionBriefGenerationSuccess: true,
};

describe("pipeline case registry", () => {
  it("includes all nine expected case IDs", () => {
    expect(PIPELINE_EVAL_CASE_IDS).toEqual([
      "product-prioritization",
      "strategy-tradeoff",
      "execution-planning",
      "customer-interview-synthesis",
      "ambiguous-stakeholder-conversation",
      "q4-workforce-allocation",
      "local-inference-setup-flow",
      "household-move-planning",
      "platform-rearchitecture-review",
    ]);
    expect(PIPELINE_EVAL_CASES).toHaveLength(9);
  });
});

describe("parsePipelineCliArgs", () => {
  it("defaults to mock + all nine cases", () => {
    const options = parsePipelineCliArgs([]);
    expect(options.mode).toBe("mock");
    expect(resolveCaseIds(options)).toEqual(PIPELINE_EVAL_CASE_IDS);
  });

  it("parses mode, fixture, output, model, and json flags", () => {
    const options = parsePipelineCliArgs([
      "--mode=ollama",
      "--fixture=product-prioritization",
      "--fixture=execution-planning",
      "--output=tmp/out.json",
      "--model=qwen3:4b",
      "--json",
    ]);
    expect(options.mode).toBe("ollama");
    expect(options.fixtureIds).toEqual([
      "product-prioritization",
      "execution-planning",
    ]);
    expect(options.outputPath).toBe("tmp/out.json");
    expect(options.model).toBe("qwen3:4b");
    expect(options.json).toBe(true);
    expect(options.all).toBe(false);
  });

  it("rejects unknown arguments", () => {
    expect(() => parsePipelineCliArgs(["--nope"])).toThrow(PipelineCliError);
  });
});

describe("decideDeterministicUsableBrief", () => {
  it("passes only when every hard gate passes", () => {
    expect(decideDeterministicUsableBrief(usableOptions)).toBe(true);
  });

  it("fails on Capture Layer schema or structural readiness", () => {
    expect(
      decideDeterministicUsableBrief({
        ...usableOptions,
        captureLayerSchemaPass: false,
      }),
    ).toBe(false);
    expect(
      decideDeterministicUsableBrief({
        ...usableOptions,
        captureLayerStructuralReadinessPass: false,
      }),
    ).toBe(false);
  });

  it("fails when a stated decision is invented", () => {
    expect(
      decideDeterministicUsableBrief({
        ...usableOptions,
        inventedStatedDecision: true,
      }),
    ).toBe(false);
  });

  it("fails on Decision Trace, alignment, sections, or writing hard failures", () => {
    expect(
      decideDeterministicUsableBrief({
        ...usableOptions,
        decisionTraceSchemaPass: false,
      }),
    ).toBe(false);
    expect(
      decideDeterministicUsableBrief({
        ...usableOptions,
        recommendationAlignmentPass: false,
      }),
    ).toBe(false);
    expect(
      decideDeterministicUsableBrief({
        ...usableOptions,
        nextStepAlignmentPass: false,
      }),
    ).toBe(false);
    expect(
      decideDeterministicUsableBrief({
        ...usableOptions,
        requiredDecisionBriefSectionsPass: false,
      }),
    ).toBe(false);
    expect(
      decideDeterministicUsableBrief({
        ...usableOptions,
        writingHardFailureCount: 1,
      }),
    ).toBe(false);
  });

  it("does not treat writing warnings as hard failures", () => {
    expect(decideDeterministicUsableBrief(usableOptions)).toBe(true);
  });
});

describe("manual scoring fields", () => {
  it("remain nullable until a reviewer fills them", () => {
    const scores = createEmptyManualScores();
    expect(scores.decisionUsefulness).toBeNull();
    expect(scores.groundingAndTraceability).toBeNull();
    expect(scores.clarity).toBeNull();
    expect(scores.actionability).toBeNull();
    expect(scores.totalScore).toBeNull();
    expect(scores.reviewerNotes).toBeNull();
    expect(scores.humanUsableBrief).toBeNull();
  });
});

describe("invented stated decision", () => {
  it("fails when a fixture expects an empty stated_decision", () => {
    const captureLayer = {
      stated_decision: "Approve the partner experiment now",
    } as CaptureLayer;
    const result = evaluateInventedStatedDecision({
      captureLayer,
      expectEmptyStatedDecision: true,
    });
    expect(result.pass).toBe(false);
    expect(result.finding).toMatch(/Invented stated_decision/);
  });
});

describe("artifact alignment", () => {
  it("passes for gallery fixtures with aligned recommendation and next steps", () => {
    const fixture = EXAMPLE_FIXTURES[0];
    const result = evaluateArtifactAlignment({
      captureLayer: fixture.expectedCaptureLayer,
      decisionTrace: fixture.expectedDecisionTrace,
      briefMarkdown: fixture.expectedDecisionBrief,
    });
    expect(result.recommendationAlignmentPass).toBe(true);
    expect(result.nextStepAlignmentPass).toBe(true);
  });

  it("fails when recommendation statements diverge", () => {
    const fixture = EXAMPLE_FIXTURES[0];
    const brokenTrace: DecisionTrace = {
      ...fixture.expectedDecisionTrace,
      entries: fixture.expectedDecisionTrace.entries.map((entry) =>
        entry.kind === "recommendation"
          ? { ...entry, statement: "A completely different recommendation" }
          : entry,
      ),
    };
    const result = evaluateArtifactAlignment({
      captureLayer: fixture.expectedCaptureLayer,
      decisionTrace: brokenTrace,
      briefMarkdown: fixture.expectedDecisionBrief,
    });
    expect(result.recommendationAlignmentPass).toBe(false);
  });
});

describe("result schema parser", () => {
  it("accepts a well-formed pipeline result and keeps manual scores null", () => {
    const webgpu = buildWebGpuPipelineResult({
      runId: "test-run",
      fixtureId: "q4-workforce-allocation",
      fixtureName: "Q4 Workforce Allocation",
      fixtureCategory: "gallery-example",
      modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
      webLlmVersion: "0.2.84",
      captureLayerFirstAttemptParsePass: true,
      captureLayerFinalParsePass: true,
      captureLayerSchemaPass: true,
      captureLayerStructuralReadinessPass: true,
      captureLayerRetryCount: 1,
      decisionBriefAttempted: true,
      decisionBriefGenerationSuccess: true,
      decisionTraceSchemaPass: true,
      decisionTraceStructuralReadinessPass: true,
      recommendationAlignmentPass: true,
      nextStepAlignmentPass: true,
      requiredDecisionBriefSectionsPass: true,
      webGpu: {
        browser: "Chrome 137",
        deviceProfile: "macOS / Apple Silicon",
        coldLoadMs: 120000,
        warmLoadMs: 8000,
        deliveryBlocker: null,
        unsupportedDevice: false,
      },
    });

    const parsed = parsePipelineEvalResult(webgpu);
    expect(parsed.resultFormatVersion).toBe(PIPELINE_RESULT_FORMAT_VERSION);
    expect(parsed.generationMode).toBe("webgpu");
    expect(parsed.manualScores.totalScore).toBeNull();
    expect(parsed.webGpu?.webLlmVersion).toBe("0.2.84");
    expect(parsed.deterministicUsableBrief).toBe(true);
  });

  it("rejects unsupported format versions", () => {
    expect(() =>
      parsePipelineEvalResult({
        resultFormatVersion: 999,
        fixtureId: "x",
        generationMode: "mock",
        manualScores: createEmptyManualScores(),
        deterministicUsableBrief: false,
      }),
    ).toThrow(/Unsupported resultFormatVersion/);
  });
});

describe("evaluation fixture loader", () => {
  it("loads inline raw notes and external strategy transcript paths", () => {
    const product = loadEvaluationFixtureInput(
      "fixtures/evaluation/product-prioritization.md",
      repoRoot,
    );
    expect(product.briefTypeId).toBe("product");
    expect(product.rawInputText).toMatch(/Onboarding workflow/);

    const strategy = loadEvaluationFixtureInput(
      "fixtures/evaluation/strategy-tradeoff.md",
      repoRoot,
    );
    expect(strategy.briefTypeId).toBe("strategy");
    expect(strategy.rawInputText).toMatch(/specialty trades/i);
  });
});

describe("mock full-pipeline execution", () => {
  it("runs a gallery case through Capture Layer, brief, and trace gates", async () => {
    const result = await runSinglePipelineEval({
      mode: "mock",
      caseId: "q4-workforce-allocation",
      repoRoot,
      runId: "test-mock-gallery",
      buildCommit: "test",
    });

    expect(result.captureLayerSchemaPass).toBe(true);
    expect(result.captureLayerStructuralReadinessPass).toBe(true);
    expect(result.decisionBriefAttempted).toBe(true);
    expect(result.decisionBriefGenerationSuccess).toBe(true);
    expect(result.decisionTraceSchemaPass).toBe(true);
    expect(result.writingHardFailures).toEqual([]);
    expect(result.manualScores.humanUsableBrief).toBeNull();
    expect(result.deterministicUsableBrief).toBe(true);
    expect(result.failureKind).toBe("none");
  });

  it("records product-quality failure for hollow mock evaluation fixtures without inventing scores", async () => {
    const result = await runSinglePipelineEval({
      mode: "mock",
      caseId: "product-prioritization",
      repoRoot,
      runId: "test-mock-eval-fixture",
      buildCommit: "test",
    });

    expect(result.fixtureCategory).toBe("evaluation-fixture");
    expect(result.captureLayerSchemaPass).toBe(true);
    expect(result.captureLayerStructuralReadinessPass).toBe(false);
    expect(result.decisionBriefAttempted).toBe(true);
    expect(result.deterministicUsableBrief).toBe(false);
    expect(result.failureKind).toBe("product_quality");
    expect(result.manualScores.totalScore).toBeNull();
  });
});

describe("failed Capture Layer stage", () => {
  it("skips brief generation when Capture Layer generation throws", async () => {
    const { mockModelAdapter } = await import(
      "../../services/generation/mockModelAdapter"
    );
    const original = mockModelAdapter.generateCaptureLayer;
    mockModelAdapter.generateCaptureLayer = async () => {
      throw new Error("simulated capture failure");
    };

    try {
      const result = await runSinglePipelineEval({
        mode: "mock",
        caseId: "household-move-planning",
        repoRoot,
        runId: "test-capture-fail",
        buildCommit: "test",
      });

      expect(result.captureLayerSchemaPass).toBe(false);
      expect(result.decisionBriefAttempted).toBe(false);
      expect(result.decisionBriefGenerationSuccess).toBe(false);
      expect(result.decisionTraceSchemaPass).toBeNull();
      expect(result.deterministicUsableBrief).toBe(false);
      expect(result.rawErrorCategory).toBe("capture_generation");
    } finally {
      mockModelAdapter.generateCaptureLayer = original;
    }
  });
});

describe("Decision Trace and writing failure classification", () => {
  it("treats Decision Trace schema failure as not deterministically usable", () => {
    expect(
      decideDeterministicUsableBrief({
        ...usableOptions,
        decisionTraceSchemaPass: false,
      }),
    ).toBe(false);
  });

  it("keeps warnings out of the hard-failure usable-brief gate", () => {
    expect(
      decideDeterministicUsableBrief({
        ...usableOptions,
        writingHardFailureCount: 0,
      }),
    ).toBe(true);
  });
});

describe("CLI harness execution errors", () => {
  it("exits nonzero for unknown CLI arguments (distinct from product-quality)", () => {
    const result = spawnEvalPipelineCli(["--definitely-not-a-flag"]);

    expect(result.status).toBe(1);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/Unknown argument/);
  });
});

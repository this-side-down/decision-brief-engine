import {
  EXECUTION_DECISION_BRIEF,
  PRODUCT_DECISION_BRIEF,
  STRATEGY_DECISION_BRIEF,
} from "../data/briefTypes";
import { mockModelAdapter } from "../services/generation/mockModelAdapter";
import { ollamaModelAdapter } from "../services/generation/ollamaModelAdapter";
import { getOllamaConfig } from "../services/generation/ollamaConfig";
import { CAPTURE_LAYER_FIELDS } from "../services/generation/types";
import type { BriefType } from "../types/brief";
import type { CaptureLayer } from "../types/captureLayer";
import {
  evaluateStructuralReadiness,
  validateCaptureLayerObject,
} from "./captureLayerChecks";
import {
  CONSTRUCTION_STRATEGY_EVAL_CASE,
  getCaptureLayerEvalCase,
} from "./cases";
import { buildCaptureLayerEvalResult, formatEvalResultMarkdown } from "./report";
import type {
  CaptureLayerEvalCase,
  CaptureLayerEvalMode,
  CaptureLayerEvalResult,
} from "./types";

function resolveBriefType(
  briefTypeId: CaptureLayerEvalCase["briefTypeId"],
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

async function generateForMode(options: {
  mode: Exclude<CaptureLayerEvalMode, "webgpu">;
  evalCase: CaptureLayerEvalCase;
  rawInputText: string;
}): Promise<{ captureLayer: CaptureLayer; model: string }> {
  const briefType = resolveBriefType(options.evalCase.briefTypeId);
  const input = {
    rawInputText: options.rawInputText,
    briefType,
    briefTypeGuidance: briefType.guidance,
    captureLayerFields: [...CAPTURE_LAYER_FIELDS],
    sourceLabel: options.evalCase.sourceLabel,
  };

  if (options.mode === "mock") {
    const captureLayer = await mockModelAdapter.generateCaptureLayer(input);
    return { captureLayer, model: "mockModelAdapter" };
  }

  const { model } = getOllamaConfig();
  const captureLayer = await ollamaModelAdapter.generateCaptureLayer(input);
  return { captureLayer, model: `ollama:${model}` };
}

export async function runCaptureLayerEval(options: {
  mode: Exclude<CaptureLayerEvalMode, "webgpu">;
  rawInputText: string;
  caseId?: string;
}): Promise<CaptureLayerEvalResult> {
  const evalCase =
    getCaptureLayerEvalCase(options.caseId ?? CONSTRUCTION_STRATEGY_EVAL_CASE.id) ??
    (() => {
      throw new Error(
        `Unknown evaluation case: ${options.caseId ?? "(missing)"}. Known: construction-strategy`,
      );
    })();

  const started = Date.now();

  try {
    const { captureLayer, model } = await generateForMode({
      mode: options.mode,
      evalCase,
      rawInputText: options.rawInputText,
    });
    const latencyMs = Date.now() - started;
    const schema = validateCaptureLayerObject(captureLayer);
    const structuralReadiness = schema.captureLayer
      ? evaluateStructuralReadiness(
          schema.captureLayer,
          evalCase.structuralExpectations,
        )
      : { pass: false, checks: [] };

    return buildCaptureLayerEvalResult({
      caseId: evalCase.id,
      caseName: evalCase.name,
      mode: options.mode,
      model,
      latencyMs,
      schema: {
        validJson: schema.validJson,
        schemaPass: schema.schemaPass,
        error: schema.error,
      },
      structuralReadiness,
      captureLayer: schema.captureLayer,
      notes: [
        `Fixture doc: ${evalCase.fixtureDocPath}`,
        "Human product-quality scoring remains manual via fixtures/evaluation/manual-scorecard.md.",
        "WebGPU runs use the manual procedure in docs/ai/capture-layer-eval-harness.md.",
      ],
    });
  } catch (error) {
    const latencyMs = Date.now() - started;
    const message = error instanceof Error ? error.message : String(error);

    return buildCaptureLayerEvalResult({
      caseId: evalCase.id,
      caseName: evalCase.name,
      mode: options.mode,
      model: options.mode === "mock" ? "mockModelAdapter" : "ollama",
      latencyMs,
      schema: {
        validJson: false,
        schemaPass: false,
        error: message,
      },
      structuralReadiness: null,
      captureLayer: null,
      notes: [
        `Generation failed: ${message}`,
        `Fixture doc: ${evalCase.fixtureDocPath}`,
      ],
    });
  }
}

export function printEvalResult(
  result: CaptureLayerEvalResult,
  options: { json?: boolean } = {},
): void {
  if (options.json) {
    const { captureLayer: _captureLayer, ...rest } = result;
    console.log(JSON.stringify(rest, null, 2));
    return;
  }

  console.log(formatEvalResultMarkdown(result));
}

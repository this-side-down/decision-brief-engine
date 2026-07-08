import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { STRATEGY_DECISION_BRIEF } from "../data/briefTypes";
import { mockModelAdapter } from "../services/generation/mockModelAdapter";
import { CAPTURE_LAYER_FIELDS } from "../services/generation/types";
import type { CaptureLayer } from "../types/captureLayer";
import { CONSTRUCTION_STRATEGY_EVAL_CASE } from "./cases";
import {
  decideProceedToBrief,
  evaluateStructuralReadiness,
  validateCaptureLayerJsonText,
  validateCaptureLayerObject,
} from "./captureLayerChecks";

const minimalValidLayer: CaptureLayer = {
  source_summary: "s",
  decision_context: "d",
  stated_decision: "Decide X",
  implied_decision: "",
  goals: ["g"],
  stakeholders: ["a", "b", "c", "d"],
  options_considered: ["o1", "o2", "o3"],
  constraints: ["c"],
  risks: ["r1", "r2", "r3"],
  assumptions: ["a1", "a2"],
  evidence: ["e"],
  open_questions: ["q1", "q2", "q3"],
  tensions: ["t"],
  recommendation_candidate: "Do the pilot",
  confidence: "Medium",
  missing_context: ["m1", "m2"],
  suggested_next_steps: ["n"],
};

describe("validateCaptureLayerJsonText", () => {
  it("accepts fenced valid Capture Layer JSON", () => {
    const result = validateCaptureLayerJsonText(
      `\`\`\`json\n${JSON.stringify(minimalValidLayer)}\n\`\`\``,
    );
    expect(result.validJson).toBe(true);
    expect(result.schemaPass).toBe(true);
    expect(result.captureLayer?.stated_decision).toBe("Decide X");
  });

  it("rejects invalid JSON before schema checks", () => {
    const result = validateCaptureLayerJsonText("{not-json");
    expect(result.validJson).toBe(false);
    expect(result.schemaPass).toBe(false);
  });

  it("rejects missing required fields after JSON parse", () => {
    const result = validateCaptureLayerJsonText(
      JSON.stringify({ source_summary: "only" }),
    );
    expect(result.validJson).toBe(true);
    expect(result.schemaPass).toBe(false);
    expect(result.error).toMatch(/missing required field/i);
  });
});

describe("evaluateStructuralReadiness", () => {
  it("passes a filled construction-shaped layer", () => {
    const result = evaluateStructuralReadiness(
      minimalValidLayer,
      CONSTRUCTION_STRATEGY_EVAL_CASE.structuralExpectations,
    );
    expect(result.pass).toBe(true);
  });

  it("fails when decision and recommendation are empty", () => {
    const hollow: CaptureLayer = {
      ...minimalValidLayer,
      stated_decision: "",
      implied_decision: "",
      recommendation_candidate: "",
      options_considered: [],
    };
    const result = evaluateStructuralReadiness(
      hollow,
      CONSTRUCTION_STRATEGY_EVAL_CASE.structuralExpectations,
    );
    expect(result.pass).toBe(false);
    expect(result.checks.some((check) => !check.pass)).toBe(true);
  });
});

describe("decideProceedToBrief", () => {
  it("requires schema and structural pass", () => {
    expect(
      decideProceedToBrief({ schemaPass: true, structuralPass: true }),
    ).toBe(true);
    expect(
      decideProceedToBrief({ schemaPass: false, structuralPass: true }),
    ).toBe(false);
    expect(
      decideProceedToBrief({ schemaPass: true, structuralPass: false }),
    ).toBe(false);
  });
});

describe("mock construction Strategy case", () => {
  it("produces a schema-valid structurally ready Capture Layer", async () => {
    const rawInputText = readFileSync(
      resolve(process.cwd(), CONSTRUCTION_STRATEGY_EVAL_CASE.rawInputPath),
      "utf8",
    );

    const captureLayer = await mockModelAdapter.generateCaptureLayer({
      rawInputText,
      briefType: STRATEGY_DECISION_BRIEF,
      briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
      captureLayerFields: [...CAPTURE_LAYER_FIELDS],
      sourceLabel: CONSTRUCTION_STRATEGY_EVAL_CASE.sourceLabel,
    });

    const schema = validateCaptureLayerObject(captureLayer);
    expect(schema.schemaPass).toBe(true);
    expect(schema.captureLayer).not.toBeNull();

    const structural = evaluateStructuralReadiness(
      schema.captureLayer!,
      CONSTRUCTION_STRATEGY_EVAL_CASE.structuralExpectations,
    );
    expect(structural.pass).toBe(true);
    expect(
      decideProceedToBrief({
        schemaPass: schema.schemaPass,
        structuralPass: structural.pass,
      }),
    ).toBe(true);
  });
});

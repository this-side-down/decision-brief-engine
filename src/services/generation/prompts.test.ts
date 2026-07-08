import { afterEach, describe, expect, it } from "vitest";
import { STRATEGY_DECISION_BRIEF } from "../../data/briefTypes";
import { CAPTURE_LAYER_FIELDS } from "./types";
import {
  buildCaptureLayerPrompt,
  resolveCapturePromptVariant,
} from "./prompts";

const baseInput = {
  rawInputText: "Decide whether to pilot specialty trades before Q4.",
  briefType: STRATEGY_DECISION_BRIEF,
  briefTypeGuidance: STRATEGY_DECISION_BRIEF.guidance,
  captureLayerFields: [...CAPTURE_LAYER_FIELDS],
  sourceLabel: "test",
};

describe("resolveCapturePromptVariant", () => {
  const previousVariant = process.env.VITE_CAPTURE_PROMPT_VARIANT;

  afterEach(() => {
    if (previousVariant === undefined) {
      delete process.env.VITE_CAPTURE_PROMPT_VARIANT;
    } else {
      process.env.VITE_CAPTURE_PROMPT_VARIANT = previousVariant;
    }
  });

  it("defaults to default for unset env or unknown explicit values", () => {
    delete process.env.VITE_CAPTURE_PROMPT_VARIANT;
    expect(resolveCapturePromptVariant()).toBe("default");
    expect(resolveCapturePromptVariant("")).toBe("default");
    expect(resolveCapturePromptVariant("other")).toBe("default");
  });

  it("accepts schema_skeleton explicitly or from env", () => {
    expect(resolveCapturePromptVariant("schema_skeleton")).toBe(
      "schema_skeleton",
    );
    process.env.VITE_CAPTURE_PROMPT_VARIANT = "schema_skeleton";
    expect(resolveCapturePromptVariant()).toBe("schema_skeleton");
  });
});

describe("buildCaptureLayerPrompt", () => {
  it("keeps default variant free of the JSON skeleton template", () => {
    const prompt = buildCaptureLayerPrompt(baseInput, { variant: "default" });
    expect(prompt).toContain("Return only valid JSON with all required fields");
    expect(prompt).not.toContain('"stated_decision": ""');
  });

  it("adds an explicit field skeleton for schema_skeleton", () => {
    const prompt = buildCaptureLayerPrompt(baseInput, {
      variant: "schema_skeleton",
    });
    expect(prompt).toContain('"stated_decision": ""');
    expect(prompt).toContain('"options_considered": []');
    expect(prompt).toContain(
      "stated_decision may be \"\" when the notes do not contain an explicit decision",
    );
    expect(prompt).toContain("Decide whether to pilot specialty trades before Q4.");
  });
});

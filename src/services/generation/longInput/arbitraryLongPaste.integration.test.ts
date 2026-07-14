import { describe, expect, it } from "vitest";
import { PRODUCT_DECISION_BRIEF } from "../../../data/briefTypes";
import { CAPTURE_INPUT_BUDGET_POLICY } from "./inputBudgetPolicy";
import { planLongInput } from "./planLongInput";
import { generateCaptureLayerForSession } from "../generateCaptureLayer";
import { generateDecisionBriefForSession } from "../generateDecisionBrief";
import { mockModelAdapter } from "../mockModelAdapter";
import {
  GENERIC_MOCK_STRUCTURAL_EXPECTATIONS,
  evaluateStructuralReadiness,
} from "../captureLayerStructuralReadiness";
import {
  validateCaptureLayerObject,
} from "../../../evaluation/captureLayerChecks";
import { evaluateDecisionTraceReadiness } from "../../../evaluation/decisionTraceChecks";
import {
  getDefaultRequiredSections,
  parseDecisionBriefSections,
} from "../../../evaluation/decisionBriefWritingChecks";

function buildArbitraryLongPaste(): string {
  const parts = [
    "**Taylor:** BEGIN-MARKER: notification batching scope must be confirmed before the release window closes.\n\n",
  ];

  let index = 0;
  while (parts.join("").length <= CAPTURE_INPUT_BUDGET_POLICY.singlePassMaxRawChars) {
    parts.push(
      index % 2 === 0
        ? "**Jordan:** MID-MARKER: pricing tiers remain unresolved for enterprise accounts.\n\n"
        : "Additional planning notes about rollout risk, customer messaging, and support load.\n\n",
    );
    index += 1;
  }

  parts.push(
    "**Taylor:** END-MARKER: no final owner named and success metrics remain unclear.\n\n",
  );

  return parts.join("");
}

describe("arbitrary pasted long Mock input integration", () => {
  const rawInputText = buildArbitraryLongPaste();

  it("completes hierarchical capture and downstream Mock brief generation", async () => {
    expect(rawInputText.length).toBeGreaterThan(
      CAPTURE_INPUT_BUDGET_POLICY.singlePassMaxRawChars,
    );

    const captureLayer = await generateCaptureLayerForSession({
      rawInputText,
      briefType: PRODUCT_DECISION_BRIEF,
      sourceLabel: "custom pasted notes",
      mode: "mock",
    });

    const schema = validateCaptureLayerObject(captureLayer);
    expect(schema.schemaPass, schema.error ?? undefined).toBe(true);
    expect(captureLayer.stated_decision.trim()).toBe("");
    expect(captureLayer.implied_decision.trim().length).toBeGreaterThan(0);

    const plan = planLongInput(rawInputText);
    expect(plan.strategy).toBe("hierarchical");
    expect(plan.chunks.length).toBeGreaterThan(1);
    expect(plan.chunks[0].text).toContain("BEGIN-MARKER");
    expect(plan.chunks.some((chunk) => chunk.text.includes("MID-MARKER"))).toBe(
      true,
    );
    expect(plan.chunks[plan.chunks.length - 1].text).toContain("END-MARKER");

    const evidence = captureLayer.evidence.join(" ");
    expect(evidence).toContain("BEGIN-MARKER");
    expect(evidence).toContain("MID-MARKER");
    expect(evidence).toContain("END-MARKER");
    expect(captureLayer.evidence.length).toBeGreaterThanOrEqual(3);

    const structural = evaluateStructuralReadiness(
      captureLayer,
      GENERIC_MOCK_STRUCTURAL_EXPECTATIONS,
    );
    expect(structural.pass, JSON.stringify(structural.checks)).toBe(true);

    const { markdown, decisionTrace } = await generateDecisionBriefForSession({
      captureLayer,
      briefType: PRODUCT_DECISION_BRIEF,
      sourceLabel: "custom pasted notes",
      adapter: mockModelAdapter,
    });

    expect(markdown.trim().length).toBeGreaterThan(100);
    expect(decisionTrace.entries.length).toBeGreaterThan(0);

    const traceReadiness = evaluateDecisionTraceReadiness(
      captureLayer,
      decisionTrace,
    );
    expect(
      traceReadiness.pass,
      JSON.stringify(traceReadiness.checks.filter((check) => !check.pass)),
    ).toBe(true);

    const sections = parseDecisionBriefSections(markdown);
    for (const section of getDefaultRequiredSections()) {
      expect(sections.get(section)?.trim().length).toBeGreaterThan(0);
    }
  });
});

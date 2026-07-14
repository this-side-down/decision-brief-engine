import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EXECUTION_DECISION_BRIEF } from "../../../data/briefTypes";
import { loadEvaluationFixtureInput } from "../../../evaluation/pipeline/loadCaseInput";
import reference from "../../../../fixtures/evaluation/regional-launch-readiness-review.reference.json";
import { CAPTURE_INPUT_BUDGET_POLICY } from "./inputBudgetPolicy";
import { normalizeSourceText } from "./normalizeSourceText";
import { planLongInput } from "./planLongInput";
import { validateSourceCoverage } from "./segmentSource";

describe("regional-launch-readiness-review fixture", () => {
  const loaded = loadEvaluationFixtureInput(
    "fixtures/evaluation/regional-launch-readiness-review.md",
    process.cwd(),
  );

  it("exceeds the single-pass threshold and produces multiple chunks", () => {
    const text = normalizeSourceText(loaded.rawInputText);
    expect(text.length).toBeGreaterThan(
      CAPTURE_INPUT_BUDGET_POLICY.singlePassMaxRawChars,
    );

    const plan = planLongInput(text);
    expect(plan.strategy).toBe("hierarchical");
    expect(plan.chunks.length).toBeGreaterThan(1);

    const coverage = validateSourceCoverage(text, plan.chunks);
    expect(coverage.complete).toBe(true);
  });

  it("contains bounded reference anchors in the source", () => {
    const text = normalizeSourceText(loaded.rawInputText);
    expect(text).toContain(reference.beginningEvidenceAnchor);
    expect(text).toContain(reference.middleEvidenceAnchor);
    expect(text).toContain(reference.terminalEvidenceAnchor);
    expect(text).toContain(reference.unresolvedTerm);
  });

  it("loads as an execution brief type evaluation fixture", () => {
    expect(loaded.briefTypeId).toBe("execution");
    expect(EXECUTION_DECISION_BRIEF.id).toBe("execution");
    expect(
      readFileSync(
        "fixtures/evaluation/regional-launch-readiness-review.reference.json",
        "utf8",
      ),
    ).toContain(reference.expectedStatedDecisionConcept);
  });
});

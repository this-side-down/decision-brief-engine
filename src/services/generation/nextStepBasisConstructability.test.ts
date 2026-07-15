import { describe, expect, it } from "vitest";
import fixture from "../../../fixtures/examples/q4-workforce-allocation/expected-capture-layer.json";
import type { CaptureLayer } from "../../types/captureLayer";
import {
  findConstructableNextStepBasis,
  findUnsupportedNextSteps,
} from "./nextStepBasisConstructability";

const authored = fixture as CaptureLayer;

function withStep(step: string, overrides: Partial<CaptureLayer> = {}): CaptureLayer {
  return { ...authored, ...overrides, suggested_next_steps: [step] };
}

describe("next-step basis constructability", () => {
  it("rejects the exact generic Q4 run 1 step", () => {
    const step = "Revisit workforce allocation at next meeting with updated context";
    expect(findUnsupportedNextSteps(withStep(step))).toEqual([step]);
  });

  it("accepts the source-specific Q4 run 2 step", () => {
    const step = "Revisit at next workforce planning meeting but cannot leave hospital unnamed going into client call Thursday";
    expect(findConstructableNextStepBasis(step, withStep(step))).not.toEqual([]);
  });

  it("accepts the authored fixture scheduled next step", () => {
    const step = authored.suggested_next_steps.at(-1)!;
    expect(findConstructableNextStepBasis(step, authored)).not.toEqual([]);
  });

  it.each([
    ["Confirm hospital staffing at the next call", "Monthly school review"],
    ["Revisit hospital coverage at Thursday's client call", "School staffing review is monthly"],
    ["Revisit workforce planning at the next meeting", "Quarterly finance review"],
  ])("rejects unrelated scheduled checkpoints: step=%s constraint=%s", (step, constraint) => {
    const capture = withStep(step, {
      evidence: [], assumptions: [], risks: [], constraints: [constraint], tensions: [],
      options_considered: [], missing_context: [],
    });
    expect(findUnsupportedNextSteps(capture)).toEqual([step]);
  });

  it("accepts compatible checkpoint vocabulary with a shared substantive subject", () => {
    const step = "Confirm hospital staffing at the Thursday client call";
    const constraint = "Hospital staffing must be named before the Thursday client call";
    const capture = withStep(step, {
      evidence: [], assumptions: [], risks: [], constraints: [constraint], tensions: [],
      options_considered: [], missing_context: [],
    });
    expect(findConstructableNextStepBasis(step, capture)).toEqual([
      { field: "constraints", item: constraint },
    ]);
  });

  it.each([
    "Meet at the next meeting",
    "Review updated context",
    "Revisit the decision plan",
    "Follow the workforce allocation decision",
  ])("rejects generic-only overlap: %s", (step) => {
    expect(findUnsupportedNextSteps(withStep(step))).toEqual([step]);
  });

  it.each([
    ["evidence", "Confirm hospital client requirements", "Hospital client requires named coverage"],
    ["assumptions", "Validate immediate candidate availability", "Candidates cannot start immediately"],
    ["risks", "Mitigate superintendent attrition", "Senior superintendent attrition"],
    ["constraints", "Confirm the Thursday client deadline", "Client deadline is Thursday"],
    ["tensions", "Resolve hospital versus school priority", "Hospital versus school priority"],
    ["options_considered", "Evaluate traveling superintendent coverage", "Hire traveling superintendent"],
    ["missing_context", "Confirm Carlos certification status", "Carlos certification status"],
  ] as const)("accepts a substantive %s match", (field, step, basis) => {
    const capture = withStep(step, {
      evidence: [], assumptions: [], risks: [], constraints: [], tensions: [],
      options_considered: [], missing_context: [], [field]: [basis],
    });
    expect(findConstructableNextStepBasis(step, capture)).toEqual([{ field, item: basis }]);
  });
});

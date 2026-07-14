import { describe, expect, it, vi } from "vitest";
import { STRATEGY_DECISION_BRIEF } from "../../data/briefTypes";
import { getExampleFixture } from "../../data/exampleFixtures";
import { generateDecisionBriefForSession } from "./generateDecisionBrief";
import type { DecisionArtifactDiagnosticsHolder } from "./decisionArtifactDiagnostics";
import type { ModelAdapter } from "./types";

const fixture = getExampleFixture("q4-workforce-allocation")!;

const validResult = {
  markdown: "# Decision Brief\n\n## Summary\nContent.",
  decisionTrace: fixture.expectedDecisionTrace,
};

describe("generateDecisionBriefForSession", () => {
  it("passes AbortSignal through adapter options", async () => {
    const controller = new AbortController();
    const generateDecisionBrief = vi.fn().mockResolvedValue(validResult);
    const adapter: ModelAdapter = {
      generateCaptureLayer: vi.fn(),
      generateDecisionBrief,
    };

    await generateDecisionBriefForSession({
      captureLayer: fixture.expectedCaptureLayer,
      briefType: STRATEGY_DECISION_BRIEF,
      adapter,
      signal: controller.signal,
    });

    expect(generateDecisionBrief).toHaveBeenCalledWith(
      expect.objectContaining({
        captureLayer: fixture.expectedCaptureLayer,
      }),
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });

  it("passes diagnostics holder through adapter options", async () => {
    const diagnostics: DecisionArtifactDiagnosticsHolder = { value: null };
    const generateDecisionBrief = vi.fn().mockResolvedValue(validResult);
    const adapter: ModelAdapter = {
      generateCaptureLayer: vi.fn(),
      generateDecisionBrief,
    };

    await generateDecisionBriefForSession({
      captureLayer: fixture.expectedCaptureLayer,
      briefType: STRATEGY_DECISION_BRIEF,
      adapter,
      diagnostics,
    });

    expect(generateDecisionBrief).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        diagnostics,
      }),
    );
  });
});

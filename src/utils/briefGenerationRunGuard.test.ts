import { describe, expect, it } from "vitest";
import {
  beginBriefGenerationRun,
  isBriefGenerationRunCurrent,
  supersedeBriefGenerationRun,
} from "./briefGenerationRunGuard";

describe("briefGenerationRunGuard", () => {
  it("treats only the active run as current", () => {
    const first = beginBriefGenerationRun(0);
    expect(isBriefGenerationRunCurrent(first.nextActiveRunId, first.runId)).toBe(true);

    const superseded = supersedeBriefGenerationRun(first.nextActiveRunId);
    expect(isBriefGenerationRunCurrent(superseded, first.runId)).toBe(false);
  });

  it("allows a later run after supersession", () => {
    let activeRunId = 0;
    const first = beginBriefGenerationRun(activeRunId);
    activeRunId = first.nextActiveRunId;

    activeRunId = supersedeBriefGenerationRun(activeRunId);

    const second = beginBriefGenerationRun(activeRunId);
    activeRunId = second.nextActiveRunId;

    expect(isBriefGenerationRunCurrent(activeRunId, first.runId)).toBe(false);
    expect(isBriefGenerationRunCurrent(activeRunId, second.runId)).toBe(true);
  });
});

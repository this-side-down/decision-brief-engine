import { describe, expect, it } from "vitest";
import { demoExampleSourceLabel } from "../data/demoExamples";
import {
  formatCopySuccessMessage,
  formatDownloadSuccessMessage,
  resolveDecisionBriefFilename,
} from "./decisionBriefExport";

describe("resolveDecisionBriefFilename", () => {
  it("uses example slug when a gallery example is loaded", () => {
    expect(
      resolveDecisionBriefFilename({
        sourceLabel: demoExampleSourceLabel("q4-workforce-allocation"),
        briefTypeId: "strategy",
      }),
    ).toBe("decision-brief-q4-workforce-allocation.md");

    expect(
      resolveDecisionBriefFilename({
        sourceLabel: demoExampleSourceLabel("local-inference-setup-flow"),
      }),
    ).toBe("decision-brief-local-inference-setup-flow.md");

    expect(
      resolveDecisionBriefFilename({
        sourceLabel: demoExampleSourceLabel("household-move-planning"),
      }),
    ).toBe("decision-brief-household-move-planning.md");
  });

  it("falls back to brief type when no gallery example is loaded", () => {
    expect(
      resolveDecisionBriefFilename({
        briefTypeId: "product",
      }),
    ).toBe("decision-brief-product.md");
  });

  it("uses a generic filename when no example or brief type is available", () => {
    expect(resolveDecisionBriefFilename({})).toBe("decision-brief.md");
  });
});

describe("export status copy", () => {
  it("formats copy and download success messages", () => {
    expect(formatCopySuccessMessage("clipboard-api")).toBe(
      "Copied Decision Brief to clipboard.",
    );
    expect(formatCopySuccessMessage("exec-command")).toContain("fallback");
    expect(formatDownloadSuccessMessage("decision-brief-household-move-planning.md")).toBe(
      "Downloaded decision-brief-household-move-planning.md.",
    );
  });
});

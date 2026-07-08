import { describe, expect, it } from "vitest";
import { getWorkflowSetupCopy } from "./generationMode";

describe("getWorkflowSetupCopy", () => {
  it("returns mode-specific setup copy", () => {
    expect(getWorkflowSetupCopy("mock")).toContain("mocked generation");
    expect(getWorkflowSetupCopy("webgpu")).toContain("gated browser model path");
    expect(getWorkflowSetupCopy("ollama")).toContain("Running with Local Ollama");
  });
});

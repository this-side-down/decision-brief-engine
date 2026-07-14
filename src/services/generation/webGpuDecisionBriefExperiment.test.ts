import { afterEach, describe, expect, it } from "vitest";
import {
  isWebGpuMarkdownOnlyExperimentEnabled,
  resolveWebGpuDecisionBriefPromptMode,
  WEBGPU_DECISION_BRIEF_PROMPT_MODE_ENV,
} from "./webGpuDecisionBriefExperiment";

const previous = process.env[WEBGPU_DECISION_BRIEF_PROMPT_MODE_ENV];

afterEach(() => {
  if (previous === undefined) {
    delete process.env[WEBGPU_DECISION_BRIEF_PROMPT_MODE_ENV];
  } else {
    process.env[WEBGPU_DECISION_BRIEF_PROMPT_MODE_ENV] = previous;
  }
});

describe("webGpuDecisionBriefExperiment", () => {
  it("defaults to structured_response production mode", () => {
    delete process.env[WEBGPU_DECISION_BRIEF_PROMPT_MODE_ENV];
    expect(resolveWebGpuDecisionBriefPromptMode()).toBe("structured_response");
    expect(isWebGpuMarkdownOnlyExperimentEnabled()).toBe(false);
  });

  it("enables markdown_only when explicitly configured", () => {
    process.env[WEBGPU_DECISION_BRIEF_PROMPT_MODE_ENV] = "markdown_only";
    expect(resolveWebGpuDecisionBriefPromptMode()).toBe("markdown_only");
    expect(isWebGpuMarkdownOnlyExperimentEnabled()).toBe(true);
  });
});

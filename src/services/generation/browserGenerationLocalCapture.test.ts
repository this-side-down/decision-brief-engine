import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildBrowserGenerationDiagnosticFilename,
  sanitizeBrowserGenerationDiagnosticFilename,
} from "./browserGenerationLocalCapture";
import {
  persistBrowserGenerationDiagnosticArtifactNode,
  writeBrowserGenerationDiagnosticArtifactToDirectory,
} from "./browserGenerationLocalCapture.node";

const previousFlag = process.env.VITE_BROWSER_GENERATION_DIAGNOSTICS;
const tempRoots: string[] = [];

afterEach(() => {
  if (previousFlag === undefined) {
    delete process.env.VITE_BROWSER_GENERATION_DIAGNOSTICS;
  } else {
    process.env.VITE_BROWSER_GENERATION_DIAGNOSTICS = previousFlag;
  }

  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("browserGenerationLocalCapture", () => {
  it("rejects unsafe filenames and path traversal", () => {
    expect(sanitizeBrowserGenerationDiagnosticFilename("../escape.json")).toBeNull();
    expect(sanitizeBrowserGenerationDiagnosticFilename("bad/name.json")).toBeNull();
    expect(sanitizeBrowserGenerationDiagnosticFilename("valid-run.json")).toBe(
      "valid-run.json",
    );
  });

  it("writes artifacts only when the diagnostic flag is enabled", async () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "dbe-diagnostics-"));
    tempRoots.push(repoRoot);
    delete process.env.VITE_BROWSER_GENERATION_DIAGNOSTICS;

    const disabled = await persistBrowserGenerationDiagnosticArtifactNode({
      repoRoot,
      filename: "disabled.json",
      artifact: {
        artifactVersion: 1,
        runTimestamp: "2026-07-14T00:00:00.000Z",
        sourceLabel: null,
        briefTypeId: null,
        configuration: {
          modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
          webLlmVersion: "0.2.84",
          captureSchemaVersion: "capture-layer-v1",
          briefSchemaVersion: "decision-brief-result-v1",
          briefPromptMode: "structured_response",
          configuredMaxTokens: null,
        },
        attempt: {
          generationStage: "brief",
          attemptNumber: 1,
        },
        completion: {
          promptTokens: null,
          completionTokens: null,
          totalTokens: null,
          finishReason: null,
          configuredMaxTokens: null,
          modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
          webLlmVersion: "0.2.84",
          generationStage: "brief",
          attemptNumber: 1,
        },
        rawOutput: '{"markdown":"# Decision Brief"}',
      },
    });

    expect(disabled).toBeNull();
  });

  it("writes first-attempt and retry artifacts to separate files", () => {
    process.env.VITE_BROWSER_GENERATION_DIAGNOSTICS = "true";
    const repoRoot = mkdtempSync(join(tmpdir(), "dbe-diagnostics-"));
    tempRoots.push(repoRoot);

    const firstFilename = buildBrowserGenerationDiagnosticFilename({
      runTimestamp: "2026-07-14T00:00:00.000Z",
      generationStage: "brief",
      attemptNumber: 1,
    });
    const retryFilename = buildBrowserGenerationDiagnosticFilename({
      runTimestamp: "2026-07-14T00:00:00.000Z",
      generationStage: "brief_retry",
      attemptNumber: 2,
    });

    expect(firstFilename).not.toBe(retryFilename);

    const artifact = {
      artifactVersion: 1 as const,
      runTimestamp: "2026-07-14T00:00:00.000Z",
      sourceLabel: "Household Move Planning",
      briefTypeId: "execution",
      configuration: {
        modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        webLlmVersion: "0.2.84",
        captureSchemaVersion: "capture-layer-v1",
        briefSchemaVersion: "decision-brief-result-v1",
        briefPromptMode: "structured_response",
        configuredMaxTokens: null,
      },
      attempt: {
        generationStage: "brief" as const,
        attemptNumber: 1,
      },
      completion: {
        promptTokens: 900,
        completionTokens: 300,
        totalTokens: 1200,
        finishReason: "stop" as const,
        configuredMaxTokens: null,
        modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        webLlmVersion: "0.2.84",
        generationStage: "brief" as const,
        attemptNumber: 1,
      },
      rawOutput: '{"markdown":"first attempt"}',
    };

    const firstPath = writeBrowserGenerationDiagnosticArtifactToDirectory({
      repoRoot,
      filename: firstFilename,
      artifact,
    });
    const retryPath = writeBrowserGenerationDiagnosticArtifactToDirectory({
      repoRoot,
      filename: retryFilename,
      artifact: {
        ...artifact,
        attempt: { generationStage: "brief_retry", attemptNumber: 2 },
        rawOutput: '{"markdown":"retry attempt"}',
      },
    });

    expect(readFileSync(firstPath, "utf8")).toContain("first attempt");
    expect(readFileSync(retryPath, "utf8")).toContain("retry attempt");
  });
});

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadEnv } from "vite";
import { afterEach, describe, expect, it } from "vitest";
import {
  createDiagnosticsMiddleware,
  resolveBrowserGenerationDiagnosticsPluginEnabled,
} from "./vite-plugin-browser-generation-diagnostics";

const ENV_FLAG = "VITE_BROWSER_GENERATION_DIAGNOSTICS";
const tempRoots: string[] = [];
const previousProcessEnv = process.env[ENV_FLAG];

afterEach(() => {
  if (previousProcessEnv === undefined) {
    delete process.env[ENV_FLAG];
  } else {
    process.env[ENV_FLAG] = previousProcessEnv;
  }

  for (const root of tempRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function invokeMiddleware(
  middleware: ReturnType<typeof createDiagnosticsMiddleware>,
  options: {
    method?: string;
    body?: string;
  } = {},
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const request = {
      method: options.method ?? "POST",
      async *[Symbol.asyncIterator]() {
        if (options.body) {
          yield Buffer.from(options.body, "utf8");
        }
      },
    } as IncomingMessage;

    let statusCode = 200;
    let body = "";
    const response = {
      statusCode: 200,
      setHeader() {
        return undefined;
      },
      end(chunk?: string) {
        statusCode = this.statusCode;
        body = chunk ?? "";
        resolve({ statusCode, body });
      },
    } as ServerResponse;

    Object.defineProperty(response, "statusCode", {
      get() {
        return statusCode;
      },
      set(value: number) {
        statusCode = value;
      },
    });

    middleware(request, response, (error?: unknown) => {
      if (error) {
        reject(error);
      } else {
        resolve({ statusCode, body });
      }
    });
  });
}

describe("browserGenerationDiagnosticsPlugin configuration", () => {
  it("disables middleware when the flag is omitted", () => {
    expect(resolveBrowserGenerationDiagnosticsPluginEnabled()).toBe(false);
    expect(resolveBrowserGenerationDiagnosticsPluginEnabled({})).toBe(false);
  });

  it("disables middleware when enabled is false", () => {
    expect(
      resolveBrowserGenerationDiagnosticsPluginEnabled({ enabled: false }),
    ).toBe(false);
  });

  it("enables middleware when enabled is true", () => {
    expect(
      resolveBrowserGenerationDiagnosticsPluginEnabled({ enabled: true }),
    ).toBe(true);
  });

  it("enables middleware from a loadEnv result without mutating process.env", () => {
    const repoRoot = mkdtempSync(join(tmpdir(), "dbe-vite-env-"));
    tempRoots.push(repoRoot);
    writeFileSync(
      join(repoRoot, ".env.local"),
      "VITE_BROWSER_GENERATION_DIAGNOSTICS=true\n",
      "utf8",
    );

    delete process.env[ENV_FLAG];
    const env = loadEnv("development", repoRoot, "");
    const enabled = env.VITE_BROWSER_GENERATION_DIAGNOSTICS === "true";

    expect(process.env[ENV_FLAG]).toBeUndefined();
    expect(enabled).toBe(true);
    expect(resolveBrowserGenerationDiagnosticsPluginEnabled({ enabled })).toBe(
      true,
    );
  });

  it("does not enable middleware from process.env when plugin enabled is false", async () => {
    process.env[ENV_FLAG] = "true";
    const repoRoot = mkdtempSync(join(tmpdir(), "dbe-vite-mw-disabled-"));
    tempRoots.push(repoRoot);

    const result = await invokeMiddleware(
      createDiagnosticsMiddleware(repoRoot, false),
      {
        body: JSON.stringify({
          filename: "should-not-write.json",
          artifact: { artifactVersion: 1 },
        }),
      },
    );

    expect(result.statusCode).toBe(404);
    expect(result.body).toContain("disabled");
  });

  it("writes artifacts when plugin enabled is true even if process.env is unset", async () => {
    delete process.env[ENV_FLAG];
    const repoRoot = mkdtempSync(join(tmpdir(), "dbe-vite-mw-enabled-"));
    tempRoots.push(repoRoot);

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
      rawOutput: '{"markdown":"first attempt household move"}',
    };

    const firstAttempt = await invokeMiddleware(
      createDiagnosticsMiddleware(repoRoot, true),
      {
        body: JSON.stringify({
          filename: "2026-07-14T00-00-00-000Z-brief-attempt-1.json",
          artifact,
        }),
      },
    );
    const retryAttempt = await invokeMiddleware(
      createDiagnosticsMiddleware(repoRoot, true),
      {
        body: JSON.stringify({
          filename: "2026-07-14T00-00-00-000Z-brief_retry-attempt-2.json",
          artifact: {
            ...artifact,
            attempt: { generationStage: "brief_retry", attemptNumber: 2 },
            rawOutput: '{"markdown":"retry attempt household move"}',
          },
        }),
      },
    );

    expect(firstAttempt.statusCode).toBe(200);
    expect(retryAttempt.statusCode).toBe(200);

    const firstPath = JSON.parse(firstAttempt.body).filePath as string;
    const retryPath = JSON.parse(retryAttempt.body).filePath as string;

    expect(readFileSync(firstPath, "utf8")).toContain("first attempt household move");
    expect(readFileSync(retryPath, "utf8")).toContain("retry attempt household move");
  });
});

describe("Household Move Planning Run Details contract", () => {
  it("shows structured diagnostics and concrete findings without raw JSON", async () => {
    const { formatRunDetailsLines } = await import(
      "./src/services/generation/generationRunTelemetry"
    );

    const lines = formatRunDetailsLines({
      runtimeMode: "webgpu",
      runtimeLabel: "Live in browser",
      modelLoadDurationMs: 30_000,
      captureDurationMs: 14_000,
      captureRetryCount: 0,
      captureOutcome: "success",
      captureError: null,
      briefDurationMs: 23_000,
      briefRetryCount: 1,
      briefOutcome: "error",
      briefError:
        "Browser generation returned an incomplete Decision Brief. Try again or use Mock demo.",
      webGpuEval: {
        modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        webLlmVersion: "0.2.84",
        captureSchemaVersion: "capture-layer-v1",
        briefSchemaVersion: "decision-brief-result-v1",
        briefPromptMode: "structured_response",
        captureFirstAttemptSchemaPass: true,
        briefFirstAttemptSchemaPass: true,
        briefFirstAttemptSemanticPass: false,
        briefFirstAttemptPlaceholderLeakage: false,
        briefQualityRetryReasonCategories: [
          "required_sections",
          "decision_trace_readiness",
          "recommendation_alignment",
        ],
        briefQualityFailureCategories: [
          "required_sections",
          "decision_trace_readiness",
        ],
        briefFirstAttemptCompletionDiagnostics: {
          promptTokens: 900,
          completionTokens: 300,
          totalTokens: 1200,
          finishReason: "length",
          configuredMaxTokens: null,
          modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
          webLlmVersion: "0.2.84",
          generationStage: "brief",
          attemptNumber: 1,
        },
        briefFirstAttemptSemanticFindings: {
          missingRequiredSections: ["Summary", "Suggested Next Steps"],
          traceReadinessFailures: [
            {
              id: "next_step_count",
              detail: "1 next_step entries for 3 suggested_next_steps",
            },
          ],
          alignmentFailures: [
            {
              id: "recommendation_alignment",
              detail:
                'Recommendation mismatch — capture="Delay closing until inspection clears" brief="Move immediately" trace="Delay closing until inspection clears"',
            },
          ],
          writingHardFailures: [],
          placeholderFindings: [],
          uncoveredRecommendationStatements: [
            'capture="Delay closing until inspection clears"',
            'brief="Move immediately"',
          ],
          uncoveredNextStepStatements: ["Schedule movers for target weekend"],
        },
        briefQualityFailureFindings: {
          missingRequiredSections: ["Summary"],
          traceReadinessFailures: [
            {
              id: "basis_grounded_in_capture_layer",
              detail:
                '2 basis item(s) not found in the Capture Layer: supporting_evidence: "Invented fact"',
            },
          ],
          alignmentFailures: [],
          writingHardFailures: [],
          placeholderFindings: [],
          uncoveredRecommendationStatements: [],
          uncoveredNextStepStatements: [],
        },
        completionDiagnostics: [],
      },
    });

    const joined = lines.join("\n");
    expect(joined).toContain("Missing required sections:");
    expect(joined).toContain("Decision Trace readiness");
    expect(joined).toContain("Decision Brief first attempt completion:");
    expect(joined).not.toMatch(/\{"markdown"/);
    expect(joined).not.toContain("first attempt household move");
  });
});

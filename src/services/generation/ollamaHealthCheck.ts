import {
  extractOllamaModelText,
  type OllamaGenerateResponse,
} from "./extractOllamaText";
import { getOllamaConfig, type OllamaConfig } from "./ollamaConfig";

export type OllamaHealthCheckId =
  | "config"
  | "endpoint"
  | "model"
  | "smoke_test";

export type OllamaHealthCheckStatus = "pass" | "fail" | "skip";

export type OllamaHealthCheck = {
  id: OllamaHealthCheckId;
  status: OllamaHealthCheckStatus;
  summary: string;
  detail?: string;
  fix?: string;
};

export type OllamaHealthResult = {
  ready: boolean;
  config: OllamaConfig;
  checks: OllamaHealthCheck[];
  reason?: string;
};

type OllamaEnvName =
  | "VITE_OLLAMA_BASE_URL"
  | "VITE_OLLAMA_MODEL"
  | "VITE_OLLAMA_TIMEOUT_MS";

type OllamaTagsResponse = {
  models?: Array<{ name?: string }>;
};

type OllamaVersionResponse = {
  version?: string;
};

const SMOKE_TEST_PROMPT = "Reply with exactly: ok";
const DEFAULT_SMOKE_TEST_TIMEOUT_MS = 30_000;

function readRawEnv(name: OllamaEnvName): string | undefined {
  const viteEnv = import.meta.env as ImportMetaEnv | undefined;
  const viteValue = viteEnv?.[name];
  if (typeof viteValue === "string") {
    return viteValue;
  }

  const nodeProcess = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  const nodeValue = nodeProcess?.env?.[name];
  return typeof nodeValue === "string" ? nodeValue : undefined;
}

function validateConfigValues(): OllamaHealthCheck {
  const issues: string[] = [];
  const fixes: string[] = [];

  const rawBaseUrl = readRawEnv("VITE_OLLAMA_BASE_URL");
  if (rawBaseUrl !== undefined && rawBaseUrl.trim().length === 0) {
    issues.push("VITE_OLLAMA_BASE_URL is set but empty.");
    fixes.push(
      "Set VITE_OLLAMA_BASE_URL to /ollama for Vite dev or http://127.0.0.1:11434 for direct CLI access.",
    );
  }

  const rawModel = readRawEnv("VITE_OLLAMA_MODEL");
  if (rawModel !== undefined && rawModel.trim().length === 0) {
    issues.push("VITE_OLLAMA_MODEL is set but empty.");
    fixes.push("Set VITE_OLLAMA_MODEL to a pulled Ollama model, for example qwen3:4b.");
  }

  const rawTimeout = readRawEnv("VITE_OLLAMA_TIMEOUT_MS");
  if (rawTimeout !== undefined) {
    const trimmed = rawTimeout.trim();
    if (trimmed.length === 0) {
      issues.push("VITE_OLLAMA_TIMEOUT_MS is set but empty.");
      fixes.push("Set VITE_OLLAMA_TIMEOUT_MS to a positive number of milliseconds.");
    } else {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        issues.push(
          `VITE_OLLAMA_TIMEOUT_MS is malformed: "${rawTimeout}".`,
        );
        fixes.push("Use a positive number, for example 120000.");
      }
    }
  }

  if (issues.length > 0) {
    return {
      id: "config",
      status: "fail",
      summary: "Ollama configuration is missing or malformed.",
      detail: issues.join(" "),
      fix: fixes.join(" "),
    };
  }

  const config = getOllamaConfig();

  return {
    id: "config",
    status: "pass",
    summary: "Ollama configuration is valid.",
    detail: `baseUrl=${config.baseUrl}, model=${config.model}, timeoutMs=${config.timeoutMs}`,
  };
}

function classifyFetchFailure(error: unknown, baseUrl: string): {
  summary: string;
  fix: string;
} {
  if (error instanceof Error && error.name === "AbortError") {
    return {
      summary: "Ollama request timed out.",
      fix: "Increase VITE_OLLAMA_TIMEOUT_MS or check whether the model is still loading.",
    };
  }

  const cause = (
    error as { cause?: { code?: string; message?: string } }
  )?.cause;
  const code = cause?.code;
  const message = error instanceof Error ? error.message : String(error);

  if (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    /fetch failed/i.test(message)
  ) {
    return {
      summary: "Ollama endpoint is not reachable.",
      fix: `Start Ollama and confirm it listens at ${baseUrl}. For Vite dev, verify VITE_OLLAMA_HOST points at the running Ollama instance.`,
    };
  }

  return {
    summary: "Ollama endpoint is not reachable.",
    fix: `Verify VITE_OLLAMA_BASE_URL (${baseUrl}) and that Ollama is running.`,
  };
}

function isModelAvailable(
  configuredModel: string,
  availableModels: string[],
): boolean {
  if (availableModels.includes(configuredModel)) {
    return true;
  }

  const withoutTag = configuredModel.split(":")[0];
  return availableModels.some(
    (name) => name === configuredModel || name.startsWith(`${withoutTag}:`),
  );
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetchFn: typeof fetch,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchFn(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkEndpointReachable(
  config: OllamaConfig,
  fetchFn: typeof fetch,
): Promise<OllamaHealthCheck> {
  try {
    const response = await fetchWithTimeout(
      `${config.baseUrl}/api/version`,
      { method: "GET" },
      Math.min(config.timeoutMs, 10_000),
      fetchFn,
    );

    if (!response.ok) {
      return {
        id: "endpoint",
        status: "fail",
        summary: "Ollama endpoint returned an error.",
        detail: `GET /api/version failed with HTTP ${response.status}.`,
        fix: `Check VITE_OLLAMA_BASE_URL (${config.baseUrl}) and VITE_OLLAMA_HOST for Vite proxy setups.`,
      };
    }

    const payload = (await response.json()) as OllamaVersionResponse;
    const version = payload.version?.trim();

    return {
      id: "endpoint",
      status: "pass",
      summary: "Ollama endpoint is reachable.",
      detail: version ? `Ollama version ${version}` : undefined,
    };
  } catch (error) {
    const classified = classifyFetchFailure(error, config.baseUrl);

    return {
      id: "endpoint",
      status: "fail",
      summary: classified.summary,
      detail: error instanceof Error ? error.message : String(error),
      fix: classified.fix,
    };
  }
}

async function checkModelAvailable(
  config: OllamaConfig,
  fetchFn: typeof fetch,
): Promise<OllamaHealthCheck> {
  try {
    const response = await fetchWithTimeout(
      `${config.baseUrl}/api/tags`,
      { method: "GET" },
      Math.min(config.timeoutMs, 10_000),
      fetchFn,
    );

    if (!response.ok) {
      return {
        id: "model",
        status: "fail",
        summary: "Could not list Ollama models.",
        detail: `GET /api/tags failed with HTTP ${response.status}.`,
        fix: "Confirm Ollama is running and the configured endpoint is correct.",
      };
    }

    const payload = (await response.json()) as OllamaTagsResponse;
    const availableModels = (payload.models ?? [])
      .map((model) => model.name?.trim())
      .filter((name): name is string => Boolean(name));

    if (isModelAvailable(config.model, availableModels)) {
      return {
        id: "model",
        status: "pass",
        summary: `Configured model "${config.model}" is available.`,
      };
    }

    return {
      id: "model",
      status: "fail",
      summary: `Configured model "${config.model}" is not available.`,
      detail:
        availableModels.length > 0
          ? `Available models: ${availableModels.join(", ")}`
          : "No models are installed in Ollama.",
      fix: `Pull the model with: ollama pull ${config.model}`,
    };
  } catch (error) {
    const classified = classifyFetchFailure(error, config.baseUrl);

    return {
      id: "model",
      status: "fail",
      summary: "Could not verify model availability.",
      detail: error instanceof Error ? error.message : String(error),
      fix: classified.fix,
    };
  }
}

async function checkSmokeTest(
  config: OllamaConfig,
  fetchFn: typeof fetch,
  smokeTestTimeoutMs: number,
): Promise<OllamaHealthCheck> {
  try {
    const response = await fetchWithTimeout(
      `${config.baseUrl}/api/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          prompt: SMOKE_TEST_PROMPT,
          stream: false,
        }),
      },
      smokeTestTimeoutMs,
      fetchFn,
    );

    if (!response.ok) {
      return {
        id: "smoke_test",
        status: "fail",
        summary: "Ollama generation smoke test failed.",
        detail: `POST /api/generate failed with HTTP ${response.status}.`,
        fix: "Confirm the configured model is pulled and Ollama can serve requests.",
      };
    }

    let payload: OllamaGenerateResponse;

    try {
      payload = (await response.json()) as OllamaGenerateResponse;
    } catch {
      return {
        id: "smoke_test",
        status: "fail",
        summary: "Ollama returned an invalid response.",
        detail: "POST /api/generate did not return valid JSON.",
        fix: "Retry after confirming Ollama is healthy with `ollama list` and `ollama run <model>`.",
      };
    }

    try {
      const text = extractOllamaModelText(payload);
      return {
        id: "smoke_test",
        status: "pass",
        summary: "Ollama generation smoke test succeeded.",
        detail: `Model returned ${text.length} characters of output.`,
      };
    } catch (error) {
      return {
        id: "smoke_test",
        status: "fail",
        summary: "Ollama returned an invalid response.",
        detail:
          error instanceof Error ? error.message : "Empty model output fields.",
        fix: "Try the model directly with `ollama run` or pull a fresh copy of the model.",
      };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        id: "smoke_test",
        status: "fail",
        summary: "Ollama generation timed out.",
        detail: `Smoke test exceeded ${smokeTestTimeoutMs}ms.`,
        fix: "Increase VITE_OLLAMA_TIMEOUT_MS or wait for the model to finish loading, then retry.",
      };
    }

    const classified = classifyFetchFailure(error, config.baseUrl);

    return {
      id: "smoke_test",
      status: "fail",
      summary: "Ollama generation smoke test failed.",
      detail: error instanceof Error ? error.message : String(error),
      fix: classified.fix,
    };
  }
}

function skipCheck(
  id: Exclude<OllamaHealthCheckId, "config">,
  reason: string,
): OllamaHealthCheck {
  return {
    id,
    status: "skip",
    summary: reason,
  };
}

function primaryFailureReason(checks: OllamaHealthCheck[]): string | undefined {
  const failed = checks.find((check) => check.status === "fail");
  if (!failed) {
    return undefined;
  }

  return failed.fix ?? failed.summary;
}

export async function runOllamaHealthCheck(options?: {
  smokeTest?: boolean;
  smokeTestTimeoutMs?: number;
  fetchFn?: typeof fetch;
}): Promise<OllamaHealthResult> {
  const fetchFn = options?.fetchFn ?? fetch;
  const runSmokeTest = options?.smokeTest ?? true;
  const smokeTestTimeoutMs =
    options?.smokeTestTimeoutMs ?? DEFAULT_SMOKE_TEST_TIMEOUT_MS;

  const configCheck = validateConfigValues();
  const checks: OllamaHealthCheck[] = [configCheck];

  if (configCheck.status !== "pass") {
    checks.push(
      skipCheck("endpoint", "Skipped because configuration is invalid."),
      skipCheck("model", "Skipped because configuration is invalid."),
      skipCheck("smoke_test", "Skipped because configuration is invalid."),
    );

    return {
      ready: false,
      config: getOllamaConfig(),
      checks,
      reason: primaryFailureReason(checks),
    };
  }

  const config = getOllamaConfig();
  const endpointCheck = await checkEndpointReachable(config, fetchFn);
  checks.push(endpointCheck);

  if (endpointCheck.status !== "pass") {
    checks.push(
      skipCheck("model", "Skipped because the endpoint is unreachable."),
      skipCheck("smoke_test", "Skipped because the endpoint is unreachable."),
    );

    return {
      ready: false,
      config,
      checks,
      reason: primaryFailureReason(checks),
    };
  }

  const modelCheck = await checkModelAvailable(config, fetchFn);
  checks.push(modelCheck);

  if (modelCheck.status !== "pass") {
    checks.push(
      skipCheck("smoke_test", "Skipped because the configured model is unavailable."),
    );

    return {
      ready: false,
      config,
      checks,
      reason: primaryFailureReason(checks),
    };
  }

  if (!runSmokeTest) {
    checks.push(
      skipCheck("smoke_test", "Smoke test skipped by caller."),
    );

    return {
      ready: true,
      config,
      checks,
    };
  }

  const smokeCheck = await checkSmokeTest(config, fetchFn, smokeTestTimeoutMs);
  checks.push(smokeCheck);

  return {
    ready: smokeCheck.status === "pass",
    config,
    checks,
    reason: primaryFailureReason(checks),
  };
}

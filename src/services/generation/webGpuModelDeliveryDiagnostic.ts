import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  DEFAULT_WEBGPU_MODEL_ID,
  getWebGpuConfig,
} from "./webGpuConfig";

export const COMPARISON_WEBGPU_MODEL_ID =
  "Llama-3.2-1B-Instruct-q4f16_1-MLC";

export const DEFAULT_SHARD_FILENAME = "params_shard_0.bin";

export type WebGpuModelRecord = {
  model: string;
  model_id: string;
  model_lib: string;
};

export type ModelDeliveryProbe = {
  modelId: string;
  modelUrl: string;
  modelLibUrl: string;
  initialShardUrl: string;
  initialStatus: number;
  redirectHost: string | null;
  signedUrlStatus: number | null;
  directFetchStatus: number;
  directFetchOk: boolean;
  cacheAddTestSkipped: boolean;
  cacheAddTestNote: string;
};

export type WebGpuDeliveryRootCauseCategory =
  | "outdated_record"
  | "obsolete_model"
  | "cache_api"
  | "upstream_delivery"
  | "model_specific_upstream"
  | "environment_wide_upstream";

export type WebGpuModelDeliveryDiagnosticResult = {
  webLlmVersion: string;
  cacheBackend: string;
  selectedModelId: string;
  comparisonModelId: string;
  probes: ModelDeliveryProbe[];
  rootCause: string;
  rootCauseCategory: WebGpuDeliveryRootCauseCategory;
  recommendation: string;
};

type FetchLike = typeof fetch;

const require = createRequire(import.meta.url);

export function redactUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = parsed.search ? "?[redacted]" : "";
    return parsed.toString();
  } catch {
    return url.split("?")[0] ?? url;
  }
}

export function getInstalledWebLlmVersion(): string {
  const packageJsonPath = require.resolve("@mlc-ai/web-llm/package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    version?: string;
  };

  if (!packageJson.version) {
    throw new Error("Unable to read @mlc-ai/web-llm package version.");
  }

  return packageJson.version;
}

export async function loadPrebuiltAppConfig(): Promise<{
  model_list: WebGpuModelRecord[];
  cacheBackend?: string;
}> {
  const webllm = await import("@mlc-ai/web-llm");
  return webllm.prebuiltAppConfig;
}

export function resolveCacheBackend(
  appConfig: { cacheBackend?: string },
): string {
  return appConfig.cacheBackend ?? "cache";
}

export function findPrebuiltModelRecord(
  modelId: string,
  appConfig: { model_list: WebGpuModelRecord[] },
): WebGpuModelRecord {
  const record = appConfig.model_list.find((item) => item.model_id === modelId);

  if (!record) {
    throw new Error(`Model record not found in prebuilt WebLLM app config: ${modelId}`);
  }

  return record;
}

export function buildShardUrl(modelUrl: string, shardFilename = DEFAULT_SHARD_FILENAME): string {
  const normalized = modelUrl.endsWith("/") ? modelUrl : `${modelUrl}/`;
  return new URL(`resolve/main/${shardFilename}`, normalized).href;
}

export async function probeModelShardDelivery(
  record: WebGpuModelRecord,
  fetchImpl: FetchLike = fetch,
): Promise<ModelDeliveryProbe> {
  const initialShardUrl = buildShardUrl(record.model);
  const initialResponse = await fetchImpl(initialShardUrl, {
    redirect: "manual",
    headers: {
      "User-Agent": "decision-brief-engine/webgpu-model-delivery-diagnostic",
    },
  });

  const redirectLocation = initialResponse.headers.get("location");
  let redirectHost: string | null = null;
  let signedUrlStatus: number | null = null;

  if (redirectLocation) {
    try {
      redirectHost = new URL(redirectLocation).host;
    } catch {
      redirectHost = null;
    }

    const signedResponse = await fetchImpl(redirectLocation, {
      redirect: "manual",
      headers: {
        "User-Agent": "decision-brief-engine/webgpu-model-delivery-diagnostic",
        Range: "bytes=0-1023",
      },
    });
    signedUrlStatus = signedResponse.status;
  }

  const directResponse = await fetchImpl(initialShardUrl, {
    headers: {
      "User-Agent": "decision-brief-engine/webgpu-model-delivery-diagnostic",
      Range: "bytes=0-1023",
    },
  });

  const directFetchOk = directResponse.ok;
  const cacheAddTestSkipped = !directFetchOk;
  const cacheAddTestNote = directFetchOk
    ? "Direct fetch succeeded; run Cache.add verification in a browser context to isolate Cache API storage."
    : "Skipped Cache.add isolation because direct shard fetch failed; WebLLM Cache.add errors are downstream of the failed network response.";

  return {
    modelId: record.model_id,
    modelUrl: record.model,
    modelLibUrl: record.model_lib,
    initialShardUrl,
    initialStatus: initialResponse.status,
    redirectHost,
    signedUrlStatus,
    directFetchStatus: directResponse.status,
    directFetchOk,
    cacheAddTestSkipped,
    cacheAddTestNote,
  };
}

export function classifyDeliveryRootCause(
  probes: ModelDeliveryProbe[],
): Pick<WebGpuModelDeliveryDiagnosticResult, "rootCause" | "rootCauseCategory" | "recommendation"> {
  if (probes.length === 0) {
    return {
      rootCauseCategory: "upstream_delivery",
      rootCause:
        "No model delivery probes were recorded.",
      recommendation:
        "Re-run the diagnostic harness before changing browser inference configuration.",
    };
  }

  const allDirectFetchFailed = probes.every((probe) => !probe.directFetchOk);
  const allSigned403 = probes.every((probe) => probe.signedUrlStatus === 403);
  const allXetRedirect = probes.every(
    (probe) => probe.redirectHost === "cas-bridge.xethub.hf.co",
  );

  if (allDirectFetchFailed && allSigned403 && allXetRedirect && probes.length > 1) {
    return {
      rootCauseCategory: "environment_wide_upstream",
      rootCause:
        "Large WebLLM shard downloads redirect to Hugging Face Xet (`cas-bridge.xethub.hf.co`) and the signed follow-up requests return HTTP 403 before any browser Cache API storage runs. The installed WebLLM model records and small artifact URLs remain valid; the failure is upstream shard delivery, not an outdated app model record or Cache backend selection.",
      recommendation:
        "Do not change the product model, cache backend, or WebLLM package version for this symptom. Track upstream Hugging Face / Xet delivery recovery, then rerun W3 manual validation.",
    };
  }

  if (allDirectFetchFailed && allSigned403 && probes.length === 1) {
    return {
      rootCauseCategory: "model_specific_upstream",
      rootCause:
        "The selected model shard download redirects to Hugging Face Xet and the signed follow-up request returns HTTP 403. Compare against a second supported WebLLM model before changing the configured model ID.",
      recommendation:
        "Run the diagnostic harness with a comparison model. If only one model fails, evaluate an equivalent supported replacement after schema compatibility checks.",
    };
  }

  if (probes.some((probe) => probe.directFetchOk && probe.cacheAddTestSkipped === false)) {
    return {
      rootCauseCategory: "cache_api",
      rootCause:
        "Direct shard fetch succeeded for at least one probe; investigate WebLLM cache backend behavior separately from network delivery.",
      recommendation:
        "Test a supported WebLLM cache backend only after confirming direct shard fetch succeeds without 403 responses.",
    };
  }

  return {
    rootCauseCategory: "upstream_delivery",
    rootCause:
      "Model shard delivery failed before WebLLM could cache weights. Review probe statuses and signed redirect hosts for the selected and comparison models.",
    recommendation:
      "Use the diagnostic report to determine whether the failure is model-specific or environment-wide before changing production configuration.",
  };
}

export async function runWebGpuModelDeliveryDiagnostic(options?: {
  selectedModelId?: string;
  comparisonModelId?: string;
  fetchImpl?: FetchLike;
}): Promise<WebGpuModelDeliveryDiagnosticResult> {
  const config = getWebGpuConfig();
  const selectedModelId = options?.selectedModelId ?? config.modelId;
  const comparisonModelId =
    options?.comparisonModelId ?? COMPARISON_WEBGPU_MODEL_ID;
  const appConfig = await loadPrebuiltAppConfig();
  const selectedRecord = findPrebuiltModelRecord(selectedModelId, appConfig);
  const comparisonRecord = findPrebuiltModelRecord(comparisonModelId, appConfig);
  const fetchImpl = options?.fetchImpl ?? fetch;

  const probes = await Promise.all([
    probeModelShardDelivery(selectedRecord, fetchImpl),
    probeModelShardDelivery(comparisonRecord, fetchImpl),
  ]);

  const classification = classifyDeliveryRootCause(probes);

  return {
    webLlmVersion: getInstalledWebLlmVersion(),
    cacheBackend: resolveCacheBackend(appConfig),
    selectedModelId,
    comparisonModelId,
    probes,
    ...classification,
  };
}

export function formatWebGpuModelDeliveryDiagnostic(
  result: WebGpuModelDeliveryDiagnosticResult,
): string {
  const lines = [
    "WebGPU model delivery diagnostic",
    "",
    "Environment:",
    `  WebLLM version: ${result.webLlmVersion}`,
    `  cache backend:  ${result.cacheBackend}`,
    `  selected model: ${result.selectedModelId}`,
    `  comparison:     ${result.comparisonModelId}`,
    "",
    "Probes:",
  ];

  for (const probe of result.probes) {
    lines.push(
      `  [${probe.modelId}]`,
      `    model URL:           ${probe.modelUrl}`,
      `    model_lib URL:       ${probe.modelLibUrl}`,
      `    initial shard URL:   ${redactUrlForLog(probe.initialShardUrl)}`,
      `    initial status:      ${probe.initialStatus}`,
      `    redirect host:       ${probe.redirectHost ?? "none"}`,
      `    signed URL status:   ${probe.signedUrlStatus ?? "n/a"}`,
      `    direct fetch status: ${probe.directFetchStatus}`,
      `    direct fetch ok:     ${probe.directFetchOk ? "yes" : "no"}`,
      `    Cache.add note:      ${probe.cacheAddTestNote}`,
      "",
    );
  }

  lines.push(
    `Root cause category: ${result.rootCauseCategory}`,
    `Root cause: ${result.rootCause}`,
    `Recommendation: ${result.recommendation}`,
  );

  return lines.join("\n");
}

export function serializeWebGpuModelDeliveryDiagnostic(
  result: WebGpuModelDeliveryDiagnosticResult,
): Record<string, unknown> {
  return {
    webLlmVersion: result.webLlmVersion,
    cacheBackend: result.cacheBackend,
    selectedModelId: result.selectedModelId,
    comparisonModelId: result.comparisonModelId,
    rootCauseCategory: result.rootCauseCategory,
    rootCause: result.rootCause,
    recommendation: result.recommendation,
    probes: result.probes.map((probe) => ({
      ...probe,
      initialShardUrl: redactUrlForLog(probe.initialShardUrl),
    })),
  };
}
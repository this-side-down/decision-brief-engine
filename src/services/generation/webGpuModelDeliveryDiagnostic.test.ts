import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  COMPARISON_WEBGPU_MODEL_ID,
  DEFAULT_SHARD_FILENAME,
  buildShardUrl,
  classifyDeliveryRootCause,
  findPrebuiltModelRecord,
  getInstalledWebLlmVersion,
  loadPrebuiltAppConfig,
  probeModelShardDelivery,
  redactUrlForLog,
  resolveCacheBackend,
  runWebGpuModelDeliveryDiagnostic,
  serializeWebGpuModelDeliveryDiagnostic,
} from "./webGpuModelDeliveryDiagnostic";
import { DEFAULT_WEBGPU_MODEL_ID } from "./webGpuConfig";

describe("webGpuModelDeliveryDiagnostic", () => {
  it("redacts signed URL query parameters from diagnostic output", () => {
    expect(
      redactUrlForLog(
        "https://cas-bridge.xethub.hf.co/xet-bridge-us/abc/params_shard_0.bin?token=secret&Expires=1",
      ),
    ).toBe("https://cas-bridge.xethub.hf.co/xet-bridge-us/abc/params_shard_0.bin?[redacted]");
  });

  it("builds the expected Hugging Face shard URL for a model record", () => {
    expect(
      buildShardUrl(
        "https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
      ),
    ).toBe(
      "https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_0.bin",
    );
    expect(DEFAULT_SHARD_FILENAME).toBe("params_shard_0.bin");
  });

  it("reads the installed WebLLM package version", () => {
    expect(getInstalledWebLlmVersion()).toBe("0.2.84");
  });

  it("resolves the default selected model record from the installed prebuilt app config", async () => {
    const appConfig = await loadPrebuiltAppConfig();
    const record = findPrebuiltModelRecord(DEFAULT_WEBGPU_MODEL_ID, appConfig);

    expect(record.model).toBe(
      "https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
    );
    expect(record.model_lib).toContain(
      "Qwen2-1.5B-Instruct-q4f16_1_cs1k-webgpu.wasm",
    );
    expect(resolveCacheBackend(appConfig)).toBe("cache");
  });

  it("resolves the comparison model record from the installed prebuilt app config", async () => {
    const appConfig = await loadPrebuiltAppConfig();
    const record = findPrebuiltModelRecord(COMPARISON_WEBGPU_MODEL_ID, appConfig);

    expect(record.model).toBe(
      "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC",
    );
  });

  it("classifies environment-wide Xet 403 delivery as upstream, not cache API", () => {
    const classification = classifyDeliveryRootCause([
      {
        modelId: DEFAULT_WEBGPU_MODEL_ID,
        modelUrl: "https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        modelLibUrl: "https://example.com/model.wasm",
        initialShardUrl: "https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_0.bin",
        initialStatus: 302,
        redirectHost: "cas-bridge.xethub.hf.co",
        signedUrlStatus: 403,
        directFetchStatus: 403,
        directFetchOk: false,
        cacheAddTestSkipped: true,
        cacheAddTestNote: "Skipped",
      },
      {
        modelId: COMPARISON_WEBGPU_MODEL_ID,
        modelUrl: "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC",
        modelLibUrl: "https://example.com/model.wasm",
        initialShardUrl: "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC/resolve/main/params_shard_0.bin",
        initialStatus: 302,
        redirectHost: "cas-bridge.xethub.hf.co",
        signedUrlStatus: 403,
        directFetchStatus: 403,
        directFetchOk: false,
        cacheAddTestSkipped: true,
        cacheAddTestNote: "Skipped",
      },
    ]);

    expect(classification.rootCauseCategory).toBe("environment_wide_upstream");
    expect(classification.rootCause).toContain("403");
    expect(classification.recommendation).toContain("upstream");
  });

  it("does not emit signed URL query parameters in serialized diagnostics", async () => {
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("cas-bridge.xethub.hf.co")) {
        return new Response(null, { status: 403 });
      }

      if (init?.redirect === "manual" && url.includes("params_shard_0.bin")) {
        return new Response(null, {
          status: 302,
          headers: {
            location:
              "https://cas-bridge.xethub.hf.co/xet-bridge-us/shard/params_shard_0.bin?token=secret",
          },
        });
      }

      return new Response(null, { status: 403 });
    };

    const result = await runWebGpuModelDeliveryDiagnostic({ fetchImpl });
    const serialized = JSON.stringify(
      serializeWebGpuModelDeliveryDiagnostic(result),
    );

    expect(serialized).not.toContain("token=secret");
    expect(result.rootCauseCategory).toBe("environment_wide_upstream");
  });

  it("records cache-add isolation guidance when direct fetch fails", async () => {
    const fetchImpl = async () => new Response(null, { status: 403 });
    const probe = await probeModelShardDelivery(
      {
        model_id: DEFAULT_WEBGPU_MODEL_ID,
        model: "https://huggingface.co/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC",
        model_lib: "https://example.com/model.wasm",
      },
      fetchImpl,
    );

    expect(probe.directFetchOk).toBe(false);
    expect(probe.cacheAddTestSkipped).toBe(true);
    expect(probe.cacheAddTestNote).toContain("Cache.add");
  });

  it("keeps the default WebGPU model ID aligned with the W3 investigation target", () => {
    expect(DEFAULT_WEBGPU_MODEL_ID).toBe("Qwen2.5-1.5B-Instruct-q4f16_1-MLC");
    expect(readFileSync(
      new URL("../../../node_modules/@mlc-ai/web-llm/package.json", import.meta.url),
      "utf8",
    )).toContain('"version": "0.2.84"');
  });
});

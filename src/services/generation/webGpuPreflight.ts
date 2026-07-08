export type PreflightResult = {
  supported: boolean;
  reason?: string;
};

async function checkWebGpuSupport(): Promise<string | null> {
  if (typeof navigator === "undefined" || !("gpu" in navigator) || !navigator.gpu) {
    return "This browser does not expose WebGPU.";
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) {
      return "WebGPU is unavailable on this device.";
    }
  } catch {
    return "WebGPU could not be initialized on this device.";
  }

  return null;
}

async function checkStorageAvailability(): Promise<string | null> {
  if (typeof indexedDB === "undefined") {
    return "IndexedDB is unavailable, so the model cannot be cached in this browser.";
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("webllm-test");

      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("IndexedDB blocked"));
      request.onsuccess = () => {
        request.result.close();
        indexedDB.deleteDatabase("webllm-test");
        resolve();
      };
    });
  } catch {
    return "Browser storage is unavailable for model caching.";
  }

  if ("storage" in navigator && "estimate" in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota ?? 0;

      if (quota > 0 && quota < 500 * 1024 * 1024) {
        return "Browser storage quota looks too small for the model download.";
      }
    } catch {
      return null;
    }
  }

  return null;
}

function checkNetworkAvailability(requireNetwork: boolean): string | null {
  if (!requireNetwork) {
    return null;
  }

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "An internet connection is required for the first model download.";
  }

  return null;
}

export async function runWebGpuPreflight(options?: {
  requireNetwork?: boolean;
}): Promise<PreflightResult> {
  const webGpuIssue = await checkWebGpuSupport();

  if (webGpuIssue) {
    return {
      supported: false,
      reason: webGpuIssue,
    };
  }

  const storageIssue = await checkStorageAvailability();

  if (storageIssue) {
    return {
      supported: false,
      reason: storageIssue,
    };
  }

  const networkIssue = checkNetworkAvailability(options?.requireNetwork ?? false);

  if (networkIssue) {
    return {
      supported: false,
      reason: networkIssue,
    };
  }

  return { supported: true };
}

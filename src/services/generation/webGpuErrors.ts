export class WebGpuInferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebGpuInferenceError";
  }
}

export class BrowserUnsupportedError extends WebGpuInferenceError {
  constructor(message = "Live in browser is not available here.") {
    super(message);
    this.name = "BrowserUnsupportedError";
  }
}

export class ModelDownloadFailedError extends WebGpuInferenceError {
  constructor(
    message = "Model download failed. Check your connection and try again.",
  ) {
    super(message);
    this.name = "ModelDownloadFailedError";
  }
}

export class ModelLoadCancelledError extends WebGpuInferenceError {
  constructor(message = "Model download cancelled.") {
    super(message);
    this.name = "ModelLoadCancelledError";
  }
}

export class ModelLoadTimeoutError extends WebGpuInferenceError {
  constructor(
    message = "Model load timed out. Try again on a stable connection.",
  ) {
    super(message);
    this.name = "ModelLoadTimeoutError";
  }
}

export class GenerationCancelledError extends WebGpuInferenceError {
  constructor(message = "Generation cancelled.") {
    super(message);
    this.name = "GenerationCancelledError";
  }
}

export class InsufficientMemoryError extends WebGpuInferenceError {
  constructor(
    message = "This device may not have enough memory for live browser generation.",
  ) {
    super(message);
    this.name = "InsufficientMemoryError";
  }
}

export class StorageQuotaError extends WebGpuInferenceError {
  constructor(
    message = "Browser storage is full. Clear site data or free space, then try again.",
  ) {
    super(message);
    this.name = "StorageQuotaError";
  }
}

export class GenerationQualityError extends WebGpuInferenceError {
  readonly failureCategories: readonly string[];

  constructor(
    message = "Browser generation returned an incomplete Decision Brief. Try again or use Mock demo.",
    failureCategories: readonly string[] = [],
  ) {
    super(message);
    this.name = "GenerationQualityError";
    this.failureCategories = failureCategories;
  }
}

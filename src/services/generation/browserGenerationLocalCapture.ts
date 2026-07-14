import {
  BROWSER_GENERATION_DIAGNOSTICS_DIR,
  type BrowserGenerationRawCaptureArtifact,
  isBrowserGenerationDiagnosticsEnabled,
} from "./browserGenerationDiagnostics";

export const BROWSER_GENERATION_DIAGNOSTICS_WRITE_PATH =
  "/__browser-generation-diagnostics/write";

const SAFE_FILENAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function sanitizeBrowserGenerationDiagnosticFilename(
  filename: string,
): string | null {
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return null;
  }

  const base = filename.trim();
  if (!base || !SAFE_FILENAME_PATTERN.test(base)) {
    return null;
  }

  return base;
}

export function buildBrowserGenerationDiagnosticFilename(options: {
  runTimestamp: string;
  generationStage: string;
  attemptNumber: number;
}): string {
  const safeTimestamp = options.runTimestamp.replace(/[:.]/g, "-");
  return `${safeTimestamp}-${options.generationStage}-attempt-${options.attemptNumber}.json`;
}

export async function persistBrowserGenerationDiagnosticArtifact(options: {
  filename: string;
  artifact: BrowserGenerationRawCaptureArtifact;
}): Promise<string | null> {
  if (!isBrowserGenerationDiagnosticsEnabled()) {
    return null;
  }

  const safeFilename = sanitizeBrowserGenerationDiagnosticFilename(
    options.filename,
  );
  if (!safeFilename) {
    return null;
  }

  if (typeof window === "undefined") {
    return null;
  }

  try {
    const response = await fetch(BROWSER_GENERATION_DIAGNOSTICS_WRITE_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: safeFilename,
        artifact: options.artifact,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { filePath?: string };
    return typeof payload.filePath === "string" ? payload.filePath : safeFilename;
  } catch {
    return null;
  }
}

export { BROWSER_GENERATION_DIAGNOSTICS_DIR };

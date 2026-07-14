import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { BrowserGenerationRawCaptureArtifact } from "./browserGenerationDiagnostics";
import {
  BROWSER_GENERATION_DIAGNOSTICS_DIR,
  buildBrowserGenerationDiagnosticFilename,
  sanitizeBrowserGenerationDiagnosticFilename,
} from "./browserGenerationLocalCapture";

export {
  buildBrowserGenerationDiagnosticFilename,
  sanitizeBrowserGenerationDiagnosticFilename,
};

export function resolveBrowserGenerationDiagnosticsDirectory(
  repoRoot: string,
): string {
  return resolve(repoRoot, BROWSER_GENERATION_DIAGNOSTICS_DIR);
}

export function writeBrowserGenerationDiagnosticArtifactToDirectory(options: {
  repoRoot: string;
  filename: string;
  artifact: BrowserGenerationRawCaptureArtifact;
}): string {
  const safeFilename = sanitizeBrowserGenerationDiagnosticFilename(
    options.filename,
  );
  if (!safeFilename) {
    throw new Error("Unsafe browser generation diagnostic filename.");
  }

  const directory = resolveBrowserGenerationDiagnosticsDirectory(options.repoRoot);
  mkdirSync(directory, { recursive: true });
  const filePath = join(directory, safeFilename);
  writeFileSync(filePath, `${JSON.stringify(options.artifact, null, 2)}\n`, "utf8");
  return filePath;
}

export async function persistBrowserGenerationDiagnosticArtifactNode(options: {
  repoRoot: string;
  filename: string;
  artifact: BrowserGenerationRawCaptureArtifact;
}): Promise<string | null> {
  const { isBrowserGenerationDiagnosticsEnabled } = await import(
    "./browserGenerationDiagnostics"
  );

  if (!isBrowserGenerationDiagnosticsEnabled()) {
    return null;
  }

  return writeBrowserGenerationDiagnosticArtifactToDirectory(options);
}

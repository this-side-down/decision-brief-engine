import { parseDemoExampleId } from "../data/demoExamples";
import type { BriefTypeId } from "../types/brief";

export type CopyMarkdownMethod = "clipboard-api" | "exec-command";

export type CopyMarkdownResult =
  | { ok: true; method: CopyMarkdownMethod }
  | { ok: false; errorMessage: string };

export type DownloadMarkdownResult =
  | { ok: true; filename: string }
  | { ok: false; errorMessage: string };

export function resolveDecisionBriefFilename(options: {
  sourceLabel?: string;
  briefTypeId?: BriefTypeId | "";
}): string {
  const exampleId = parseDemoExampleId(options.sourceLabel);
  if (exampleId) {
    return `decision-brief-${exampleId}.md`;
  }

  if (options.briefTypeId) {
    return `decision-brief-${options.briefTypeId}.md`;
  }

  return "decision-brief.md";
}

export async function copyMarkdownToClipboard(
  markdown: string,
): Promise<CopyMarkdownResult> {
  if (!markdown.trim()) {
    return { ok: false, errorMessage: "Nothing to copy yet." };
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(markdown);
      return { ok: true, method: "clipboard-api" };
    } catch {
      // Fall through to execCommand fallback.
    }
  }

  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = markdown;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();

      if (copied) {
        return { ok: true, method: "exec-command" };
      }
    } catch {
      // Fall through to manual-copy guidance.
    }
  }

  return {
    ok: false,
    errorMessage:
      "Could not copy automatically. Select the Decision Brief in the editor and use your browser's copy command.",
  };
}

export function downloadMarkdownFile(
  markdown: string,
  filename: string,
): DownloadMarkdownResult {
  if (!markdown.trim()) {
    return { ok: false, errorMessage: "Nothing to download yet." };
  }

  if (typeof document === "undefined") {
    return { ok: false, errorMessage: "Download is not available here." };
  }

  try {
    const blob = new Blob([markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return { ok: true, filename };
  } catch {
    return {
      ok: false,
      errorMessage:
        "Unable to download Markdown. Try copying the reviewed text instead.",
    };
  }
}

export function formatCopySuccessMessage(method: CopyMarkdownMethod): string {
  if (method === "exec-command") {
    return "Copied Decision Brief to clipboard using a browser fallback.";
  }

  return "Copied Decision Brief to clipboard.";
}

export function formatDownloadSuccessMessage(filename: string): string {
  return `Downloaded ${filename}.`;
}

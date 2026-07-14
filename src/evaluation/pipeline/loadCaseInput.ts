import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PipelineEvalCase } from "./cases";

export type LoadedPipelineCaseInput = {
  rawInputText: string;
  briefTypeId: PipelineEvalCase["briefTypeId"];
  sourceLabel: string;
};

function extractSection(markdown: string, heading: string): string | null {
  const pattern = new RegExp(
    `##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`,
    "i",
  );
  const match = markdown.match(pattern);
  return match ? match[1].trim() : null;
}

function parseBriefTypeId(value: string): PipelineEvalCase["briefTypeId"] {
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("product")) {
    return "product";
  }
  if (normalized.startsWith("strategy")) {
    return "strategy";
  }
  if (normalized.startsWith("execution")) {
    return "execution";
  }
  throw new Error(`Unsupported target brief type: ${value}`);
}

/**
 * Evaluation-only adapter: loads raw notes + brief type from an evaluation
 * fixture markdown without modifying product fixtures.
 */
export function loadEvaluationFixtureInput(
  fixtureDocPath: string,
  repoRoot: string,
): { rawInputText: string; briefTypeId: PipelineEvalCase["briefTypeId"] } {
  const absolutePath = resolve(repoRoot, fixtureDocPath);
  const markdown = readFileSync(absolutePath, "utf8");
  const briefTypeSection = extractSection(markdown, "Target brief type");
  if (!briefTypeSection) {
    throw new Error(`Missing "## Target brief type" in ${fixtureDocPath}`);
  }

  const briefTypeId = parseBriefTypeId(briefTypeSection.split("\n")[0] ?? "");
  const rawInputSection = extractSection(markdown, "Raw input");
  if (!rawInputSection) {
    throw new Error(`Missing "## Raw input" in ${fixtureDocPath}`);
  }

  const externalPathMatch = rawInputSection.match(/`([^`]+\.(?:md|txt))`/);
  if (externalPathMatch) {
    const externalPath = resolve(repoRoot, externalPathMatch[1]);
    return {
      briefTypeId,
      rawInputText: readFileSync(externalPath, "utf8").trim(),
    };
  }

  return {
    briefTypeId,
    rawInputText: rawInputSection.trim(),
  };
}

/**
 * Evaluation-only gallery loader: reads fixtures from disk so the harness does
 * not depend on Vite `?raw` imports.
 */
export function loadGalleryExampleInput(
  galleryId: NonNullable<PipelineEvalCase["galleryId"]>,
  repoRoot: string,
): { rawInputText: string; briefTypeId: PipelineEvalCase["briefTypeId"] } {
  const base = resolve(repoRoot, "fixtures/examples", galleryId);
  const metadata = JSON.parse(
    readFileSync(resolve(base, "metadata.json"), "utf8"),
  ) as { briefTypeId: PipelineEvalCase["briefTypeId"] };

  return {
    rawInputText: readFileSync(resolve(base, "messy-notes.md"), "utf8").trim(),
    briefTypeId: metadata.briefTypeId,
  };
}

export function loadPipelineCaseInput(
  evalCase: PipelineEvalCase,
  repoRoot: string,
): LoadedPipelineCaseInput {
  if (evalCase.category === "gallery-example") {
    if (!evalCase.galleryId) {
      throw new Error(`Gallery case ${evalCase.id} is missing galleryId`);
    }
    const loaded = loadGalleryExampleInput(evalCase.galleryId, repoRoot);
    return {
      ...loaded,
      sourceLabel: evalCase.sourceLabel,
    };
  }

  if (!evalCase.fixtureDocPath) {
    throw new Error(`Evaluation case ${evalCase.id} is missing fixtureDocPath`);
  }

  const loaded = loadEvaluationFixtureInput(evalCase.fixtureDocPath, repoRoot);
  return {
    ...loaded,
    sourceLabel: evalCase.sourceLabel,
  };
}

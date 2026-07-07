import type { GenerateCaptureLayerInput, GenerateDecisionBriefInput } from "./types";

const NO_REASONING_INSTRUCTION =
  "Do not include reasoning. Return only the final JSON object.";

function formatGuidance(guidance: GenerateCaptureLayerInput["briefTypeGuidance"]) {
  return [
    `When to use: ${guidance.whenToUse}`,
    `Common inputs: ${guidance.commonInputs.join("; ")}`,
    `Typical decision shape: ${guidance.typicalDecisionShape}`,
    `Output emphasis: ${guidance.outputEmphasis.join("; ")}`,
    `Example decision questions: ${guidance.exampleDecisionQuestions.join("; ")}`,
  ].join("\n");
}

export function buildCaptureLayerPrompt(input: GenerateCaptureLayerInput): string {
  const sourceLabelLine = input.sourceLabel
    ? `Source label: ${input.sourceLabel}\n`
    : "";

  return [
    "You are a decision capture analyst. Your job is to convert messy source material into a structured Capture Layer that preserves facts, inference, ambiguity, missing context, tensions, and decision-relevant next steps. Do not write the final Decision Brief.",
    "",
    `Brief type: ${input.briefType.id}`,
    "Brief type guidance:",
    formatGuidance(input.briefTypeGuidance),
    "",
    "Required Capture Layer fields:",
    input.captureLayerFields.join(", "),
    "",
    "Return only valid JSON with all required fields. Use string values for text fields and arrays of strings for list fields. confidence must be High, Medium, or Low.",
    "Separate stated facts from inference. Preserve ambiguity instead of flattening it. Do not invent missing facts.",
    NO_REASONING_INSTRUCTION,
    "",
    sourceLabelLine + "Raw input:",
    input.rawInputText,
  ].join("\n");
}

export function buildDecisionBriefPrompt(input: GenerateDecisionBriefInput): string {
  const tone = input.toneGuidance ?? "Concise, executive-ready, direct, and decision-oriented.";

  return [
    "You are a decision brief writer. Your job is to turn a structured Capture Layer into a concise Markdown Decision Brief that makes the decision, tradeoffs, risks, assumptions, open questions, recommendation, and next actions explicit. Do not reinterpret unsupported facts beyond the Capture Layer.",
    "",
    `Brief type: ${input.briefType.id}`,
    "Brief type guidance:",
    formatGuidance(input.briefTypeGuidance),
    "",
    "Use these Markdown sections:",
    input.markdownStructure.map((section) => `- ${section}`).join("\n"),
    "",
    `Tone: ${tone}`,
    "",
    "Return Markdown only. Start with # Decision Brief. Use the Capture Layer as the source of truth.",
    "",
    "Capture Layer JSON:",
    JSON.stringify(input.captureLayer, null, 2),
  ].join("\n");
}

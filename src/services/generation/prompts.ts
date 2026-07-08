import type { GenerateCaptureLayerInput, GenerateDecisionBriefInput } from "./types";

const NO_REASONING_INSTRUCTION =
  "Do not include reasoning. Return only the final JSON object.";

export type CapturePromptVariant = "default" | "schema_skeleton";

function readCapturePromptVariantEnv(): string | undefined {
  const viteEnv = import.meta.env as ImportMetaEnv | undefined;
  const viteValue = viteEnv?.VITE_CAPTURE_PROMPT_VARIANT;
  if (typeof viteValue === "string" && viteValue.length > 0) {
    return viteValue;
  }

  const nodeProcess = (
    globalThis as {
      process?: { env?: Record<string, string | undefined> };
    }
  ).process;

  const nodeValue = nodeProcess?.env?.VITE_CAPTURE_PROMPT_VARIANT;
  return typeof nodeValue === "string" && nodeValue.length > 0
    ? nodeValue
    : undefined;
}

export function resolveCapturePromptVariant(
  raw: string | undefined = readCapturePromptVariantEnv(),
): CapturePromptVariant {
  return raw === "schema_skeleton" ? "schema_skeleton" : "default";
}

function formatGuidance(guidance: GenerateCaptureLayerInput["briefTypeGuidance"]) {
  return [
    `When to use: ${guidance.whenToUse}`,
    `Common inputs: ${guidance.commonInputs.join("; ")}`,
    `Typical decision shape: ${guidance.typicalDecisionShape}`,
    `Output emphasis: ${guidance.outputEmphasis.join("; ")}`,
    `Example decision questions: ${guidance.exampleDecisionQuestions.join("; ")}`,
  ].join("\n");
}

function buildSchemaSkeletonBlock(fields: string[]): string {
  const skeleton: Record<string, string | string[]> = {};

  for (const field of fields) {
    if (field === "confidence") {
      skeleton[field] = "Low";
    } else if (
      field === "source_summary" ||
      field === "decision_context" ||
      field === "stated_decision" ||
      field === "implied_decision" ||
      field === "recommendation_candidate"
    ) {
      skeleton[field] = "";
    } else {
      skeleton[field] = [];
    }
  }

  return [
    "Return a single JSON object that includes every required field. Use this exact shape as a template (replace empty values with content from the notes; keep empty string/array when the source truly lacks the signal):",
    JSON.stringify(skeleton, null, 2),
    'stated_decision may be "" when the notes do not contain an explicit decision. Do not omit stated_decision or any other required field. confidence must be "High", "Medium", or "Low".',
  ].join("\n");
}

export function buildCaptureLayerPrompt(
  input: GenerateCaptureLayerInput,
  options: { variant?: CapturePromptVariant } = {},
): string {
  const variant = options.variant ?? resolveCapturePromptVariant();
  const sourceLabelLine = input.sourceLabel
    ? `Source label: ${input.sourceLabel}\n`
    : "";

  const shapeInstructions =
    variant === "schema_skeleton"
      ? [
          buildSchemaSkeletonBlock(input.captureLayerFields),
          "Use string values for text fields and arrays of strings for list fields.",
        ]
      : [
          "Return only valid JSON with all required fields. Use string values for text fields and arrays of strings for list fields. confidence must be High, Medium, or Low.",
        ];

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
    ...shapeInstructions,
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

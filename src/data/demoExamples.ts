import {
  EXECUTION_DECISION_BRIEF,
  PRODUCT_DECISION_BRIEF,
  STRATEGY_DECISION_BRIEF,
} from "./briefTypes";
import type { BriefType, BriefTypeId } from "../types/brief";
import constructionNotes from "../../fixtures/construction-workforce-planning/messy-transcript.md?raw";
import executionNotes from "../../fixtures/raw-inputs/execution-planning.md?raw";
import productNotes from "../../fixtures/raw-inputs/product-prioritization.md?raw";

export type DemoExampleId =
  | "construction-strategy"
  | "product-prioritization"
  | "execution-planning";

export type DemoExample = {
  id: DemoExampleId;
  title: string;
  briefTypeId: BriefTypeId;
  briefType: BriefType;
  description: string;
  sourceLabel: string;
  rawNotes: string;
};

export const DEMO_EXAMPLE_SOURCE_PREFIX = "demo:";

export function demoExampleSourceLabel(exampleId: DemoExampleId): string {
  return `${DEMO_EXAMPLE_SOURCE_PREFIX}${exampleId}`;
}

export function parseDemoExampleId(
  sourceLabel: string | undefined,
): DemoExampleId | null {
  if (!sourceLabel?.startsWith(DEMO_EXAMPLE_SOURCE_PREFIX)) {
    return null;
  }

  const exampleId = sourceLabel.slice(DEMO_EXAMPLE_SOURCE_PREFIX.length);
  return DEMO_EXAMPLES.some((example) => example.id === exampleId)
    ? (exampleId as DemoExampleId)
    : null;
}

export const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: "construction-strategy",
    title: "Construction workforce planning",
    briefTypeId: "strategy",
    briefType: STRATEGY_DECISION_BRIEF,
    description:
      "Messy strategy notes on specialty trades vs GC workforce planning before Q4.",
    sourceLabel: demoExampleSourceLabel("construction-strategy"),
    rawNotes: constructionNotes.trim(),
  },
  {
    id: "product-prioritization",
    title: "Product sprint prioritization",
    briefTypeId: "product",
    briefType: PRODUCT_DECISION_BRIEF,
    description:
      "Product sync deciding onboarding workflow vs reporting vs admin controls for one sprint.",
    sourceLabel: demoExampleSourceLabel("product-prioritization"),
    rawNotes: productNotes.trim(),
  },
  {
    id: "execution-planning",
    title: "Manager dashboard rollout",
    briefTypeId: "execution",
    briefType: EXECUTION_DECISION_BRIEF,
    description:
      "Launch sequencing, ownership, and readiness for a constrained manager dashboard release.",
    sourceLabel: demoExampleSourceLabel("execution-planning"),
    rawNotes: executionNotes.trim(),
  },
];

export const DEFAULT_DEMO_EXAMPLE_ID: DemoExampleId = "construction-strategy";

export function getDemoExample(
  exampleId: DemoExampleId,
): DemoExample | undefined {
  return DEMO_EXAMPLES.find((example) => example.id === exampleId);
}

export function getDemoExamplesForBriefType(
  briefTypeId: BriefTypeId,
): DemoExample[] {
  return DEMO_EXAMPLES.filter((example) => example.briefTypeId === briefTypeId);
}

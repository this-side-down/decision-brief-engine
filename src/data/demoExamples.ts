import {
  EXECUTION_DECISION_BRIEF,
  PRODUCT_DECISION_BRIEF,
  STRATEGY_DECISION_BRIEF,
} from "./briefTypes";
import type { BriefType, BriefTypeId } from "../types/brief";
import {
  EXAMPLE_FIXTURES,
  type DemoExampleId,
  getExampleFixture,
} from "./exampleFixtures";

export type { DemoExampleId } from "./exampleFixtures";

export type DemoExample = {
  id: DemoExampleId;
  title: string;
  briefTypeId: BriefTypeId;
  briefType: BriefType;
  description: string;
  positioning: string[];
  sourceLabel: string;
  rawNotes: string;
};

export const DEMO_EXAMPLE_SOURCE_PREFIX = "demo:";

const BRIEF_TYPE_BY_ID = {
  product: PRODUCT_DECISION_BRIEF,
  strategy: STRATEGY_DECISION_BRIEF,
  execution: EXECUTION_DECISION_BRIEF,
} satisfies Record<BriefTypeId, BriefType>;

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
  return EXAMPLE_FIXTURES.some((fixture) => fixture.metadata.id === exampleId)
    ? (exampleId as DemoExampleId)
    : null;
}

function toDemoExample(fixture: (typeof EXAMPLE_FIXTURES)[number]): DemoExample {
  const { id, title, briefTypeId, description, positioning } = fixture.metadata;

  return {
    id,
    title,
    briefTypeId,
    briefType: BRIEF_TYPE_BY_ID[briefTypeId],
    description,
    positioning,
    sourceLabel: demoExampleSourceLabel(id),
    rawNotes: fixture.rawNotes,
  };
}

const BROWSER_GALLERY_EXCLUDED_IDS = new Set<DemoExampleId>([
  "platform-rearchitecture-review",
]);

export const DEMO_EXAMPLES: DemoExample[] = EXAMPLE_FIXTURES.filter(
  (fixture) => !BROWSER_GALLERY_EXCLUDED_IDS.has(fixture.metadata.id),
).map(toDemoExample);

export const DEFAULT_DEMO_EXAMPLE_ID: DemoExampleId = "q4-workforce-allocation";

export function getDemoExample(
  exampleId: DemoExampleId,
): DemoExample | undefined {
  const fixture = getExampleFixture(exampleId);
  return fixture ? toDemoExample(fixture) : undefined;
}

export function getDemoExamplesForBriefType(
  briefTypeId: BriefTypeId,
): DemoExample[] {
  return DEMO_EXAMPLES.filter((example) => example.briefTypeId === briefTypeId);
}

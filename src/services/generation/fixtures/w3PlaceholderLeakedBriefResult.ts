import type { DecisionBriefResult } from "../types";

/**
 * Regression fixture representing the observed W3 browser run where schema-valid
 * output copied prompt-template placeholders instead of grounded content.
 */
export function createW3PlaceholderLeakedBriefResult(): DecisionBriefResult {
  const markdown = `# Decision Brief

## Summary

Generic decision context prose without specific workforce details.

## Decision Context

Generic decision context prose repeated for context.

## Options Considered

- Option one
- Option two

## Recommendation

The recommendation or next step, verbatim from the brief.

## Recommendation

The recommendation or next step, verbatim from the brief.

## Risks and Constraints

Generic constraints and risks repeated under both headings.

## Open Questions

- What happens next?

## Suggested Next Steps

- Review the plan

## Confidence

Confidence: Medium
`;

  return {
    markdown,
    decisionTrace: {
      entries: [
        {
          statement: "The recommendation or next step, verbatim from the brief.",
          kind: "recommendation",
          basis: {
            intent: "Which goal from the Capture Layer this serves.",
            supporting_evidence: ["Evidence item from the Capture Layer."],
            assumptions_relied_on: [
              "Assumption from the Capture Layer this depends on.",
            ],
            risks_addressed: ["Risk from the Capture Layer this mitigates."],
            risks_accepted: ["Risk from the Capture Layer this accepts or defers."],
            constraints_respected: [
              "Constraint from the Capture Layer this stays within.",
            ],
            tradeoffs: [
              "Tradeoff or tension from the Capture Layer this navigates.",
            ],
            alternatives_considered: [
              "Alternative considered and why not selected.",
            ],
            missing_context_caveats: [
              "Missing context item that qualifies this entry's reliability.",
            ],
          },
          confidence: "Medium",
          would_change_if: [
            "Specific condition that would lead to a different outcome.",
          ],
        },
      ],
      created_at: "1970-01-01T00:00:00.000Z",
    },
  };
}

# Product prioritization meeting

## Target brief type

Product

## Scenario

Product team deciding whether to prioritize an onboarding workflow, reporting enhancement, or admin control feature for the next sprint.

## Raw input

Product sync notes, rough:

We have one sprint open before the launch-readiness work starts. Three things are competing for the slot.

Onboarding workflow: Customer Success says new admins still do not know what to do after invite. Two onboarding calls last week had the same confusion: "where do I start?" Product design has a rough flow for first project setup. Engineering says it is probably medium effort if we keep it to checklist and empty states, but it touches setup screens.

Reporting enhancement: Sales wants the usage report because one enterprise prospect asked whether managers can see team activity by workspace. Data team says the events exist but naming is inconsistent. This could help with buyer conversations but I am not sure current customers are blocked by it.

Admin control feature: Support has six tickets asking for better role controls. But three are from the same account. Engineering says permissions logic is brittle and this could sprawl. It might be the most important long term, but maybe not a one-sprint item.

Goals: improve activation, reduce support confusion, help sales where possible, avoid adding risky permissions work before launch.

My instinct is onboarding first, reporting second, admin controls later, but Sales will push back. Need decision before sprint planning.

## Expected Capture Layer qualities

- `stated_decision`: Decide which product improvement to prioritize for the next sprint.
- `implied_decision`: Whether activation/onboarding should take precedence over reporting and admin controls.
- `options`: Onboarding workflow, reporting enhancement, admin control feature.
- `stakeholders`: Product, design, engineering, Customer Success, Sales, Support, new admins, enterprise prospect.
- `constraints`: One sprint available, upcoming launch-readiness work, permissions brittleness, inconsistent event naming.
- `risks`: Permissions scope could sprawl, reporting may not address current-customer blockers, Sales pushback, onboarding touches setup screens.
- `assumptions`: Onboarding confusion is a broader activation problem, reporting is more sales-enablement than user-blocking, admin controls are too large for one sprint.
- `missing_context`: Activation impact, number of affected customers, implementation estimates, sales impact of reporting.
- `open_questions`: Which option best supports launch readiness? Is onboarding confusion common enough? Can admin controls be scoped safely?
- `recommendation_candidate`: Prioritize onboarding workflow first, with reporting second and admin controls deferred.
- `suggested_next_steps`: Confirm engineering estimate, align Sales on tradeoff, define one-sprint onboarding scope.
- `confidence`: Medium.

## Expected Decision Brief qualities

- Preserves all three options.
- Explains why onboarding is favored without erasing Sales or Support input.
- Separates customer evidence from assumptions.
- Names risks around permissions and reporting data.
- Produces a clear next-sprint recommendation and next actions.

## Known risks

- Collapsing all options into the onboarding recommendation.
- Missing customer evidence from CS and Support.
- Treating Sales request as validated customer demand.
- Overstating confidence without enough data.

## Expected Decision Trace qualities (v0.2)

If Decision Trace is generated for this case (see [`decision-trace-eval-gates.md`](../../docs/ai/decision-trace-eval-gates.md)):

- The recommendation entry's `alternatives_considered` names reporting and admin controls, with brief reasoning for why they were not selected first, not just the chosen option.
- `risks_accepted` covers the deferred admin-control ticket pressure; `risks_addressed` covers permissions brittleness avoided by deferring that work.
- The next-step entry for confirming the engineering estimate is grounded in `missing_context` (implementation estimates), not invented as a standalone idea.
- `would_change_if` names a specific reversal condition, such as the engineering estimate coming back larger than expected, not a generic "if the facts change."

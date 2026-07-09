# Strategy tradeoff discussion

## Target brief type

Strategy

## Scenario

Construction workforce planning market expansion decision. This fixture tests market expansion, product strategy, pilot scope, sales framing, and roadmap risk.

## Raw input

Use the existing messy transcript:

- `fixtures/construction-workforce-planning/messy-transcript.md`

Use the structured reference for reviewer expectations:

- `fixtures/construction-workforce-planning/structured-reference.md`

## Expected Capture Layer qualities

- `stated_decision`: Decide whether to explore specialty trade workforce planning before Q4 or keep focus on GC workforce planning.
- `implied_decision`: Whether specialty trades extend the current platform or require a separate product path.
- `options`: Pilot with three design partners, stay focused on GCs, build discovery prototype, add trade-specific fields.
- `stakeholders`: Product/design, Sales, Customer Success, Engineering, executive team, specialty trade design partners, GC customers.
- `constraints`: Limited engineering capacity, limited design capacity, fragile admin story, project/person/role data model, sales pressure.
- `risks`: Workflow mismatch, crew-level planning complexity, sales overpromising, GC roadmap slip, non-generalizable pilot learning.
- `assumptions`: Design partner pilot can validate market direction, role/person forecasting may be enough to test, sales can frame this as research.
- `missing_context`: Design partner list, pilot success criteria, minimum useful VP Ops workflow, exec-approved sales language.
- `open_questions`: Crew-level planning needs, first trade segment, sales framing, success criteria ownership, certification/union requirements.
- `recommendation_candidate`: Run a narrow discovery pilot with three specialty trade design partners across at least two trade types.
- `suggested_next_steps`: Identify design partners, define pilot success criteria, interview VP Ops and staffing coordinators, map GC model fit/breaks, align executive sales language.
- `confidence`: Medium.

## Expected Decision Brief qualities

- Frames the decision as strategy and market expansion, not only feature prioritization.
- Preserves all four options and their tradeoffs.
- Makes sales framing and roadmap risk explicit.
- Explains why the pilot is discovery, not committed production delivery.
- Grounds the recommendation in evidence from the transcript and the structured reference.

## Known risks

- Turning the strategy question into a narrow product feature decision.
- Ignoring roadmap risk to the GC product.
- Treating specialty trade expansion as validated market demand.
- Omitting sales-language and expectation-setting risk.

## Expected Decision Trace qualities (v0.2)

If Decision Trace is generated for this case (see [`decision-trace-eval-gates.md`](../../docs/ai/decision-trace-eval-gates.md)):

- The pilot recommendation's trace entry cites design-partner and market-signal evidence from the transcript, not invented usage data.
- Sales-framing and roadmap-slip risks appear in `risks_addressed` or `risks_accepted`, not omitted.
- `would_change_if` names specific pilot-outcome conditions (for example, a specific design-partner signal or success-criteria miss), not a generic "if the market changes."
- Next-step entries for design-partner identification and success-criteria definition are grounded in `missing_context` and `open_questions` from the Capture Layer.

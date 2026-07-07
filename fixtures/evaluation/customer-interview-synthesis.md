# Customer interview synthesis

## Target brief type

Product

## Scenario

Notes from several customer interviews where needs conflict and the team must decide what problem to solve first.

## Raw input

Interview synthesis notes, messy:

Talked to five customers about why their teams are not using the planning view every week.

Customer A, mid-market ops team: they said the planning view is useful but they forget to check it. They asked for weekly digest emails.

Customer B, enterprise admin: they do check it, but managers do not trust the data because role assignments lag reality. They asked for easier bulk updates.

Customer C, startup team: they mostly want a simpler empty state and onboarding checklist because new managers do not understand the first setup step.

Customer D, enterprise PMO: asked for executive reporting and trend charts. Might be buyer-driven more than user pain.

Customer E, implementation lead: said the biggest issue is ownership. No one knows who is supposed to keep project staffing current.

The team is split. Design thinks onboarding and empty states are the fastest fix. Customer Success thinks ownership and weekly reminders matter more. Sales keeps pushing reporting because it helps with renewals.

Possible problems to solve first:
1. Awareness: users forget to return to the planning view.
2. Trust: data is stale or hard to update.
3. Setup: new managers do not understand how to start.
4. Buyer reporting: executives want trend visibility.

We do not have usage data by segment yet. Also not sure if enterprise and mid-market need the same thing.

## Expected Capture Layer qualities

- `stated_decision`: Decide which customer problem to solve first.
- `implied_decision`: Whether to prioritize user activation/trust over buyer reporting.
- `options`: Awareness reminders, trust/data freshness, setup/onboarding, buyer reporting.
- `stakeholders`: Customers A-E, design, Customer Success, Sales, managers, admins, executives.
- `constraints`: Five interviews only, no segment usage data, mixed segment needs.
- `risks`: Overgeneralizing anecdotes, optimizing for buyer reporting over user adoption, missing segment differences.
- `assumptions`: Interview themes represent broader user pain, onboarding may be fastest, reporting helps renewals.
- `missing_context`: Usage data by segment, severity by customer type, implementation effort, renewal impact.
- `open_questions`: Which problem blocks weekly use most? Are enterprise and mid-market needs different? Is reporting buyer demand or user need?
- `recommendation_candidate`: Investigate trust/data freshness and setup before committing to buyer reporting.
- `suggested_next_steps`: Segment interview findings, pull usage data, size onboarding and bulk update effort, validate reporting need.
- `confidence`: Medium or Low.

## Expected Decision Brief qualities

- Separates stated customer requests from inferred underlying needs.
- Preserves segment differences and conflicting evidence.
- Avoids treating five interviews as quantitative proof.
- Recommends a next product direction or validation step without overstating certainty.

## Known risks

- Overgeneralizing from anecdotes.
- Missing segments.
- Confusing stated requests with underlying needs.
- Treating buyer reporting as the same as end-user activation.

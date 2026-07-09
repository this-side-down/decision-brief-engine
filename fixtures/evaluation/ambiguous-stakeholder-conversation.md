# Ambiguous stakeholder conversation

## Target brief type

Strategy

Strategy is the best fit because the actual decision is about priority, executive alignment, and whether the initiative should become a strategic bet. The execution plan is not clear enough yet.

## Scenario

Stakeholders disagree and the actual decision is implicit, not stated directly.

## Raw input

Stakeholder thread notes:

The exec sponsor said "we need to be more serious about partner-led growth" but did not say what should change this quarter.

Sales said partners are asking for co-selling materials and a shared account map. Marketing said they can support messaging later but not a full campaign this month. Product said the roadmap already has onboarding and reporting commitments.

Ops asked whether this is a real company priority or just a QBR talking point. Finance asked if there is a revenue target. No one answered directly.

Three possible moves came up, but nobody called them options:
- Add a partner-readiness workstream to the current quarter.
- Keep partner work as research only until next planning cycle.
- Pick one partner segment and run a small GTM experiment.

The sponsor seemed excited about the experiment but also said we should not distract product. Sales took that as approval to move. Product did not.

Open questions: who owns partner strategy, is there a target segment, what revenue expectation exists, what can product realistically support, and whether the exec sponsor wants action now or just exploration.

My read: the real decision is whether partner-led growth is an actual near-term bet or just discovery. But that was never said explicitly.

## Expected Capture Layer qualities

- `stated_decision`: Empty or clearly absent.
- `implied_decision`: Decide whether partner-led growth is a near-term strategic bet or discovery only.
- `options`: Add workstream, keep as research, run small GTM experiment.
- `stakeholders`: Exec sponsor, Sales, Marketing, Product, Ops, Finance, partners.
- `constraints`: Current product roadmap commitments, limited marketing capacity, unclear revenue target, unclear owner.
- `risks`: Sales interpreting enthusiasm as approval, product distraction, strategy without owner, unclear success criteria.
- `assumptions`: Sponsor interest may imply priority, experiment could test partner opportunity, product support may be constrained.
- `missing_context`: Owner, target segment, revenue expectation, sponsor intent, product support level.
- `open_questions`: Who owns partner strategy? Is action expected now? What target segment? What revenue expectation?
- `recommendation_candidate`: Clarify strategic intent and owner before treating partner-led growth as a committed near-term bet.
- `suggested_next_steps`: Ask sponsor to define decision, owner, target segment, success criteria, and product support limits.
- `confidence`: Low or Medium.

## Expected Decision Brief qualities

- Does not invent a stated decision.
- Surfaces the implied strategic decision plainly.
- Preserves lack of alignment between Sales and Product.
- Makes missing context and ownership questions prominent.
- Avoids presenting the experiment as approved.

## Known risks

- Inventing a decision.
- Overstating alignment.
- Failing to surface missing context.
- Treating sponsor enthusiasm as committed strategy.
- Turning an implicit strategy question into a detailed execution plan.

## Expected Decision Trace qualities (v0.2)

If Decision Trace is generated for this case (see [`decision-trace-eval-gates.md`](../../docs/ai/decision-trace-eval-gates.md)):

- The recommendation entry's `basis.intent` reflects clarifying ownership and intent, not a premature commitment to the GTM experiment.
- `risks_addressed` or `risks_accepted` names the risk of Sales treating sponsor enthusiasm as approval, since that ambiguity is central to this scenario.
- `missing_context_caveats` cites the unresolved owner, target segment, and revenue expectation rather than omitting them.
- `would_change_if` names a specific resolving event, such as the sponsor naming an owner or confirming a revenue target, not a generic "if circumstances change."

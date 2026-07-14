# Decision Brief

## Summary

Pursue Helix modular-monolith with staged invoice remediation, tracing and SLO gates, and deferred microservices extraction unless module boundaries fail. Medium confidence because Helix terminology, invoice root cause, and customer uptime expectations remain partially unresolved.

## Decision Context

Enterprise latency pressure and a September remediation milestone are colliding with a platform team that cannot absorb a day-one microservices operations burden. The session produced a recommendation path but no final architecture approval.

## Options Considered

- Extract payments and catalog services into microservices now
- Adopt Helix modular monolith and defer service split
- Stay on the monolith and invest only in performance guardrails
- Hybrid Helix core plus one extracted invoice worker service

## Recommendation

Pursue Helix modular-monolith with a staged invoice remediation track, paired with tracing and SLO gates, while keeping microservices extraction as a later phase if module boundaries fail.

## Risks and Constraints

### Risks

- Operational overload if microservices are introduced too early
- Vague Helix meaning slowing alignment and customer comms
- Sales overpromising modernization outcomes
- Budget overrun on infrastructure changes
- Repeating last year's big-refactor morale hit
- Incorrect bottleneck diagnosis leading to the wrong architecture move

### Constraints

- 14-person platform team with flat SRE headcount
- Finance wants phased infrastructure spend, not a big-bang budget hit
- September customer success remediation milestone
- Sales messaging must not promise a rewrite timeline the team cannot keep

## Open Questions

- What is the true bottleneck for invoice latency?
- Can Helix deliver independent deploys without new clusters?
- Do we have SRE capacity for microservices operations?
- What budget envelope will finance approve?
- Does modular-monolith preserve the same uptime promises customers expect?

## Suggested Next Steps

- Publish a one-page decision framing for exec staff
- Confirm invoice bottleneck with profiling
- Define Helix contract boundaries and ownership
- Model phased infrastructure cost for finance review
- Add tracing coverage requirements before migration kickoff
- Draft customer messaging focused on remediation milestones rather than architecture jargon

## Confidence

Confidence: Medium. Helix terminology, invoice root cause, and Northwind uptime expectations are not fully resolved.

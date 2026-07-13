# Decision Brief

## Summary

Ship a lightweight health-check and model status strip before a full wizard. Validate endpoint reachability, confirm model availability, and run one short smoke test. Explain setup failures in plain language. Medium confidence because setup friction severity and strip scope estimates remain unclear.

## Decision Context

Local inference is the strongest real-generation path, but setup remains fragile. Wrong endpoints, missing models, and opaque errors create support noise and erode product credibility. Engineering capacity is limited before the next Capture Layer quality push.

## Options Considered

- Add a status strip with endpoint reachability, model availability, and last smoke-test result
- Build a guided first-run wizard with install checks, model pull confirmation, and plain-language failures
- Improve documentation and troubleshooting only, with no in-product flow
- Defer investment until there is stronger signal on local vs mock usage

## Recommendation

Ship a lightweight health-check and model status strip before investing in a full wizard. Validate the endpoint, confirm model availability, and run one short generation smoke test. Explain failures in plain language.

## Risks and Constraints

### Risks

- A wizard could feel heavy for a fast open-and-paste workflow
- Health checks may produce false positives or false negatives
- Scope could creep into model management and broad local-stack support
- Maintenance burden if local runtime APIs change frequently

### Constraints

- Mock demo remains the public default; local runtime is not exposed in visitor UI
- Engineering has limited capacity before the next Capture Layer quality push
- The product cannot support every local stack permutation
- Health checks must not block users who paste notes and use mock generation

## Open Questions

- Is setup friction blocking adoption or mostly rough edges for early users?
- Is a wizard necessary or is inline status with on-demand checks enough?
- What is the minimum smoke test that proves generation readiness?
- Who owns failure-state copy and support escalation paths?

## Suggested Next Steps

- Scope a one-sprint status strip with endpoint, model, and smoke-test checks
- Define plain-language failure copy for the top three setup failure modes
- Measure support volume for four weeks after release
- Revisit a guided wizard only if setup-related tickets remain high

## Confidence

Confidence: Medium. Setup friction severity and engineering scope for the status strip are not fully confirmed.

# Local inference setup — rough product notes

people keep trying to run local inference because it's the strongest real-generation path we have, but setup is fragile. support thread this week: endpoint wrong, model not pulled, health check passed but generation failed with a useless error. another case had the local runtime running but the app was pointed at the wrong port.

the product question is whether we invest in a guided setup flow before we push local inference harder in docs or internal demos. this is not about exposing local runtime controls in the public UI — mock demo stays default for visitors. it's about whether the product should detect, validate, and explain local inference readiness for people who choose that path.

options on the table:

1) status strip only — show model available, endpoint reachable, last smoke-test result
2) guided first-run wizard — check install, confirm required model, test endpoint, show plain-language failure copy
3) docs-only — improve setup guide and troubleshooting, no in-product flow
4) defer — wait for more signal on how many users actually run locally vs mock demo

engineering says endpoint validation is straightforward, a short generation smoke test is medium effort, wizard UX is at least one slice. design worries a wizard feels heavy for a tool people want to open fast. i think the real gap is failure states — users assume the product is broken when the local stack isn't ready.

goals: make the local-first path credible without adding complexity to the public demo, reduce "is it working?" support noise, give internal users and power users confidence before they generate, keep capture layer quality work from getting derailed.

constraints: mock demo remains public default, no local runtime picker in visitor UI, eng has limited capacity before the next capture-layer quality push, we can't support every local stack permutation.

risks: wizard maintenance burden, false positives on health checks, scope creep into model management, implying broad local-stack support we don't have, pulling engineering off capture-layer improvements.

evidence: three support threads in two weeks with setup confusion, internal demo failed once because model wasn't pulled, docs update helped one user but not the port-mismatch case.

open questions: is this blocking adoption or just rough edges? do we need a wizard or just inline status? what's the minimum smoke test? who owns failure-state copy? should health checks run automatically or on demand?

tension: product wants credibility for local inference; engineering wants bounded scope; design wants fast open-and-paste workflow; support wants fewer opaque errors.

my leaning: ship a lightweight health check and model status strip before a full wizard — validate endpoint, confirm model pulled, run one short generation test, explain failures in plain language. revisit a wizard if support volume stays high after that.

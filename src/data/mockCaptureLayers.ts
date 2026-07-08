import type { CaptureLayer } from "../types/captureLayer";
import type { DemoExampleId } from "./demoExamples";

export const MOCK_CAPTURE_LAYERS_BY_EXAMPLE_ID: Record<
  DemoExampleId,
  CaptureLayer
> = {
  "construction-strategy": {
    source_summary:
      "Construction workforce planning notes about whether to run a narrow specialty trade workforce planning pilot before Q4 or stay focused on the existing GC workforce planning roadmap.",
    decision_context:
      "Sales is seeing specialty contractor interest, GC customers are getting value from existing project staffing views, CS is worried about support and admin confusion, and Engineering has limited discovery or prototype capacity before Q4 planning.",
    stated_decision:
      "Decide whether to explore specialty trade workforce planning before Q4 or keep all focus on committed GC workforce planning work.",
    implied_decision:
      "Determine whether specialty trades are an extension of the current platform or a separate product path before changing the production data model.",
    goals: [
      "Validate whether specialty trades are a real near-term expansion path",
      "Avoid overfitting the product to one trade partner",
      "Preserve momentum with GC customers",
      "Learn whether crew-level planning belongs in the core product",
      "Support sales with a credible story without selling vaporware",
    ],
    stakeholders: [
      "Product and design",
      "Sales",
      "Customer success",
      "Engineering",
      "Executive team",
      "Specialty trade design partners",
      "Existing GC customers",
    ],
    options_considered: [
      "Pilot specialty trade forecasting with three design partners in August",
      "Stay focused on GC workforce planning until the current roadmap is stronger",
      "Build a lightweight discovery prototype without committing to production delivery",
      "Add trade-specific fields to the current product and test whether the existing workflow stretches",
    ],
    constraints: [
      "Engineering has about one sprint of discovery or prototype capacity before Q4 planning",
      "Design can support interviews and workflow mapping, but not a full new product surface",
      "Customer success does not want to support a half-built workflow across too many accounts",
      "The existing model is project/person/role oriented, not crew oriented",
    ],
    risks: [
      "Specialty trade workflows may be too different from GC workforce planning",
      "Crew-level planning could require deeper data model changes than expected",
      "Pilot customers may expect production-ready functionality",
      "Sales may position the pilot as a committed roadmap item",
      "GC roadmap work could slip",
    ],
    assumptions: [
      "Three design partners can provide useful learning before Q4 planning",
      "At least two trade types are needed to avoid overfitting",
      "Role/person forecasting may be useful enough to test before crew-level planning",
      "Sales can frame the pilot as research rather than committed roadmap",
    ],
    evidence: [
      "Two expansion conversations mentioned trade contractor workforce visibility",
      "A mechanical contractor said late senior foreman assignment hurts margin",
      "An electrical contractor said spreadsheet staffing reviews already happen every Friday",
      "GC customers mostly plan around salaried project teams",
      "Engineering says adding fields is easy, but changing crew planning logic is hard",
    ],
    open_questions: [
      "Do specialty trades need crew-level planning on day one, or is role/person forecasting enough?",
      "Which trade segment should be the first design partner: mechanical, electrical, concrete, or self-perform?",
      "Can sales frame the pilot as research without creating delivery expectations?",
      "What is the minimum useful workflow for a VP Ops?",
      "Who owns pilot success criteria: product, sales, or customer success?",
    ],
    tensions: [
      "Sales wants to move quickly, while product wants stronger validation",
      "Specialty trades are strategically attractive, but may pull the product away from the GC workflow",
      "A small pilot could generate learning, but could also create custom-work expectations",
      "Waiting preserves roadmap focus, but may miss a market-learning window",
    ],
    recommendation_candidate:
      "Run a narrow discovery pilot with three specialty trade design partners across at least two trade types, without committing to production roadmap delivery.",
    confidence: "Medium",
    missing_context: [
      "Confirmed design partner list across at least two trade types",
      "Pilot success criteria and owner",
      "Minimum useful workflow for a VP Ops",
      "Whether certifications, unions, and regional labor rules are core requirements or edge cases",
      "Executive alignment on sales language",
    ],
    suggested_next_steps: [
      "Identify three design partners across at least two trade types",
      "Define pilot success criteria before build work starts",
      "Run workflow interviews with VP Ops and staffing coordinators",
      "Map where the current GC workforce planning model fits or breaks",
      "Create a prototype or mocked workflow before changing the production data model",
      "Align with executives on sales language",
    ],
  },
  "product-prioritization": {
    source_summary:
      "Product sync notes about which improvement to prioritize for the next sprint before launch-readiness work: onboarding workflow, reporting enhancement, or admin control feature.",
    decision_context:
      "Customer Success reports new-admin confusion after invite, Sales wants a usage report for an enterprise prospect, and Support sees role-control tickets—but Engineering warns permissions logic is brittle and only one sprint is available.",
    stated_decision:
      "Decide which product improvement to prioritize for the next sprint.",
    implied_decision:
      "Whether activation and onboarding should take precedence over reporting and admin controls before launch-readiness work.",
    goals: [
      "Improve activation for new admins",
      "Reduce support confusion during setup",
      "Help sales where possible without overcommitting",
      "Avoid risky permissions work before launch",
    ],
    stakeholders: [
      "Product",
      "Design",
      "Engineering",
      "Customer Success",
      "Sales",
      "Support",
      "New admins",
      "Enterprise prospect",
    ],
    options_considered: [
      "Prioritize onboarding workflow with checklist and empty states",
      "Prioritize reporting enhancement for manager workspace activity visibility",
      "Prioritize admin control and role permissions improvements",
    ],
    constraints: [
      "Only one sprint available before launch-readiness work",
      "Onboarding touches setup screens",
      "Reporting events exist but naming is inconsistent",
      "Permissions logic is brittle and could sprawl",
    ],
    risks: [
      "Permissions scope could sprawl beyond one sprint",
      "Reporting may not address current-customer blockers",
      "Sales may push back if reporting is deferred",
      "Onboarding work could expand across setup surfaces",
    ],
    assumptions: [
      "Onboarding confusion is a broader activation problem",
      "Reporting is more sales-enablement than user-blocking today",
      "Admin controls are too large for a single sprint",
    ],
    evidence: [
      "Two onboarding calls last week had the same where-do-I-start confusion",
      "One enterprise prospect asked about manager team activity by workspace",
      "Support has six role-control tickets, three from the same account",
    ],
    open_questions: [
      "Which option best supports launch readiness?",
      "Is onboarding confusion common enough to justify first priority?",
      "Can admin controls be scoped safely in one sprint?",
      "What is the sales impact if reporting waits?",
    ],
    tensions: [
      "Sales urgency for reporting versus CS activation pain",
      "Long-term admin importance versus near-term sprint capacity",
      "Launch-readiness pressure versus scattered improvement requests",
    ],
    recommendation_candidate:
      "Prioritize onboarding workflow first, with reporting second and admin controls deferred beyond the next sprint.",
    confidence: "Medium",
    missing_context: [
      "Quantified activation impact from onboarding confusion",
      "Number of customers affected by setup friction",
      "Engineering estimates for each option",
      "Sales impact assessment for deferring reporting",
    ],
    suggested_next_steps: [
      "Confirm engineering estimate for a one-sprint onboarding scope",
      "Align Sales on the onboarding-first tradeoff",
      "Define explicit non-goals for the sprint",
      "Schedule a follow-up decision on reporting timing",
    ],
  },
  "execution-planning": {
    source_summary:
      "Launch planning notes on sequencing and ownership for rolling out a new manager dashboard by the 18th while CSV export, empty states, and customer comms are still in flight.",
    decision_context:
      "Dashboard core is nearly done but CSV export may slip, design needs empty-state polish, PMM needs messaging lead time, and CS wants enablement before any admin email—yet no one owns the rollout checklist.",
    stated_decision:
      "Decide launch sequencing and ownership for the manager dashboard rollout.",
    implied_decision:
      "Whether a limited customer-success-managed rollout can reduce readiness risk versus shipping broadly or delaying.",
    goals: [
      "Ship manager dashboard value without overwhelming admins or support",
      "Clarify rollout ownership and sequencing",
      "Meet or consciously revise the target launch date",
      "Complete enablement before customer-facing comms",
    ],
    stakeholders: [
      "Product",
      "Engineering",
      "Design",
      "PMM",
      "Customer Success",
      "Admins",
      "Managers",
    ],
    options_considered: [
      "Ship dashboard without CSV export, then add export later",
      "Delay full launch until dashboard, CSV export, and messaging are all ready",
      "Launch to three CS-managed accounts first, then expand after support docs are ready",
    ],
    constraints: [
      "Target launch date on the 18th",
      "CSV export has edge cases that may slip",
      "Empty states need another design pass",
      "PMM wants at least a week for customer-facing messaging",
      "CS requires enablement before admin email",
    ],
    risks: [
      "Admins get confused by incomplete empty states",
      "Support load spikes before enablement is ready",
      "Unclear ownership delays comms and sequencing decisions",
      "Engineering gets pulled into CSV cleanup during rollout",
      "PMM sends messaging too late if sequencing slips",
    ],
    assumptions: [
      "A limited rollout can reduce readiness risk",
      "CSV export can follow after first users if scoped explicitly",
      "CS-managed accounts are safer first users",
    ],
    evidence: [
      "Engineering reports dashboard core is almost done",
      "Design says managers will not understand empty no-activity teams without another pass",
      "Product, PMM, and CS each assumed another function owned rollout steps",
    ],
    open_questions: [
      "Who owns the rollout checklist and sequencing decision?",
      "Is CSV export required for first users?",
      "Which three accounts qualify for a limited launch?",
      "What must be true before any admin email goes out?",
    ],
    tensions: [
      "Product prefers limited rollout while Engineering prefers shipping without CSV",
      "PMM prefers delaying until messaging is ready",
      "Launch date pressure versus readiness gaps",
    ],
    recommendation_candidate:
      "Run a limited CS-managed rollout with a named owner, explicit CSV deferral, and a readiness checklist before broader admin email.",
    confidence: "Medium",
    missing_context: [
      "Named rollout owner",
      "Support docs timeline",
      "Exact severity of CSV edge cases",
      "Launch-readiness checklist sign-off criteria",
    ],
    suggested_next_steps: [
      "Assign a single rollout owner today",
      "Decide CSV scope for first users",
      "Finalize PMM comms timeline against the chosen sequencing",
      "Complete CS enablement before admin email",
      "Define expansion criteria after the limited launch",
    ],
  },
};

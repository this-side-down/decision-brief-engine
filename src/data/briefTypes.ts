import type { BriefType } from "../types/brief";

export const PRODUCT_DECISION_BRIEF: BriefType = {
  id: "product",
  name: "Product Decision Brief",
  description:
    "Use when the decision affects a product experience, roadmap choice, feature scope, user segment, customer problem, or product investment.",
  outputEmphasis: [
    "User problem and target user",
    "Product goal",
    "Options considered",
    "Tradeoffs and constraints",
    "Risks and assumptions",
    "Recommendation and next product actions",
  ],
  guidance: {
    whenToUse:
      "Use when the decision affects a product experience, roadmap choice, feature scope, user segment, customer problem, or product investment.",
    commonInputs: [
      "Product discovery notes",
      "Customer interview summaries",
      "Roadmap planning notes",
      "Feature tradeoff discussions",
      "User feedback themes",
      "Internal product review notes",
    ],
    typicalDecisionShape:
      "Which product direction, feature, user problem, segment, or scope boundary the team should prioritize.",
    outputEmphasis: [
      "User problem and target user",
      "Product goal",
      "Options considered",
      "Tradeoffs and constraints",
      "Risks and assumptions",
      "Recommendation and next product actions",
    ],
    exampleDecisionQuestions: [
      "Should we ship the lightweight version of this feature in the MVP?",
      "Which customer segment should this workflow serve first?",
      "Should this capability be part of onboarding or a later workflow?",
      "What product tradeoffs are we accepting by narrowing scope?",
      "Which user problem is most important to solve now?",
    ],
  },
};

export const STRATEGY_DECISION_BRIEF: BriefType = {
  id: "strategy",
  name: "Strategy Decision Brief",
  description:
    "Use when the decision affects market direction, positioning, investment focus, operating model, strategic priorities, or executive alignment.",
  outputEmphasis: [
    "Strategic context",
    "Business goal",
    "Options and tradeoffs",
    "Stakeholder implications",
    "Risks, assumptions, and open questions",
    "Recommendation and decision rationale",
  ],
  guidance: {
    whenToUse:
      "Use when the decision affects market direction, positioning, investment focus, operating model, strategic priorities, or executive alignment.",
    commonInputs: [
      "Strategy workshop notes",
      "Leadership discussion notes",
      "Market or competitor observations",
      "Planning memos",
      "Transformation or operating model discussions",
      "Executive review notes",
    ],
    typicalDecisionShape:
      "Which strategic path, priority, bet, market, operating model, or positioning choice should guide future work.",
    outputEmphasis: [
      "Strategic context",
      "Business goal",
      "Options and tradeoffs",
      "Stakeholder implications",
      "Risks, assumptions, and open questions",
      "Recommendation and decision rationale",
    ],
    exampleDecisionQuestions: [
      "Which market segment should we prioritize first?",
      "Should this initiative be positioned as a workflow product or an intelligence layer?",
      "Which strategic bet should receive near-term investment?",
      "What operating model should support this transformation effort?",
      "What decision needs executive alignment before execution begins?",
    ],
  },
};

export const EXECUTION_DECISION_BRIEF: BriefType = {
  id: "execution",
  name: "Execution Decision Brief",
  description:
    "Use when the decision affects delivery, sequencing, ownership, resourcing, process, launch readiness, or operational next steps.",
  outputEmphasis: [
    "Execution context",
    "Constraints and dependencies",
    "Owners and stakeholders",
    "Risks and blockers",
    "Immediate next steps",
    "Open questions that could affect delivery",
  ],
  guidance: {
    whenToUse:
      "Use when the decision affects delivery, sequencing, ownership, resourcing, process, launch readiness, or operational next steps.",
    commonInputs: [
      "Project planning notes",
      "Sprint or milestone discussions",
      "Launch readiness notes",
      "Cross-functional execution threads",
      "Operations review notes",
      "Risk or dependency discussions",
    ],
    typicalDecisionShape:
      "How the team should execute, sequence work, assign ownership, reduce risk, or move from discussion to action.",
    outputEmphasis: [
      "Execution context",
      "Constraints and dependencies",
      "Owners and stakeholders",
      "Risks and blockers",
      "Immediate next steps",
      "Open questions that could affect delivery",
    ],
    exampleDecisionQuestions: [
      "What should the team do next to unblock launch?",
      "Which workstream should be sequenced first?",
      "Should we reduce scope to hit the milestone?",
      "Who needs to decide or own the next action?",
      "What risks must be resolved before execution continues?",
    ],
  },
};

export const BRIEF_TYPES = [
  PRODUCT_DECISION_BRIEF,
  STRATEGY_DECISION_BRIEF,
  EXECUTION_DECISION_BRIEF,
] as const;

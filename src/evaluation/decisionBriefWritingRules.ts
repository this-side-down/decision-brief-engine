export const DECISION_BRIEF_WRITING_RULES_VERSION = 1;

export const SUMMARY_MAX_WORDS = 60;
export const SENTENCE_ERROR_WORDS = 35;
export const SENTENCE_WARNING_MIN_WORDS = 25;
export const MAX_SLASH_PAIRS = 2;
export const MAX_NEGATION_PATTERNS = 1;

export const BANNED_CANNED_PHRASES = [
  "it is important to note",
  "it is worth noting",
  "in today's",
  "in conclusion",
  "moving forward",
  "at the end of the day",
  "actionable insights",
] as const;

export const BANNED_SENTENCE_OPENERS = ["overall", "ultimately"] as const;

export const BANNED_CONSULTANT_FILLER = [
  "unlock value",
  "drive alignment",
  "key learnings",
  "best-in-class",
  "cutting-edge",
  "seamless",
  "synergy",
  "utilize",
  "delve",
  "pivotal",
  "holistic",
] as const;

export const GENERIC_BUSINESS_TERMS = [
  "stakeholder alignment",
  "value proposition",
  "strategic initiative",
  "operational excellence",
  "cross-functional",
  "leverage",
  "bandwidth",
  "north star",
  "low-hanging fruit",
  "circle back",
] as const;

export const INTENSIFIERS = [
  "very",
  "extremely",
  "highly",
  "significantly",
] as const;

export const DECISION_BRIEF_REQUIRED_SECTIONS = [
  "Summary",
  "Decision Context",
  "Options Considered",
  "Recommendation",
  "Risks and Constraints",
  "Open Questions",
  "Suggested Next Steps",
  "Confidence",
] as const;

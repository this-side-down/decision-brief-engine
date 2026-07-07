export type Confidence = "High" | "Medium" | "Low";

export type CaptureLayer = {
  source_summary: string;
  decision_context: string;
  stated_decision: string;
  implied_decision: string;
  goals: string[];
  stakeholders: string[];
  options_considered: string[];
  constraints: string[];
  risks: string[];
  assumptions: string[];
  evidence: string[];
  open_questions: string[];
  tensions: string[];
  recommendation_candidate: string;
  confidence: Confidence;
  missing_context: string[];
  suggested_next_steps: string[];
};

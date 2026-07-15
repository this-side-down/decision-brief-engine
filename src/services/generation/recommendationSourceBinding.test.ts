import { describe, expect, it } from "vitest";
import {
  recommendationWordsAlign,
  splitOverlongRecommendation,
} from "./recommendationSourceBinding";

const Q4_RECOMMENDATION = "Prioritize hospital project with Marcus as senior superintendent if multifamily closeout can be managed with PM-led coverage and school project backfilled with Carlos (promoted with training support), while ensuring hospital start date is confirmed and candidate availability is addressed by Friday.";

describe("Recommendation source binding", () => {
  it("splits Q4 at a genuine clause boundary while preserving words and order", () => {
    const transformed = splitOverlongRecommendation(Q4_RECOMMENDATION);
    expect(transformed).toContain("support). While ensuring");
    expect(recommendationWordsAlign(Q4_RECOMMENDATION, transformed)).toBe(true);
  });

  it("leaves a recommendation within 35 words unchanged", () => {
    const candidate = "Adopt the modular architecture after the readiness review.";
    expect(splitOverlongRecommendation(candidate)).toBe(candidate);
  });

  it.each([
    ["deletion", "Prioritize hospital project with Marcus as superintendent."],
    ["insertion", "Prioritize the urgent hospital project with Marcus as senior superintendent."],
    ["substitution", "Prioritize clinic project with Marcus as senior superintendent."],
    ["reordering", "Marcus should prioritize hospital project as senior superintendent."],
  ])("rejects lexical %s", (_case, rendered) => {
    expect(recommendationWordsAlign(
      "Prioritize hospital project with Marcus as senior superintendent.",
      rendered,
    )).toBe(false);
  });

  it("accepts punctuation-only sentence splitting and boundary capitalization", () => {
    expect(recommendationWordsAlign(
      "Choose Helix, while retaining the fallback.",
      "Choose Helix. While retaining the fallback.",
    )).toBe(true);
  });

  it("splits an overlong coordinated recommendation at an and-clause", () => {
    const source = "Protect hospital with Marcus as senior superintendent if multifamily closeout can be handed off to PM-led push with lighter coverage and school project promotion of Carlos with Luis owning training plan and backfilling foreman is paired with explicit training readiness and hiring backstop";
    const transformed = splitOverlongRecommendation(source);
    expect(transformed).toContain("lighter coverage. And school project");
    expect(recommendationWordsAlign(source, transformed)).toBe(true);
  });
});

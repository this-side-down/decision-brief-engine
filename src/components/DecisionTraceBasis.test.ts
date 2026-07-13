import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BasisListField } from "./DecisionTraceBasis";

describe("BasisListField", () => {
  it("renders nothing for an empty basis array", () => {
    expect(renderToStaticMarkup(BasisListField({ label: "Tradeoffs", items: [] }))).toBe("");
  });

  it("renders a singleton basis array as plain text without list markup", () => {
    const markup = renderToStaticMarkup(
      BasisListField({ label: "Tradeoffs", items: ["Only tradeoff"] }),
    );

    expect(markup).toContain("Tradeoffs");
    expect(markup).toContain("Only tradeoff");
    expect(markup).toContain("<p");
    expect(markup).not.toContain("<ul");
    expect(markup).not.toContain("<li");
  });

  it("renders two-item basis arrays as bulleted lists", () => {
    const markup = renderToStaticMarkup(
      BasisListField({
        label: "Tradeoffs",
        items: ["First tradeoff", "Second tradeoff"],
      }),
    );

    expect(markup).toContain("<ul");
    expect(markup).toMatch(/<li[^>]*>First tradeoff<\/li>/);
    expect(markup).toMatch(/<li[^>]*>Second tradeoff<\/li>/);
  });
});

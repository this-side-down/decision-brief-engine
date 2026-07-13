import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DISCLOSURE_CHEVRON_OPEN_CLASSES,
  DisclosureChevron,
} from "./DisclosureChevron";

describe("DisclosureChevron", () => {
  it("uses static default open classes", () => {
    expect(DISCLOSURE_CHEVRON_OPEN_CLASSES.default).toContain("group-open:rotate-90");
    expect(DISCLOSURE_CHEVRON_OPEN_CLASSES.default).toContain("group-open:text-slate-600");

    const markup = renderToStaticMarkup(DisclosureChevron());
    expect(markup).toContain("group-open:rotate-90");
    expect(markup).not.toContain("group-open/basis:rotate-90");
  });

  it("uses static basis open classes", () => {
    expect(DISCLOSURE_CHEVRON_OPEN_CLASSES.basis).toContain("group-open/basis:rotate-90");
    expect(DISCLOSURE_CHEVRON_OPEN_CLASSES.basis).toContain("group-open/basis:text-slate-600");

    const markup = renderToStaticMarkup(DisclosureChevron({ variant: "basis" }));
    expect(markup).toContain("group-open/basis:rotate-90");
    expect(markup).not.toContain("group-open:rotate-90");
  });

  it("does not construct Tailwind named-group classes at runtime", () => {
    const source = readFileSync(resolve(import.meta.dirname, "DisclosureChevron.tsx"), "utf8");

    expect(source).not.toMatch(/group-open\/\$\{/);
    expect(source).not.toMatch(/`group-open\//);
    expect(source).not.toContain("groupName");
  });
});

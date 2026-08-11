import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductHeader } from "./ProductHeader";

describe("ProductHeader", () => {
  it("makes the runtime, data boundary, pipeline, source, and license inspectable", () => {
    const markup = renderToStaticMarkup(
      <ProductHeader
        modeBadge="Mock"
        modeLabel="Mock demo"
        runtimeDescription="No model call is made."
        versionLabel="v0.3.2"
      />,
    );

    expect(markup).toContain("How this build works");
    expect(markup).toContain("No model call is made.");
    expect(markup).toContain("does not automatically persist decision content");
    expect(markup).toContain("generation mode is stored locally");
    expect(markup).toContain("WebGPU model files may be cached");
    expect(markup).toContain("Hidden model reasoning is neither shown nor stored");
    expect(markup).toContain("AI-native workflow");
    expect(markup).toContain("MIT license");
    expect(markup).toContain("this-side-down");
  });
});

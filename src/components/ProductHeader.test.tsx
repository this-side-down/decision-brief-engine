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
    expect(markup).toContain("keeps decision content in session memory by default");
    expect(markup).toContain("generation mode is stored locally");
    expect(markup).toContain("WebGPU model files may be cached");
    expect(markup).toContain("save raw WebGPU model output to disk");
    expect(markup).toContain("AI-native workflow");
    expect(markup).toContain("MIT license");
    expect(markup).toContain("this-side-down");
  });
});

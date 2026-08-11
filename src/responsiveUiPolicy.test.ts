import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("public UI policy", () => {
  it("does not make an incidental remote font request", () => {
    const styles = readSource("src/styles.css");

    expect(styles).not.toMatch(/fonts\.googleapis\.com|fonts\.gstatic\.com/);
    expect(styles).not.toMatch(/@import\s+url\(https?:\/\//);
  });

  it("keeps the mobile shell scrollable and the desktop shell bounded", () => {
    const app = readSource("src/App.tsx");
    const styles = readSource("src/styles.css");

    expect(styles).toContain("min-width: 320px");
    expect(styles).toMatch(/@media \(min-width: 64rem\)[\s\S]*overflow: hidden/);
    expect(app).toContain("min-h-dvh");
    expect(app).toContain("lg:h-screen lg:overflow-hidden");
    expect(app).toContain("grid-cols-1 divide-y");
    expect(app).toContain("lg:divide-x lg:divide-y-0 lg:overflow-hidden");
  });

  it("keeps narrow supporting artifacts and actions reachable", () => {
    const app = readSource("src/App.tsx");
    const traceBasis = readSource("src/components/DecisionTraceBasis.tsx");

    expect(app).toContain("min-h-[28rem]");
    expect(app).toContain("min-h-[40rem]");
    expect(app).toContain("flex-wrap gap-2");
    expect(traceBasis).toContain("lg:max-h-[min(40vh,24rem)]");
    expect(traceBasis).not.toContain(
      'className="mt-3 min-h-0 max-h-[min(40vh,24rem)]',
    );
  });
});

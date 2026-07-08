import { describe, expect, it } from "vitest";
import { formatAppVersionLabel } from "./appVersion";

describe("formatAppVersionLabel", () => {
  it("formats a semver version with demo suffix", () => {
    expect(formatAppVersionLabel("0.1.0")).toBe("v0.1.0 demo");
  });
});

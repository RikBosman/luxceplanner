import { describe, expect, it } from "vitest";
import { safeAppPath } from "./safe-redirect";

describe("safeAppPath", () => {
  it("staat interne app-paden toe", () => {
    expect(safeAppPath("/app")).toBe("/app");
    expect(safeAppPath("/app/projecten/123")).toBe("/app/projecten/123");
  });
  it("weigert externe en vreemde paden", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "/inloggen", "app", null, 3, "/application"]) {
      expect(safeAppPath(bad)).toBe("/app");
    }
  });
});

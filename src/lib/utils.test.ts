import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges multiple class names", () => {
    expect(cn("p-4", "m-2")).toBe("p-4 m-2");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden")).toBe("base");
    expect(cn("base", true && "visible")).toBe("base visible");
  });

  it("resolves conflicting Tailwind classes (last wins)", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("handles undefined and null values", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });

  it("handles empty string inputs", () => {
    expect(cn("", "foo", "")).toBe("foo");
  });
});

import { describe, it, expect, vi } from "vitest";
import { logger } from "./logger";

describe("logger", () => {
  it("should expose info, warn, and error methods", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("logger.error should not throw when called with various arguments", () => {
    expect(() => logger.error("test error")).not.toThrow();
    expect(() => logger.error("test", new Error("boom"))).not.toThrow();
    expect(() => logger.error("test", { key: "value" })).not.toThrow();
  });

  it("logger.info should not throw when called", () => {
    expect(() => logger.info("info message")).not.toThrow();
  });

  it("logger.warn should not throw when called", () => {
    expect(() => logger.warn("warning message")).not.toThrow();
  });

  it("logger.error should call console.error in dev mode", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // import.meta.env.DEV is true in vitest
    logger.error("test error message");
    expect(spy).toHaveBeenCalledWith("test error message");
    spy.mockRestore();
  });
});

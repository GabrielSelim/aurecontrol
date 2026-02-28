import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello"));
    expect(result.current).toBe("hello");
  });

  it("does not update value before delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe("a");
  });

  it("updates value after delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("ab");
  });

  it("resets timer on rapid changes (only latest value is used)", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } }
    );

    rerender({ value: "ab" });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    rerender({ value: "abc" });
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // 300ms total but timer was reset — should still show "a"
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Now 300ms since last change — should show "abc"
    expect(result.current).toBe("abc");
  });

  it("uses default delay of 300ms", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: "initial" } }
    );

    rerender({ value: "updated" });
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("updated");
  });

  it("supports custom delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "start" } }
    );

    rerender({ value: "end" });
    act(() => {
      vi.advanceTimersByTime(499);
    });
    expect(result.current).toBe("start");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("end");
  });

  it("works with non-string types", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 42 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe(42);
  });

  it("handles null and undefined values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: "text" as string | null } }
    );

    rerender({ value: null });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBeNull();
  });
});

import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDocumentTitle } from "./useDocumentTitle";

describe("useDocumentTitle", () => {
  const original = document.title;

  afterEach(() => {
    document.title = original;
  });

  it("sets title with '| Aure' suffix", () => {
    renderHook(() => useDocumentTitle("Dashboard"));
    expect(document.title).toBe("Dashboard | Aure");
  });

  it("sets 'Aure' when given empty string", () => {
    renderHook(() => useDocumentTitle(""));
    expect(document.title).toBe("Aure");
  });

  it("restores previous title on unmount", () => {
    document.title = "Previous";
    const { unmount } = renderHook(() => useDocumentTitle("New"));
    expect(document.title).toBe("New | Aure");
    unmount();
    expect(document.title).toBe("Previous");
  });

  it("updates when title changes", () => {
    const { rerender } = renderHook(({ t }) => useDocumentTitle(t), {
      initialProps: { t: "A" },
    });
    expect(document.title).toBe("A | Aure");
    rerender({ t: "B" });
    expect(document.title).toBe("B | Aure");
  });
});

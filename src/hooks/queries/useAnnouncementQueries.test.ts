import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

/* ------------------------------------------------------------------ */
/*  Mock services                                                     */
/* ------------------------------------------------------------------ */
vi.mock("@/services/announcementService", () => ({
  fetchActiveAnnouncements: vi.fn(),
  fetchAnnouncementReads: vi.fn(),
  markAnnouncementAsRead: vi.fn(),
  markAllAnnouncementsAsRead: vi.fn(),
}));

import {
  fetchActiveAnnouncements,
  fetchAnnouncementReads,
  markAnnouncementAsRead,
  markAllAnnouncementsAsRead,
} from "@/services/announcementService";

import {
  useActiveAnnouncements,
  useAnnouncementReads,
  useMarkAnnouncementRead,
  useMarkAllAnnouncementsRead,
} from "./useAnnouncementQueries";

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

const mockedFetchActive = fetchActiveAnnouncements as ReturnType<typeof vi.fn>;
const mockedFetchReads = fetchAnnouncementReads as ReturnType<typeof vi.fn>;
const mockedMarkRead = markAnnouncementAsRead as ReturnType<typeof vi.fn>;
const mockedMarkAllRead = markAllAnnouncementsAsRead as ReturnType<typeof vi.fn>;

beforeEach(() => vi.clearAllMocks());

/* ------------------------------------------------------------------ */
/*  useActiveAnnouncements                                            */
/* ------------------------------------------------------------------ */

describe("useActiveAnnouncements", () => {
  it("fetches active announcements", async () => {
    const announcements = [
      { id: "a-1", title: "News", content: "Hello" },
      { id: "a-2", title: "Update", content: "World" },
    ];
    mockedFetchActive.mockResolvedValue(announcements);

    const { result } = renderHook(() => useActiveAnnouncements(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(announcements);
  });

  it("handles errors", async () => {
    mockedFetchActive.mockRejectedValue(new Error("fail"));

    const { result } = renderHook(() => useActiveAnnouncements(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

/* ------------------------------------------------------------------ */
/*  useAnnouncementReads                                              */
/* ------------------------------------------------------------------ */

describe("useAnnouncementReads", () => {
  it("is disabled when userId is undefined", () => {
    const { result } = renderHook(() => useAnnouncementReads(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedFetchReads).not.toHaveBeenCalled();
  });

  it("fetches reads for a given userId", async () => {
    const reads = [{ announcement_id: "a-1", user_id: "u-1" }];
    mockedFetchReads.mockResolvedValue(reads);

    const { result } = renderHook(() => useAnnouncementReads("u-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(reads);
    expect(mockedFetchReads).toHaveBeenCalledWith("u-1");
  });
});

/* ------------------------------------------------------------------ */
/*  useMarkAnnouncementRead                                           */
/* ------------------------------------------------------------------ */

describe("useMarkAnnouncementRead", () => {
  it("calls markAnnouncementAsRead with correct params", async () => {
    mockedMarkRead.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMarkAnnouncementRead(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      announcementId: "a-1",
      userId: "u-1",
    });

    expect(mockedMarkRead).toHaveBeenCalledWith("a-1", "u-1");
  });
});

/* ------------------------------------------------------------------ */
/*  useMarkAllAnnouncementsRead                                       */
/* ------------------------------------------------------------------ */

describe("useMarkAllAnnouncementsRead", () => {
  it("calls markAllAnnouncementsAsRead with correct params", async () => {
    mockedMarkAllRead.mockResolvedValue(undefined);

    const { result } = renderHook(() => useMarkAllAnnouncementsRead(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      announcementIds: ["a-1", "a-2"],
      userId: "u-1",
    });

    expect(mockedMarkAllRead).toHaveBeenCalledWith(["a-1", "a-2"], "u-1");
  });
});

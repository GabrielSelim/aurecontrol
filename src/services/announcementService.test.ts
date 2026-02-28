import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/*  Supabase mock (vi.hoisted pattern)                                */
/* ------------------------------------------------------------------ */
const { queryMock, channelMock } = vi.hoisted(() => {
  const qm: Record<string, ReturnType<typeof vi.fn>> = {};
  const chainMethods = [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "in", "is", "gte", "lte", "lt", "gt",
    "order", "limit", "range", "filter",
  ];
  for (const method of chainMethods) {
    qm[method] = vi.fn().mockReturnValue(qm);
  }
  qm.single = vi.fn().mockResolvedValue({ data: null, error: null });
  qm.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  qm.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null, count: null })
  );

  const cm = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };

  return { queryMock: qm, channelMock: cm };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => queryMock),
    channel: vi.fn(() => channelMock),
    removeChannel: vi.fn(),
  },
}));

import {
  fetchActiveAnnouncements,
  fetchAnnouncementReads,
  markAnnouncementAsRead,
  markAllAnnouncementsAsRead,
  subscribeToAnnouncements,
} from "./announcementService";
import { supabase } from "@/integrations/supabase/client";

beforeEach(() => {
  vi.clearAllMocks();
  queryMock.single.mockResolvedValue({ data: null, error: null });
  queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
  queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null, count: null })
  );
});

/* ------------------------------------------------------------------ */
/*  fetchActiveAnnouncements                                          */
/* ------------------------------------------------------------------ */

describe("fetchActiveAnnouncements", () => {
  it("returns announcements on success", async () => {
    const announcements = [{ id: "a-1", title: "Update" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: announcements, error: null })
    );
    const result = await fetchActiveAnnouncements();
    expect(result).toEqual(announcements);
  });

  it("throws on error", async () => {
    const err = new Error("db");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(fetchActiveAnnouncements()).rejects.toBe(err);
  });

  it("calls from with system_announcements", async () => {
    await fetchActiveAnnouncements();
    expect(supabase.from).toHaveBeenCalledWith("system_announcements");
  });
});

/* ------------------------------------------------------------------ */
/*  fetchAnnouncementReads                                            */
/* ------------------------------------------------------------------ */

describe("fetchAnnouncementReads", () => {
  it("returns reads on success", async () => {
    const reads = [{ announcement_id: "a-1" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: reads, error: null })
    );
    const result = await fetchAnnouncementReads("u-1");
    expect(result).toEqual(reads);
  });

  it("throws on error", async () => {
    const err = new Error("db");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(fetchAnnouncementReads("u-1")).rejects.toBe(err);
  });
});

/* ------------------------------------------------------------------ */
/*  markAnnouncementAsRead                                            */
/* ------------------------------------------------------------------ */

describe("markAnnouncementAsRead", () => {
  it("upserts read record", async () => {
    await markAnnouncementAsRead("a-1", "u-1");
    expect(queryMock.upsert).toHaveBeenCalledWith(
      { announcement_id: "a-1", user_id: "u-1" },
      { onConflict: "announcement_id,user_id" }
    );
  });

  it("throws on error", async () => {
    const err = new Error("upsert fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(markAnnouncementAsRead("a-1", "u-1")).rejects.toBe(err);
  });
});

/* ------------------------------------------------------------------ */
/*  markAllAnnouncementsAsRead                                        */
/* ------------------------------------------------------------------ */

describe("markAllAnnouncementsAsRead", () => {
  it("upserts multiple read records", async () => {
    await markAllAnnouncementsAsRead(["a-1", "a-2"], "u-1");
    expect(queryMock.upsert).toHaveBeenCalledWith(
      [
        { announcement_id: "a-1", user_id: "u-1" },
        { announcement_id: "a-2", user_id: "u-1" },
      ],
      { onConflict: "announcement_id,user_id" }
    );
  });

  it("throws on error", async () => {
    const err = new Error("upsert fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(markAllAnnouncementsAsRead(["a-1"], "u-1")).rejects.toBe(err);
  });
});

/* ------------------------------------------------------------------ */
/*  subscribeToAnnouncements                                          */
/* ------------------------------------------------------------------ */

describe("subscribeToAnnouncements", () => {
  it("creates a channel and subscribes", () => {
    const callback = vi.fn();
    subscribeToAnnouncements(callback);

    expect(supabase.channel).toHaveBeenCalledWith("announcements-changes");
    expect(channelMock.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "system_announcements" },
      callback
    );
    expect(channelMock.subscribe).toHaveBeenCalled();
  });

  it("returns an unsubscribe function", () => {
    const unsubscribe = subscribeToAnnouncements(vi.fn());
    expect(typeof unsubscribe).toBe("function");

    unsubscribe();
    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

/* ------------------------------------------------------------------ */
/*  Supabase mock (vi.hoisted pattern)                                */
/* ------------------------------------------------------------------ */
const { queryMock } = vi.hoisted(() => {
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
  return { queryMock: qm };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => queryMock),
  },
}));

import { supabase } from "@/integrations/supabase/client";
import {
  fetchNotificationPreferences,
  upsertNotificationPreferences,
  fetchNotificationLogs,
  fetchDetailedNotificationLogs,
  fetchDeliveryLogs,
} from "./notificationService";

beforeEach(() => {
  vi.clearAllMocks();
  queryMock.single.mockResolvedValue({ data: null, error: null });
  queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
  queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null, count: null })
  );
});

/* ------------------------------------------------------------------ */
/*  fetchNotificationPreferences                                      */
/* ------------------------------------------------------------------ */

describe("fetchNotificationPreferences", () => {
  it("returns preferences on success", async () => {
    const prefs = [{ notification_type: "email", is_enabled: true }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: prefs, error: null })
    );
    const result = await fetchNotificationPreferences("u-1");
    expect(result).toEqual(prefs);
  });

  it("queries notification_preferences table with user_id", async () => {
    await fetchNotificationPreferences("u-1");
    expect(supabase.from).toHaveBeenCalledWith("notification_preferences");
    expect(queryMock.eq).toHaveBeenCalledWith("user_id", "u-1");
  });

  it("throws on error", async () => {
    const err = new Error("db");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(fetchNotificationPreferences("u-1")).rejects.toBe(err);
  });
});

/* ------------------------------------------------------------------ */
/*  upsertNotificationPreferences                                     */
/* ------------------------------------------------------------------ */

describe("upsertNotificationPreferences", () => {
  it("upserts with user_id and onConflict", async () => {
    const prefs = [
      {
        notification_type: "email",
        channel_email: true,
        channel_in_app: false,
        is_enabled: true,
      },
    ];
    await upsertNotificationPreferences("u-1", prefs);
    expect(queryMock.upsert).toHaveBeenCalledWith(
      [
        {
          user_id: "u-1",
          notification_type: "email",
          channel_email: true,
          channel_in_app: false,
          is_enabled: true,
        },
      ],
      { onConflict: "user_id,notification_type" }
    );
  });

  it("throws on error", async () => {
    const err = new Error("upsert fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(
      upsertNotificationPreferences("u-1", [
        {
          notification_type: "sms",
          channel_email: false,
          channel_in_app: true,
          is_enabled: true,
        },
      ])
    ).rejects.toBe(err);
  });
});

/* ------------------------------------------------------------------ */
/*  fetchNotificationLogs                                             */
/* ------------------------------------------------------------------ */

describe("fetchNotificationLogs", () => {
  it("returns logs on success", async () => {
    const logs = [{ id: "n-1", notification_type: "email" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: logs, error: null })
    );
    const result = await fetchNotificationLogs();
    expect(result).toEqual(logs);
  });

  it("applies typeFilter when not 'all'", async () => {
    await fetchNotificationLogs("email");
    expect(queryMock.eq).toHaveBeenCalledWith("notification_type", "email");
  });

  it("does not apply typeFilter when 'all'", async () => {
    queryMock.eq.mockClear();
    await fetchNotificationLogs("all");
    // eq should not be called with notification_type
    const calls = queryMock.eq.mock.calls;
    const hasTypeFilter = calls.some(
      (c: unknown[]) => c[0] === "notification_type"
    );
    expect(hasTypeFilter).toBe(false);
  });

  it("throws on error", async () => {
    const err = new Error("db");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(fetchNotificationLogs()).rejects.toBe(err);
  });
});

/* ------------------------------------------------------------------ */
/*  fetchDetailedNotificationLogs                                     */
/* ------------------------------------------------------------------ */

describe("fetchDetailedNotificationLogs", () => {
  it("returns detailed logs on success", async () => {
    const logs = [{ id: "n-1" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: logs, error: null })
    );
    const result = await fetchDetailedNotificationLogs();
    expect(result).toEqual(logs);
  });

  it("queries notification_logs with company join", async () => {
    await fetchDetailedNotificationLogs();
    expect(supabase.from).toHaveBeenCalledWith("notification_logs");
    expect(queryMock.select).toHaveBeenCalledWith(
      "*, companies:company_id(name)"
    );
  });
});

/* ------------------------------------------------------------------ */
/*  fetchDeliveryLogs                                                 */
/* ------------------------------------------------------------------ */

describe("fetchDeliveryLogs", () => {
  it("returns delivery logs for notification", async () => {
    const logs = [{ id: "dl-1", attempt_number: 1 }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: logs, error: null })
    );
    const result = await fetchDeliveryLogs("n-1");
    expect(result).toEqual(logs);
  });

  it("queries notification_delivery_logs with log id", async () => {
    await fetchDeliveryLogs("n-1");
    expect(supabase.from).toHaveBeenCalledWith("notification_delivery_logs");
    expect(queryMock.eq).toHaveBeenCalledWith("notification_log_id", "n-1");
  });

  it("throws on error", async () => {
    const err = new Error("db");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(fetchDeliveryLogs("n-1")).rejects.toBe(err);
  });
});

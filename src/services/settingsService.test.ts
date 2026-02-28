import { describe, it, expect, vi, beforeEach } from "vitest";

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

import {
  fetchSystemSetting,
  upsertSystemSetting,
  fetchActivePricingTiers,
  fetchPricingTiersForDisplay,
  fetchDiscountCoupons,
  fetchPromotions,
  savePricingTier,
  deletePricingTier,
  saveCoupon,
  deleteCoupon,
  savePromotion,
  deletePromotion,
  fetchAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  toggleAnnouncement,
} from "./settingsService";

beforeEach(() => {
  vi.clearAllMocks();
  queryMock.single.mockResolvedValue({ data: null, error: null });
  queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
  queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null, count: null })
  );
});

/* ------------------------------------------------------------------ */
/*  System Settings                                                   */
/* ------------------------------------------------------------------ */

describe("fetchSystemSetting", () => {
  it("returns value when setting exists", async () => {
    queryMock.maybeSingle.mockResolvedValue({ data: { value: '{"amount":49.9}' }, error: null });
    expect(await fetchSystemSetting("pj_contract_price")).toBe('{"amount":49.9}');
  });

  it("returns null when setting not found", async () => {
    queryMock.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await fetchSystemSetting("nonexistent")).toBeNull();
  });

  it("throws on error", async () => {
    const err = new Error("db err");
    queryMock.maybeSingle.mockResolvedValue({ data: null, error: err });
    await expect(fetchSystemSetting("key")).rejects.toBe(err);
  });
});

describe("upsertSystemSetting", () => {
  it("succeeds on upsert", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(upsertSystemSetting("key", "val")).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    const err = new Error("fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(upsertSystemSetting("key", "val")).rejects.toBe(err);
  });
});

/* ------------------------------------------------------------------ */
/*  Pricing Tiers                                                     */
/* ------------------------------------------------------------------ */

describe("fetchActivePricingTiers", () => {
  it("returns active tiers", async () => {
    const tiers = [{ id: "1", min_contracts: 1 }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: tiers, error: null })
    );
    expect(await fetchActivePricingTiers()).toEqual(tiers);
  });

  it("returns empty array on null", async () => {
    expect(await fetchActivePricingTiers()).toEqual([]);
  });
});

describe("fetchPricingTiersForDisplay", () => {
  it("returns display tiers", async () => {
    const tiers = [{ min_contracts: 1, max_contracts: 10, price_per_contract: 49.9 }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: tiers, error: null })
    );
    expect(await fetchPricingTiersForDisplay()).toEqual(tiers);
  });
});

/* ------------------------------------------------------------------ */
/*  Discount Coupons                                                  */
/* ------------------------------------------------------------------ */

describe("fetchDiscountCoupons", () => {
  it("returns coupons", async () => {
    const coupons = [{ id: "c1", code: "OFF10" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: coupons, error: null })
    );
    expect(await fetchDiscountCoupons()).toEqual(coupons);
  });
});

/* ------------------------------------------------------------------ */
/*  Promotions                                                        */
/* ------------------------------------------------------------------ */

describe("fetchPromotions", () => {
  it("returns promotions", async () => {
    const promos = [{ id: "p1", name: "Black Friday" }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: promos, error: null })
    );
    expect(await fetchPromotions()).toEqual(promos);
  });
});

/* ------------------------------------------------------------------ */
/*  Save / Delete with Branch Logic                                   */
/* ------------------------------------------------------------------ */

describe("savePricingTier", () => {
  it("inserts when no id provided", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(savePricingTier({ min_contracts: 1 })).resolves.toBeUndefined();
    expect(queryMock.insert).toHaveBeenCalled();
  });

  it("updates when id is provided", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(savePricingTier({ id: "t1", min_contracts: 5 })).resolves.toBeUndefined();
    expect(queryMock.update).toHaveBeenCalled();
  });

  it("throws on insert error", async () => {
    const err = new Error("insert fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(savePricingTier({ min_contracts: 1 })).rejects.toBe(err);
  });
});

describe("deletePricingTier", () => {
  it("deletes tier", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(deletePricingTier("t1")).resolves.toBeUndefined();
    expect(queryMock.delete).toHaveBeenCalled();
  });
});

describe("saveCoupon", () => {
  it("inserts when no id", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await saveCoupon({ code: "NEW" });
    expect(queryMock.insert).toHaveBeenCalled();
  });

  it("updates when id provided", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await saveCoupon({ id: "c1", code: "UPD" });
    expect(queryMock.update).toHaveBeenCalled();
  });
});

describe("deleteCoupon", () => {
  it("deletes coupon", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(deleteCoupon("c1")).resolves.toBeUndefined();
  });
});

describe("savePromotion", () => {
  it("inserts when no id", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await savePromotion({ name: "Summer" });
    expect(queryMock.insert).toHaveBeenCalled();
  });

  it("updates when id provided", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await savePromotion({ id: "p1", name: "Winter" });
    expect(queryMock.update).toHaveBeenCalled();
  });
});

describe("deletePromotion", () => {
  it("deletes promotion", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(deletePromotion("p1")).resolves.toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Announcements                                                     */
/* ------------------------------------------------------------------ */

describe("fetchAnnouncements", () => {
  it("returns announcements with profile join", async () => {
    const annc = [{ id: "a1", title: "Update", profiles: { full_name: "Admin" } }];
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: annc, error: null })
    );
    expect(await fetchAnnouncements()).toEqual(annc);
  });
});

describe("saveAnnouncement", () => {
  it("inserts when no id and returns data", async () => {
    const result = { id: "new-1", title: "Test" };
    queryMock.single.mockResolvedValue({ data: result, error: null });
    expect(await saveAnnouncement({ title: "Test" })).toEqual(result);
  });

  it("updates when id provided and returns data", async () => {
    const result = { id: "a1", title: "Updated" };
    queryMock.single.mockResolvedValue({ data: result, error: null });
    expect(await saveAnnouncement({ id: "a1", title: "Updated" })).toEqual(result);
  });

  it("throws on error", async () => {
    const err = new Error("save fail");
    queryMock.single.mockResolvedValue({ data: null, error: err });
    await expect(saveAnnouncement({ title: "X" })).rejects.toBe(err);
  });
});

describe("deleteAnnouncement", () => {
  it("deletes announcement", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(deleteAnnouncement("a1")).resolves.toBeUndefined();
  });
});

describe("toggleAnnouncement", () => {
  it("toggles is_active", async () => {
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null })
    );
    await expect(toggleAnnouncement("a1", false)).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    const err = new Error("toggle fail");
    queryMock.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: err })
    );
    await expect(toggleAnnouncement("a1", true)).rejects.toBe(err);
  });
});

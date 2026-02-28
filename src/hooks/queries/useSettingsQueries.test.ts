import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

/* ------------------------------------------------------------------ */
/*  Mock services                                                     */
/* ------------------------------------------------------------------ */
vi.mock("@/services/settingsService", () => ({
  fetchSystemSetting: vi.fn(),
  upsertSystemSetting: vi.fn(),
  fetchActivePricingTiers: vi.fn(),
  fetchDiscountCoupons: vi.fn(),
  fetchPromotions: vi.fn(),
  fetchAnnouncements: vi.fn(),
  savePricingTier: vi.fn(),
  deletePricingTier: vi.fn(),
  saveCoupon: vi.fn(),
  deleteCoupon: vi.fn(),
  savePromotion: vi.fn(),
  deletePromotion: vi.fn(),
  saveAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
  toggleAnnouncement: vi.fn(),
}));

import {
  fetchSystemSetting,
  upsertSystemSetting,
  fetchActivePricingTiers,
  fetchDiscountCoupons,
  fetchPromotions,
  fetchAnnouncements,
  savePricingTier,
  deletePricingTier,
  saveCoupon,
  deleteCoupon,
  savePromotion,
  deletePromotion,
  saveAnnouncement,
  deleteAnnouncement,
  toggleAnnouncement,
} from "@/services/settingsService";

import {
  useSystemSetting,
  usePricingTiers,
  useDiscountCoupons,
  usePromotions,
  useSettingsAnnouncements,
  useUpsertSystemSetting,
  useSavePricingTier,
  useDeletePricingTier,
  useSaveCoupon,
  useDeleteCoupon,
  useSavePromotion,
  useDeletePromotion,
  useSaveAnnouncement,
  useDeleteAnnouncement,
  useToggleAnnouncement,
} from "./useSettingsQueries";

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

const mocked = {
  fetchSystemSetting: fetchSystemSetting as ReturnType<typeof vi.fn>,
  upsertSystemSetting: upsertSystemSetting as ReturnType<typeof vi.fn>,
  fetchActivePricingTiers: fetchActivePricingTiers as ReturnType<typeof vi.fn>,
  fetchDiscountCoupons: fetchDiscountCoupons as ReturnType<typeof vi.fn>,
  fetchPromotions: fetchPromotions as ReturnType<typeof vi.fn>,
  fetchAnnouncements: fetchAnnouncements as ReturnType<typeof vi.fn>,
  savePricingTier: savePricingTier as ReturnType<typeof vi.fn>,
  deletePricingTier: deletePricingTier as ReturnType<typeof vi.fn>,
  saveCoupon: saveCoupon as ReturnType<typeof vi.fn>,
  deleteCoupon: deleteCoupon as ReturnType<typeof vi.fn>,
  savePromotion: savePromotion as ReturnType<typeof vi.fn>,
  deletePromotion: deletePromotion as ReturnType<typeof vi.fn>,
  saveAnnouncement: saveAnnouncement as ReturnType<typeof vi.fn>,
  deleteAnnouncement: deleteAnnouncement as ReturnType<typeof vi.fn>,
  toggleAnnouncement: toggleAnnouncement as ReturnType<typeof vi.fn>,
};

beforeEach(() => vi.clearAllMocks());

/* ================================================================== */
/*  QUERIES                                                           */
/* ================================================================== */

describe("useSystemSetting", () => {
  it("fetches a setting by key", async () => {
    mocked.fetchSystemSetting.mockResolvedValue({ amount: 49.9 });

    const { result } = renderHook(() => useSystemSetting("pj_contract_price"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ amount: 49.9 });
    expect(mocked.fetchSystemSetting).toHaveBeenCalledWith("pj_contract_price");
  });
});

describe("usePricingTiers", () => {
  it("fetches active pricing tiers", async () => {
    const tiers = [{ id: "t-1", min_contracts: 1, price_per_contract: 39.9 }];
    mocked.fetchActivePricingTiers.mockResolvedValue(tiers);

    const { result } = renderHook(() => usePricingTiers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(tiers);
  });
});

describe("useDiscountCoupons", () => {
  it("fetches coupons", async () => {
    const coupons = [{ id: "c-1", code: "SALE10" }];
    mocked.fetchDiscountCoupons.mockResolvedValue(coupons);

    const { result } = renderHook(() => useDiscountCoupons(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(coupons);
  });
});

describe("usePromotions", () => {
  it("fetches promotions", async () => {
    const promos = [{ id: "p-1", name: "Summer" }];
    mocked.fetchPromotions.mockResolvedValue(promos);

    const { result } = renderHook(() => usePromotions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(promos);
  });
});

describe("useSettingsAnnouncements", () => {
  it("fetches admin announcements", async () => {
    const anns = [{ id: "a-1", title: "Maintenance" }];
    mocked.fetchAnnouncements.mockResolvedValue(anns);

    const { result } = renderHook(() => useSettingsAnnouncements(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(anns);
  });
});

/* ================================================================== */
/*  MUTATIONS                                                         */
/* ================================================================== */

describe("useUpsertSystemSetting", () => {
  it("upserts setting with key and value", async () => {
    mocked.upsertSystemSetting.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpsertSystemSetting(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ key: "pj_contract_price", value: "59.9" });
    expect(mocked.upsertSystemSetting).toHaveBeenCalledWith("pj_contract_price", "59.9");
  });
});

describe("useSavePricingTier", () => {
  it("saves a pricing tier", async () => {
    const tier = { min_contracts: 1, max_contracts: 10, price_per_contract: 35 };
    mocked.savePricingTier.mockResolvedValue({ id: "t-new", ...tier });

    const { result } = renderHook(() => useSavePricingTier(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(tier);
    expect(mocked.savePricingTier).toHaveBeenCalledWith(tier);
  });
});

describe("useDeletePricingTier", () => {
  it("deletes a pricing tier by id", async () => {
    mocked.deletePricingTier.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeletePricingTier(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync("t-1");
    expect(mocked.deletePricingTier).toHaveBeenCalledWith("t-1");
  });
});

describe("useSaveCoupon", () => {
  it("saves a coupon", async () => {
    const coupon = { code: "NEW20", discount_percent: 20 };
    mocked.saveCoupon.mockResolvedValue({ id: "c-new", ...coupon });

    const { result } = renderHook(() => useSaveCoupon(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(coupon);
    expect(mocked.saveCoupon).toHaveBeenCalledWith(coupon);
  });
});

describe("useDeleteCoupon", () => {
  it("deletes a coupon", async () => {
    mocked.deleteCoupon.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteCoupon(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync("c-1");
    expect(mocked.deleteCoupon).toHaveBeenCalledWith("c-1");
  });
});

describe("useSavePromotion", () => {
  it("saves a promotion", async () => {
    const promo = { name: "Black Friday", discount: 30 };
    mocked.savePromotion.mockResolvedValue({ id: "p-new", ...promo });

    const { result } = renderHook(() => useSavePromotion(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(promo);
    expect(mocked.savePromotion).toHaveBeenCalledWith(promo);
  });
});

describe("useDeletePromotion", () => {
  it("deletes a promotion", async () => {
    mocked.deletePromotion.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeletePromotion(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync("p-1");
    expect(mocked.deletePromotion).toHaveBeenCalledWith("p-1");
  });
});

describe("useSaveAnnouncement", () => {
  it("saves an announcement", async () => {
    const ann = { title: "Update", content: "v2 released" };
    mocked.saveAnnouncement.mockResolvedValue({ id: "a-new", ...ann });

    const { result } = renderHook(() => useSaveAnnouncement(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync(ann);
    expect(mocked.saveAnnouncement).toHaveBeenCalledWith(ann);
  });
});

describe("useDeleteAnnouncement", () => {
  it("deletes an announcement", async () => {
    mocked.deleteAnnouncement.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteAnnouncement(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync("a-1");
    expect(mocked.deleteAnnouncement).toHaveBeenCalledWith("a-1");
  });
});

describe("useToggleAnnouncement", () => {
  it("toggles announcement active state", async () => {
    mocked.toggleAnnouncement.mockResolvedValue(undefined);

    const { result } = renderHook(() => useToggleAnnouncement(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({ id: "a-1", isActive: false });
    expect(mocked.toggleAnnouncement).toHaveBeenCalledWith("a-1", false);
  });
});

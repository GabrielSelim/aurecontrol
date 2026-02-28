import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { queryKeys } from "./queryKeys";

/* ------------------------------------------------------------------ */
/*  System setting queries                                            */
/* ------------------------------------------------------------------ */

export function useSystemSetting(key: string) {
  return useQuery({
    queryKey: queryKeys.settings.setting(key),
    queryFn: () => fetchSystemSetting(key),
  });
}

export function usePricingTiers() {
  return useQuery({
    queryKey: queryKeys.settings.pricingTiers(),
    queryFn: fetchActivePricingTiers,
  });
}

export function useDiscountCoupons() {
  return useQuery({
    queryKey: queryKeys.settings.coupons(),
    queryFn: fetchDiscountCoupons,
  });
}

export function usePromotions() {
  return useQuery({
    queryKey: queryKeys.settings.promotions(),
    queryFn: fetchPromotions,
  });
}

export function useSettingsAnnouncements() {
  return useQuery({
    queryKey: queryKeys.announcements.admin(),
    queryFn: fetchAnnouncements,
  });
}

/* ------------------------------------------------------------------ */
/*  System setting mutation                                           */
/* ------------------------------------------------------------------ */

export function useUpsertSystemSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      upsertSystemSetting(key, value as string),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.setting(variables.key) });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Pricing tier mutations                                            */
/* ------------------------------------------------------------------ */

export function useSavePricingTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tier: Record<string, unknown>) => savePricingTier(tier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.pricingTiers() });
    },
  });
}

export function useDeletePricingTier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePricingTier(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.pricingTiers() });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Coupon mutations                                                  */
/* ------------------------------------------------------------------ */

export function useSaveCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (coupon: Record<string, unknown>) => saveCoupon(coupon),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.coupons() });
    },
  });
}

export function useDeleteCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.coupons() });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Promotion mutations                                               */
/* ------------------------------------------------------------------ */

export function useSavePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (promo: Record<string, unknown>) => savePromotion(promo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.promotions() });
    },
  });
}

export function useDeletePromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePromotion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.settings.promotions() });
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Announcement mutations (admin CRUD)                               */
/* ------------------------------------------------------------------ */

export function useSaveAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (announcement: Record<string, unknown>) => saveAnnouncement(announcement),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}

export function useToggleAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleAnnouncement(id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}

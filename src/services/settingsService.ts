import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  System Settings                                                   */
/* ------------------------------------------------------------------ */

export async function fetchSystemSetting(key: string) {
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) throw error;
  return data?.value ?? null;
}

export async function upsertSystemSetting(
  key: string,
  value: string
) {
  const { error } = await supabase
    .from("system_settings")
    .upsert({ key, value }, { onConflict: "key" });

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Pricing Tiers                                                     */
/* ------------------------------------------------------------------ */

export async function fetchActivePricingTiers() {
  const { data, error } = await supabase
    .from("pricing_tiers")
    .select("*")
    .eq("is_active", true)
    .order("min_contracts", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchPricingTiersForDisplay() {
  const { data, error } = await supabase
    .from("pricing_tiers")
    .select("min_contracts, max_contracts, price_per_contract")
    .eq("is_active", true)
    .order("min_contracts", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/*  Discount Coupons                                                  */
/* ------------------------------------------------------------------ */

export async function fetchDiscountCoupons() {
  const { data, error } = await supabase
    .from("discount_coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/*  Promotions                                                        */
/* ------------------------------------------------------------------ */

export async function fetchPromotions() {
  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/*  Pricing Tier Mutations                                            */
/* ------------------------------------------------------------------ */

export async function savePricingTier(tier: Record<string, unknown>) {
  if (tier.id) {
    const { id, ...fields } = tier;
    const { error } = await supabase
      .from("pricing_tiers")
      .update(fields as never)
      .eq("id", id as string);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("pricing_tiers").insert(tier as never);
    if (error) throw error;
  }
}

export async function deletePricingTier(tierId: string) {
  const { error } = await supabase
    .from("pricing_tiers")
    .delete()
    .eq("id", tierId);

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Coupon Mutations                                                  */
/* ------------------------------------------------------------------ */

export async function saveCoupon(coupon: Record<string, unknown>) {
  if (coupon.id) {
    const { id, ...fields } = coupon;
    const { error } = await supabase
      .from("discount_coupons")
      .update(fields as never)
      .eq("id", id as string);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("discount_coupons").insert(coupon as never);
    if (error) throw error;
  }
}

export async function deleteCoupon(couponId: string) {
  const { error } = await supabase
    .from("discount_coupons")
    .delete()
    .eq("id", couponId);

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Promotion Mutations                                               */
/* ------------------------------------------------------------------ */

export async function savePromotion(promo: Record<string, unknown>) {
  if (promo.id) {
    const { id, ...fields } = promo;
    const { error } = await supabase
      .from("promotions")
      .update(fields as never)
      .eq("id", id as string);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("promotions").insert(promo as never);
    if (error) throw error;
  }
}

export async function deletePromotion(promoId: string) {
  const { error } = await supabase
    .from("promotions")
    .delete()
    .eq("id", promoId);

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Announcements                                                     */
/* ------------------------------------------------------------------ */

export async function fetchAnnouncements() {
  const { data, error } = await supabase
    .from("system_announcements")
    .select("*, profiles:created_by(full_name)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveAnnouncement(
  announcement: Record<string, unknown>
) {
  if (announcement.id) {
    const { id, ...fields } = announcement;
    const { data, error } = await supabase
      .from("system_announcements")
      .update(fields as never)
      .eq("id", id as string)
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase
      .from("system_announcements")
      .insert(announcement as never)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

export async function deleteAnnouncement(announcementId: string) {
  const { error } = await supabase
    .from("system_announcements")
    .delete()
    .eq("id", announcementId);

  if (error) throw error;
}

export async function toggleAnnouncement(
  announcementId: string,
  isActive: boolean
) {
  const { error } = await supabase
    .from("system_announcements")
    .update({ is_active: isActive })
    .eq("id", announcementId);

  if (error) throw error;
}

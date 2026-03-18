import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createSubscriptionCheckout, type SubscriptionCheckoutInput } from "@/services/asaasService";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "./queryKeys";

export interface SignatureQuota {
  hasActiveSubscription: boolean;
  subscription: Subscription | null;
  /** PJ contracts currently counted against the quota (non-terminated) */
  used: number;
  /** Max PJ contracts allowed by the plan. null = unlimited */
  limit: number | null;
  /** 0–100 percentage of quota used */
  percentUsed: number;
  /** true when ≥ 80% used but not yet at limit */
  nearLimit: boolean;
  /** true when used >= limit */
  atLimit: boolean;
  isLoading: boolean;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface Subscription {
  id: string;
  company_id: string;
  pricing_tier_id: string | null;
  plan_name: string;
  cycle: "monthly" | "annual";
  status: "pending" | "active" | "cancelled" | "expired" | "upgrading";
  monthly_value: number;
  total_charged: number;
  discount_percent: number;
  starts_at: string | null;
  ends_at: string | null;
  asaas_charge_id: string | null;
  asaas_payment_link: string | null;
  asaas_pix_payload: string | null;
  is_upgrade: boolean;
  previous_subscription_id: string | null;
  notes: string | null;
  created_at: string;
  pricing_tiers?: {
    name: string;
    min_contracts: number;
    max_contracts: number | null;
    price_per_contract: number;
    subscription_monthly_price: number | null;
  };
}

/* ------------------------------------------------------------------ */
/*  Queries                                                            */
/* ------------------------------------------------------------------ */

/** Fetch the active subscription for the current company */
export function useActiveSubscription() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["subscription", "active", companyId],
    queryFn: async (): Promise<Subscription | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, pricing_tiers(name, min_contracts, max_contracts, price_per_contract, subscription_monthly_price)")
        .eq("company_id", companyId)
        .in("status", ["active", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Subscription) ?? null;
    },
    enabled: !!companyId,
  });
}

/** Fetch subscription by company ID (for master admin views) */
export function useCompanySubscription(companyId: string | undefined) {
  return useQuery({
    queryKey: ["subscription", "company", companyId],
    queryFn: async (): Promise<Subscription | null> => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, pricing_tiers(name, min_contracts, max_contracts, price_per_contract, subscription_monthly_price)")
        .eq("company_id", companyId)
        .in("status", ["active", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Subscription) ?? null;
    },
    enabled: !!companyId,
  });
}

/** Fetch all subscriptions for a company (history) */
export function useSubscriptionHistory(companyId: string | undefined) {
  return useQuery({
    queryKey: ["subscription", "history", companyId],
    queryFn: async (): Promise<Subscription[]> => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as Subscription[]) ?? [];
    },
    enabled: !!companyId,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                          */
/* ------------------------------------------------------------------ */

export function useSubscriptionCheckout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubscriptionCheckoutInput) => createSubscriptionCheckout(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["subscription"] });
    },
  });
}

/**
 * Returns the current subscription quota for the logged-in company.
 * Counts all non-terminated PJ contracts against the plan's max_contracts limit.
 */
export function useSignatureQuota(): SignatureQuota {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  const subQuery = useActiveSubscription();

  const countQuery = useQuery({
    queryKey: ["pj-quota-count", companyId],
    queryFn: async (): Promise<number> => {
      if (!companyId) return 0;
      const { count, error } = await supabase
        .from("contracts")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("contract_type", "PJ")
        .neq("status", "terminated");
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!companyId,
  });

  const subscription = subQuery.data ?? null;
  const used = countQuery.data ?? 0;
  const limit = subscription?.pricing_tiers?.max_contracts ?? null;
  const percentUsed =
    limit !== null && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return {
    hasActiveSubscription: subscription?.status === "active",
    subscription,
    used,
    limit,
    percentUsed,
    nearLimit: limit !== null && percentUsed >= 80 && used < limit,
    atLimit: limit !== null && used >= limit,
    isLoading: subQuery.isLoading || countQuery.isLoading,
  };
}

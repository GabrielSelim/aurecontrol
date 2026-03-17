import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { createSubscriptionCheckout, type SubscriptionCheckoutInput } from "@/services/asaasService";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "./queryKeys";

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
    queryKey: queryKeys.company?.subscription
      ? queryKeys.company.subscription(companyId!)
      : ["subscription", "active", companyId],
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

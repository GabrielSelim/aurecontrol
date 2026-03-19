import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface AsaasChargeResult {
  charge_id: string;
  payment_link: string | null;
  pix_payload: string | null;
  boleto_url: string | null;
  boleto_barcode: string | null;
}

export interface SubscriptionCheckoutResult {
  subscription_id: string;
  charge_id: string | null;
  payment_link: string | null;
  pix_payload: string | null;
  amount: number;
  cycle: "monthly" | "annual";
  ends_at: string;
  activated_immediately: boolean;
  coupon_discount: number | null;
  message?: string;
}

export interface SubscriptionCheckoutInput {
  company_id: string;
  tier_id: string;
  cycle: "monthly" | "annual";
  is_upgrade?: boolean;
  coupon_code?: string;
}

/* ------------------------------------------------------------------ */
/*  Billing charges                                                    */
/* ------------------------------------------------------------------ */

/**
 * Creates a PIX/Boleto charge for a billing record in Asaas.
 * Idempotent — returns existing data if charge already exists.
 */
export async function createAsaasCharge(
  billingId: string,
): Promise<AsaasChargeResult> {
  const { data, error } = await supabase.functions.invoke<AsaasChargeResult>(
    "asaas-create-charge",
    { body: { billing_id: billingId } },
  );

  if (error) throw new Error(error.message ?? "Erro ao criar cobrança no Asaas.");
  if (!data) throw new Error("Resposta inválida do servidor de pagamentos.");
  return data;
}

/* ------------------------------------------------------------------ */
/*  Subscription checkout                                              */
/* ------------------------------------------------------------------ */

/**
 * Starts a new subscription checkout or upgrade for a company.
 * Returns payment link/PIX for the user to complete payment, or
 * `activated_immediately: true` if no charge is needed (credit covers upgrade).
 */
export async function createSubscriptionCheckout(
  input: SubscriptionCheckoutInput,
): Promise<SubscriptionCheckoutResult> {
  const { data, error } = await supabase.functions.invoke<SubscriptionCheckoutResult>(
    "subscription-checkout",
    { body: input },
  );

  if (error) throw new Error(error.message ?? "Erro ao iniciar assinatura.");
  if (!data) throw new Error("Resposta inválida do servidor.");
  return data;
}


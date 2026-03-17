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

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

/**
 * Calls the `asaas-create-charge` edge function for a given billing.
 * Returns charge data (PIX payload, boleto URL, etc.) so the UI can
 * display payment instructions to the admin / forward to the client.
 *
 * Idempotent: if the billing already has a charge, returns existing data.
 *
 * @throws Error with a user-friendly message on failure
 */
export async function createAsaasCharge(
  billingId: string,
): Promise<AsaasChargeResult> {
  const { data, error } = await supabase.functions.invoke<AsaasChargeResult>(
    "asaas-create-charge",
    {
      body: { billing_id: billingId },
    },
  );

  if (error) {
    throw new Error(
      error.message ?? "Erro ao criar cobrança no Asaas. Tente novamente.",
    );
  }

  if (!data) {
    throw new Error("Resposta inválida do servidor de pagamentos.");
  }

  return data;
}

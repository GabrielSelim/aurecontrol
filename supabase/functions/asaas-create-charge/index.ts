import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";
const ASAAS_SANDBOX = Deno.env.get("ASAAS_SANDBOX") === "true";
const ASAAS_BASE_URL = ASAAS_SANDBOX
  ? "https://sandbox.asaas.com/api/v3"
  : "https://api.asaas.com/api/v3";

async function asaasRequest(path: string, method = "GET", body?: unknown) {
  const res = await fetch(`${ASAAS_BASE_URL}${path}`, {
    method,
    headers: {
      "access_token": ASAAS_API_KEY,
      "Content-Type": "application/json",
      "User-Agent": "AureControl/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.errors?.[0]?.description ?? data?.description ?? JSON.stringify(data);
    throw new Error(`Asaas ${method} ${path}: ${msg}`);
  }
  return data;
}

/** Finds or creates an Asaas customer for the given company */
async function ensureAsaasCustomer(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
): Promise<string> {
  // Check if customer already exists
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, cnpj, email, phone, asaas_customer_id")
    .eq("id", companyId)
    .single();

  if (!company) throw new Error("Empresa não encontrada");
  if (company.asaas_customer_id) return company.asaas_customer_id;

  // Create new Asaas customer
  const cleanCnpj = company.cnpj.replace(/\D/g, "");
  const customer = await asaasRequest("/customers", "POST", {
    name: company.name,
    cpfCnpj: cleanCnpj,
    email: company.email ?? undefined,
    phone: company.phone?.replace(/\D/g, "") ?? undefined,
    notificationDisabled: false,
    externalReference: companyId,
  });

  // Save customer ID back to companies
  await supabase
    .from("companies")
    .update({ asaas_customer_id: customer.id })
    .eq("id", companyId);

  return customer.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!ASAAS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ASAAS_API_KEY não configurada" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { billing_id } = await req.json();
    if (!billing_id) throw new Error("billing_id obrigatório");

    // Fetch billing with company data
    const { data: billing, error: billingErr } = await supabase
      .from("company_billings")
      .select("*, companies(id, name, cnpj, email, phone, asaas_customer_id)")
      .eq("id", billing_id)
      .single();

    if (billingErr || !billing) throw new Error("Fatura não encontrada");
    if (billing.status === "paid" || billing.status === "cancelled") {
      throw new Error(`Fatura já está ${billing.status}`);
    }

    // Idempotency: if charge already exists, return existing data
    if (billing.asaas_charge_id) {
      return new Response(
        JSON.stringify({
          charge_id: billing.asaas_charge_id,
          payment_link: billing.asaas_payment_link,
          pix_payload: billing.asaas_pix_payload,
          boleto_url: billing.asaas_boleto_url,
          boleto_barcode: billing.asaas_boleto_barcode,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get or create Asaas customer
    const customerId = await ensureAsaasCustomer(supabase, billing.company_id);

    // Format reference month
    const refDate = new Date(billing.reference_month);
    const monthLabel = refDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    // Create charge (UNDEFINED = allows both PIX and boleto)
    const charge = await asaasRequest("/payments", "POST", {
      customer: customerId,
      billingType: "UNDEFINED",
      value: Number(billing.total),
      dueDate: billing.due_date,
      description: `Mensalidade AureControl — ${monthLabel} (${billing.pj_contracts_count} contrato(s) PJ)`,
      externalReference: billing_id,
      postalService: false,
    });

    // Fetch PIX QR code
    let pixPayload: string | null = null;
    try {
      const pix = await asaasRequest(`/payments/${charge.id}/pixQrCode`);
      pixPayload = pix.payload ?? null;
    } catch {
      // PIX may not be available yet
    }

    // Save Asaas data back to billing
    await supabase
      .from("company_billings")
      .update({
        asaas_charge_id: charge.id,
        asaas_payment_link: charge.invoiceUrl ?? null,
        asaas_pix_payload: pixPayload,
        asaas_boleto_url: charge.bankSlipUrl ?? null,
        asaas_boleto_barcode: charge.nossoNumero ?? null,
      })
      .eq("id", billing_id);

    return new Response(
      JSON.stringify({
        charge_id: charge.id,
        payment_link: charge.invoiceUrl ?? null,
        pix_payload: pixPayload,
        boleto_url: charge.bankSlipUrl ?? null,
        boleto_barcode: charge.nossoNumero ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

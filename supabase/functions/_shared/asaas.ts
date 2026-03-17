/**
 * Shared Asaas API utilities for all edge functions.
 */

export const ASAAS_BASE =
  Deno.env.get("ASAAS_SANDBOX") === "true"
    ? "https://sandbox.asaas.com/api/v3"
    : "https://api.asaas.com/api/v3";

export const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY") ?? "";

/** Generic Asaas request helper */
export async function asaasRequest(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch(`${ASAAS_BASE}${path}`, {
    method,
    headers: {
      access_token: ASAAS_API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Asaas ${method} ${path} → ${res.status}: ${err}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Finds or creates an Asaas customer for a company.
 * Saves `asaas_customer_id` back to the companies table.
 */
export async function ensureAsaasCustomer(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  companyId: string,
): Promise<string> {
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, cnpj, email, phone, asaas_customer_id")
    .eq("id", companyId)
    .single();

  if (company?.asaas_customer_id) return company.asaas_customer_id;

  const customer = await asaasRequest("/customers", "POST", {
    name: company.name,
    cpfCnpj: (company.cnpj as string).replace(/\D/g, ""),
    email: company.email ?? undefined,
    mobilePhone: company.phone ?? undefined,
  });

  const customerId = customer.id as string;
  await supabase
    .from("companies")
    .update({ asaas_customer_id: customerId })
    .eq("id", companyId);

  return customerId;
}

/** Fetches PIX QR code payload for a charge, returns null on failure */
export async function fetchPixPayload(chargeId: string): Promise<string | null> {
  try {
    const pix = await asaasRequest(`/payments/${chargeId}/pixQrCode`);
    return (pix.payload as string) ?? null;
  } catch {
    return null;
  }
}

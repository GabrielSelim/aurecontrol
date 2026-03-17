import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ASAAS_API_KEY, asaasRequest, ensureAsaasCustomer, fetchPixPayload } from "../_shared/asaas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANNUAL_DISCOUNT = 0.15; // 15% off annual plans

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Calculates the pro-rata amount to charge when upgrading.
 * Returns the difference owed by the company (may be 0 if no upgrade cost).
 */
function calculateProRata(
  currentTotalCharged: number,
  currentStartsAt: string,
  currentEndsAt: string,
  newMonthlyValue: number,
  cycle: "monthly" | "annual",
): number {
  const now = Date.now();
  const starts = new Date(currentStartsAt).getTime();
  const ends = new Date(currentEndsAt).getTime();
  const totalMs = ends - starts;
  const remainingMs = Math.max(ends - now, 0);

  if (totalMs <= 0 || remainingMs <= 0) return 0;

  const remainingFraction = remainingMs / totalMs;
  const creditFromCurrent = currentTotalCharged * remainingFraction;

  const newTotal = cycle === "annual"
    ? newMonthlyValue * 12 * (1 - ANNUAL_DISCOUNT)
    : newMonthlyValue;

  const newCostForRemaining = newTotal * remainingFraction;
  const amountDue = newCostForRemaining - creditFromCurrent;

  return Math.max(parseFloat(amountDue.toFixed(2)), 0);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!ASAAS_API_KEY) {
      return json({ error: "Gateway de pagamentos não configurado." }, 503);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { company_id, tier_id, cycle, is_upgrade = false } = await req.json() as {
      company_id: string;
      tier_id: string;
      cycle: "monthly" | "annual";
      is_upgrade?: boolean;
    };

    if (!company_id || !tier_id || !cycle) {
      return json({ error: "company_id, tier_id e cycle são obrigatórios." }, 400);
    }

    // Fetch tier
    const { data: tier, error: tierErr } = await supabase
      .from("pricing_tiers")
      .select("id, name, subscription_monthly_price")
      .eq("id", tier_id)
      .eq("is_active", true)
      .single();

    if (tierErr || !tier) return json({ error: "Plano não encontrado." }, 404);

    const monthlyValue: number = tier.subscription_monthly_price as number;
    if (!monthlyValue) return json({ error: "Preço do plano não configurado." }, 422);

    // Check for existing active subscription (for upgrade)
    let previousSubscription: Record<string, unknown> | null = null;
    let amountToCharge: number;
    let upgradeNote = "";

    if (is_upgrade) {
      const { data: activeSub } = await supabase
        .from("subscriptions")
        .select("id, plan_name, cycle, monthly_value, total_charged, starts_at, ends_at")
        .eq("company_id", company_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activeSub) return json({ error: "Nenhuma assinatura ativa encontrada para upgrade." }, 404);
      previousSubscription = activeSub;

      amountToCharge = calculateProRata(
        activeSub.total_charged as number,
        activeSub.starts_at as string,
        activeSub.ends_at as string,
        monthlyValue,
        cycle,
      );

      if (amountToCharge < 5) {
        // Below minimum charge — just switch plan without charging
        amountToCharge = 0;
        upgradeNote = "Upgrade sem cobrança adicional (crédito cobre o custo).";
      } else {
        upgradeNote = `Upgrade proporcional de ${activeSub.plan_name as string} para ${tier.name as string}.`;
      }
    } else {
      amountToCharge = cycle === "annual"
        ? monthlyValue * 12 * (1 - ANNUAL_DISCOUNT)
        : monthlyValue;
    }

    // Calculate dates
    const now = new Date();
    const endsAt = cycle === "annual"
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const dueDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3)
      .toISOString().split("T")[0];

    // Create pending subscription record
    const totalCharged = amountToCharge > 0 ? amountToCharge : (
      cycle === "annual" ? monthlyValue * 12 * (1 - ANNUAL_DISCOUNT) : monthlyValue
    );
    const discountPct = cycle === "annual" ? ANNUAL_DISCOUNT * 100 : 0;

    const { data: subscription, error: subErr } = await supabase
      .from("subscriptions")
      .insert({
        company_id,
        pricing_tier_id: tier_id,
        plan_name: tier.name,
        cycle,
        status: "pending",
        monthly_value: monthlyValue,
        total_charged: totalCharged,
        discount_percent: discountPct,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        is_upgrade,
        previous_subscription_id: previousSubscription?.id ?? null,
        notes: upgradeNote || null,
      })
      .select("id")
      .single();

    if (subErr || !subscription) {
      return json({ error: "Erro ao criar assinatura." }, 500);
    }

    // If no charge needed (upgrade covered by credit)
    if (amountToCharge === 0) {
      // Activate immediately
      await activateSubscription(supabase, subscription.id, company_id, previousSubscription?.id as string | undefined);
      return json({
        subscription_id: subscription.id,
        charge_id: null,
        payment_link: null,
        pix_payload: null,
        activated_immediately: true,
        message: upgradeNote,
      });
    }

    // Create Asaas charge
    const customerId = await ensureAsaasCustomer(supabase, company_id);

    const cycleLabel = cycle === "annual" ? "Anual" : "Mensal";
    const description = is_upgrade
      ? `Upgrade ${cycleLabel} para ${tier.name as string} — ${upgradeNote}`
      : `Assinatura ${cycleLabel} — Plano ${tier.name as string}`;

    const charge = await asaasRequest("/payments", "POST", {
      customer: customerId,
      billingType: "UNDEFINED",
      value: amountToCharge,
      dueDate,
      description,
      externalReference: subscription.id,
      postalService: false,
    });

    const chargeId = charge.id as string;
    const pixPayload = await fetchPixPayload(chargeId);

    // Save charge data back to subscription
    await supabase
      .from("subscriptions")
      .update({
        asaas_charge_id: chargeId,
        asaas_payment_link: (charge.invoiceUrl as string) ?? null,
        asaas_pix_payload: pixPayload,
      })
      .eq("id", subscription.id);

    return json({
      subscription_id: subscription.id,
      charge_id: chargeId,
      payment_link: charge.invoiceUrl,
      pix_payload: pixPayload,
      amount: amountToCharge,
      cycle,
      ends_at: endsAt.toISOString(),
      activated_immediately: false,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("subscription-checkout error:", message);
    return json({ error: message }, 500);
  }
});

async function activateSubscription(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  subscriptionId: string,
  companyId: string,
  previousSubscriptionId?: string,
) {
  // Cancel previous subscription if upgrading
  if (previousSubscriptionId) {
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled", notes: "Substituído por upgrade." })
      .eq("id", previousSubscriptionId);
  }

  // Activate new subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .update({ status: "active" })
    .eq("id", subscriptionId)
    .select("plan_name")
    .single();

  // Update company's active subscription
  await supabase
    .from("companies")
    .update({
      active_subscription_id: subscriptionId,
      plan_name: sub?.plan_name ?? null,
    })
    .eq("id", companyId);
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Asaas sends webhook without auth header — we validate the token via query param
// Configure ASAAS_WEBHOOK_TOKEN in Supabase secrets and in Asaas dashboard
const WEBHOOK_TOKEN = Deno.env.get("ASAAS_WEBHOOK_TOKEN") ?? "";

/** Events that indicate a payment was confirmed */
const PAID_EVENTS = new Set([
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
]);

/** Events that indicate a payment was reversed/refunded */
const REFUNDED_EVENTS = new Set([
  "PAYMENT_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_CHARGEBACK_DISPUTE",
]);

serve(async (req) => {
  try {
    // Validate token if configured
    if (WEBHOOK_TOKEN) {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (token !== WEBHOOK_TOKEN) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    const payload = await req.json();
    const event: string = payload?.event ?? "";
    const payment = payload?.payment ?? {};
    const chargeId: string = payment?.id ?? "";
    const externalRef: string = payment?.externalReference ?? "";

    if (!chargeId && !externalRef) {
      return new Response("ok", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // PAID: mark billing OR subscription as paid
    if (PAID_EVENTS.has(event)) {
      const billingId = externalRef || chargeId;

      // 1. Try subscriptions first (externalReference = subscription UUID)
      if (externalRef) {
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("id, company_id, previous_subscription_id, plan_name")
          .eq("id", externalRef)
          .eq("status", "pending")
          .maybeSingle();

        if (sub) {
          // Cancel previous subscription if upgrade
          if (sub.previous_subscription_id) {
            await supabase
              .from("subscriptions")
              .update({ status: "cancelled", notes: "Substituído por upgrade." })
              .eq("id", sub.previous_subscription_id);
          }
          // Activate subscription
          await supabase
            .from("subscriptions")
            .update({ status: "active" })
            .eq("id", sub.id);
          // Update company
          await supabase
            .from("companies")
            .update({ active_subscription_id: sub.id, plan_name: sub.plan_name })
            .eq("id", sub.company_id);
          console.log(`Subscription ${sub.id} activated (event: ${event})`);
          return new Response("ok", { status: 200 });
        }
      }

      // 2. Fallback: company_billings
      let query = supabase
        .from("company_billings")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: payment?.billingType?.toLowerCase() ?? "asaas",
        })
        .eq("status", "pending");

      if (externalRef) {
        query = query.eq("id", externalRef);
      } else {
        query = query.eq("asaas_charge_id", chargeId);
      }

      const { error } = await query;
      if (error) {
        console.error("Webhook billing update error:", error.message);
      } else {
        console.log(`Billing ${billingId} marked as paid (event: ${event})`);
      }
    }

    // REFUNDED: revert to pending
    if (REFUNDED_EVENTS.has(event) && externalRef) {
      await supabase
        .from("company_billings")
        .update({ status: "pending", paid_at: null, payment_method: null })
        .eq("id", externalRef)
        .eq("status", "paid");

      console.log(`Billing ${externalRef} reverted to pending (event: ${event})`);
    }

    return new Response("ok", { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("Webhook error:", message);
    // Always return 200 to avoid Asaas retrying indefinitely
    return new Response("ok", { status: 200 });
  }
});

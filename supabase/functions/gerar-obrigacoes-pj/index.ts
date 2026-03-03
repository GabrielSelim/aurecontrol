import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Parse optional target month from body (defaults to current month)
    let targetYear: number;
    let targetMonth: number;

    try {
      const body = await req.json().catch(() => ({}));
      targetYear = body.year ?? new Date().getFullYear();
      targetMonth = body.month ?? new Date().getMonth() + 1; // 1-indexed
    } catch {
      targetYear = new Date().getFullYear();
      targetMonth = new Date().getMonth() + 1;
    }

    const referenceMonth = `${targetYear}-${String(targetMonth).padStart(2, "0")}-01`;
    const monthLabel = `${String(targetMonth).padStart(2, "0")}/${targetYear}`;

    console.log(`[gerar-obrigacoes-pj] Generating for ${monthLabel}`);

    // Fetch all active PJ contracts with a defined salary
    const { data: contracts, error: contractsErr } = await supabase
      .from("contracts")
      .select("id, company_id, user_id, salary, monthly_value, payment_frequency, payment_day, job_title")
      .eq("contract_type", "PJ")
      .eq("status", "active")
      .not("salary", "is", null);

    if (contractsErr) throw contractsErr;
    if (!contracts || contracts.length === 0) {
      return new Response(JSON.stringify({ message: "No active PJ contracts found", generated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const results = {
      generated: 0,
      skipped: 0,
      errors: 0,
      details: [] as string[],
    };

    for (const contract of contracts) {
      // Skip non-monthly frequencies in this simplified version
      const freq = contract.payment_frequency ?? "monthly";
      if (freq !== "monthly" && freq !== "biweekly") {
        results.skipped++;
        continue;
      }

      // Check if payment already exists for this month
      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("contract_id", contract.id)
        .eq("reference_month", referenceMonth)
        .maybeSingle();

      if (existing) {
        results.skipped++;
        results.details.push(`Contract ${contract.id}: already has payment for ${monthLabel}`);
        continue;
      }

      // Calculate due date based on payment_day
      const payDay = contract.payment_day ?? 5;
      const dueDate = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(payDay).padStart(2, "0")}`;

      // Use monthly_value if set, otherwise fall back to salary
      const amount = contract.monthly_value ?? contract.salary;

      const { error: insertErr } = await supabase.from("payments").insert({
        company_id: contract.company_id,
        contract_id: contract.id,
        user_id: contract.user_id,
        amount,
        reference_month: referenceMonth,
        due_date: dueDate,
        description: `Honorários ${monthLabel} — ${contract.job_title}`,
        status: "pending",
      });

      if (insertErr) {
        results.errors++;
        results.details.push(`Contract ${contract.id}: ${insertErr.message}`);
      } else {
        results.generated++;
        results.details.push(`Contract ${contract.id}: payment created for ${monthLabel} (R$ ${amount})`);
      }
    }

    console.log("[gerar-obrigacoes-pj] Done:", results);

    return new Response(JSON.stringify({ ...results, month: monthLabel }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[gerar-obrigacoes-pj] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Company {
  id: string;
  name: string;
}

interface PricingTier {
  min_contracts: number;
  max_contracts: number | null;
  price_per_contract: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current month reference (previous month for billing)
    const now = new Date();
    const referenceDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const referenceMonth = referenceDate.toISOString().slice(0, 7); // YYYY-MM format
    const referenceMonthFull = referenceMonth + "-01";

    console.log(`Generating billings for reference month: ${referenceMonth}`);

    // Get all active companies
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name")
      .eq("is_active", true);

    if (companiesError) {
      console.error("Error fetching companies:", companiesError);
      throw companiesError;
    }

    if (!companies || companies.length === 0) {
      console.log("No active companies found");
      return new Response(
        JSON.stringify({ message: "No active companies to bill", generated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get base price from settings
    const { data: settings } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "pj_contract_price")
      .maybeSingle();

    const basePrice = (settings?.value as { amount: number })?.amount || 49.90;

    // Get pricing tiers
    const { data: tiers } = await supabase
      .from("pricing_tiers")
      .select("*")
      .eq("is_active", true)
      .order("min_contracts");

    // Calculate due date (10th of current month)
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 10);
    const dueDateStr = dueDate.toISOString().split("T")[0];

    let generated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const company of companies as Company[]) {
      try {
        // Check if billing already exists for this company and month
        const { data: existingBilling } = await supabase
          .from("company_billings")
          .select("id")
          .eq("company_id", company.id)
          .eq("reference_month", referenceMonthFull)
          .maybeSingle();

        if (existingBilling) {
          console.log(`Billing already exists for company ${company.name} (${referenceMonth}), skipping`);
          skipped++;
          continue;
        }

        // Get PJ contracts count for the company
        const { count: pjCount } = await supabase
          .from("contracts")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.id)
          .eq("contract_type", "PJ")
          .eq("status", "active");

        const contractsCount = pjCount || 0;

        // Skip companies with no PJ contracts
        if (contractsCount === 0) {
          console.log(`Company ${company.name} has no active PJ contracts, skipping`);
          skipped++;
          continue;
        }

        // Find applicable pricing tier
        let unitPrice = basePrice;
        if (tiers) {
          const applicableTier = (tiers as PricingTier[]).find(
            (t) => contractsCount >= t.min_contracts && 
                   (t.max_contracts === null || contractsCount <= t.max_contracts)
          );
          if (applicableTier) {
            unitPrice = applicableTier.price_per_contract;
          }
        }

        const subtotal = contractsCount * unitPrice;
        const total = subtotal;

        // Create billing record
        const { error: insertError } = await supabase.from("company_billings").insert([{
          company_id: company.id,
          reference_month: referenceMonthFull,
          pj_contracts_count: contractsCount,
          unit_price: unitPrice,
          subtotal,
          total,
          due_date: dueDateStr,
          status: "pending",
          notes: "Fatura gerada automaticamente",
        }]);

        if (insertError) {
          console.error(`Error creating billing for company ${company.name}:`, insertError);
          errors.push(`${company.name}: ${insertError.message}`);
          continue;
        }

        console.log(`Generated billing for ${company.name}: ${contractsCount} contracts, total: ${total}`);
        generated++;

      } catch (companyError) {
        console.error(`Error processing company ${company.name}:`, companyError);
        errors.push(`${company.name}: ${String(companyError)}`);
      }
    }

    const result = {
      message: `Monthly billing generation completed`,
      referenceMonth,
      generated,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("Generation result:", result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in generate-monthly-billings:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

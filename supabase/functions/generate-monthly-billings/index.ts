import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Company {
  id: string;
  name: string;
  email: string | null;
}

interface PricingTier {
  min_contracts: number;
  max_contracts: number | null;
  price_per_contract: number;
}

async function logNotification(
  supabase: any,
  companyId: string,
  recipientEmail: string,
  notificationType: string,
  subject: string,
  status: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from("notification_logs").insert({
      company_id: companyId,
      recipient_email: recipientEmail,
      notification_type: notificationType,
      subject: subject,
      status: status,
      metadata: metadata,
    });
  } catch (error) {
    console.error("Failed to log notification:", error);
  }
}

async function sendBillingNotification(
  client: SMTPClient,
  supabase: any,
  gmailUser: string,
  to: string,
  companyId: string,
  companyName: string,
  referenceMonth: string,
  contractsCount: number,
  total: number,
  dueDate: string
): Promise<boolean> {
  const formattedTotal = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(total);

  const formattedMonth = new Date(referenceMonth + "-01").toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  const formattedDueDate = new Date(dueDate).toLocaleDateString('pt-BR');
  const subject = `Nova Fatura - ${companyName} - ${formattedMonth}`;

  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .info-row:last-child { border-bottom: none; }
          .label { color: #666; }
          .value { font-weight: bold; color: #333; }
          .total { font-size: 24px; color: #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Nova Fatura Gerada</h1>
          </div>
          <div class="content">
            <p>Olá,</p>
            <p>Uma nova fatura foi gerada para a empresa <strong>${companyName}</strong>.</p>
            
            <div class="info-box">
              <div class="info-row">
                <span class="label">Mês de Referência</span>
                <span class="value">${formattedMonth}</span>
              </div>
              <div class="info-row">
                <span class="label">Contratos PJ Ativos</span>
                <span class="value">${contractsCount}</span>
              </div>
              <div class="info-row">
                <span class="label">Data de Vencimento</span>
                <span class="value">${formattedDueDate}</span>
              </div>
              <div class="info-row">
                <span class="label">Valor Total</span>
                <span class="value total">${formattedTotal}</span>
              </div>
            </div>
            
            <p>Acesse o sistema para visualizar detalhes e realizar o pagamento.</p>
            
            <div class="footer">
              <p>Este é um email automático do Aure System.</p>
              <p>Por favor, não responda a este email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await client.send({
      from: `Aure System <${gmailUser}>`,
      to: to,
      subject: subject,
      content: "auto",
      html: html,
    });

    console.log(`Notification email sent to ${to}`);
    await logNotification(supabase, companyId, to, "billing_generated", subject, "sent", {
      reference_month: referenceMonth,
      contracts_count: contractsCount,
      total: total,
    });
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    await logNotification(supabase, companyId, to, "billing_generated", subject, "failed", {
      error: String(error),
    });
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize SMTP client if credentials are available
    let smtpClient: SMTPClient | null = null;
    if (gmailUser && gmailPassword) {
      smtpClient = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: {
            username: gmailUser,
            password: gmailPassword,
          },
        },
      });
    } else {
      console.log("Gmail credentials not configured, email notifications will be skipped");
    }

    // Get current month reference (previous month for billing)
    const now = new Date();
    const referenceDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const referenceMonth = referenceDate.toISOString().slice(0, 7);
    const referenceMonthFull = referenceMonth + "-01";

    console.log(`Generating billings for reference month: ${referenceMonth}`);

    // Get all active companies
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name, email")
      .eq("is_active", true);

    if (companiesError) {
      console.error("Error fetching companies:", companiesError);
      throw companiesError;
    }

    if (!companies || companies.length === 0) {
      console.log("No active companies found");
      if (smtpClient) await smtpClient.close();
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
    let emailsSent = 0;
    const errors: string[] = [];

    for (const company of companies as Company[]) {
      try {
        // Check if billing already exists
        const { data: existingBilling } = await supabase
          .from("company_billings")
          .select("id")
          .eq("company_id", company.id)
          .eq("reference_month", referenceMonthFull)
          .maybeSingle();

        if (existingBilling) {
          console.log(`Billing already exists for ${company.name}, skipping`);
          skipped++;
          continue;
        }

        // Get PJ contracts count
        const { count: pjCount } = await supabase
          .from("contracts")
          .select("*", { count: "exact", head: true })
          .eq("company_id", company.id)
          .eq("contract_type", "PJ")
          .eq("status", "active");

        const contractsCount = pjCount || 0;

        if (contractsCount === 0) {
          console.log(`${company.name} has no PJ contracts, skipping`);
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
          console.error(`Error creating billing for ${company.name}:`, insertError);
          errors.push(`${company.name}: ${insertError.message}`);
          continue;
        }

        console.log(`Generated billing for ${company.name}: ${contractsCount} contracts, total: ${total}`);
        generated++;

        // Send email notifications
        if (smtpClient && gmailUser) {
          // Get company admins
          const { data: admins } = await supabase
            .from("profiles")
            .select(`
              email,
              full_name,
              user_roles!inner(role)
            `)
            .eq("company_id", company.id)
            .eq("is_active", true);

          const adminEmails: string[] = [];
          
          // Add company email if available
          if (company.email) {
            adminEmails.push(company.email);
          }

          // Add admin/financeiro emails
          if (admins) {
            for (const admin of admins) {
              const roles = admin.user_roles as any[];
              if (roles?.some(r => ['admin', 'financeiro'].includes(r.role))) {
                if (admin.email && !adminEmails.includes(admin.email)) {
                  adminEmails.push(admin.email);
                }
              }
            }
          }

          // Send notifications
          for (const email of adminEmails) {
            const sent = await sendBillingNotification(
              smtpClient,
              supabase,
              gmailUser,
              email,
              company.id,
              company.name,
              referenceMonth,
              contractsCount,
              total,
              dueDateStr
            );
            if (sent) emailsSent++;
          }
        }

      } catch (companyError) {
        console.error(`Error processing ${company.name}:`, companyError);
        errors.push(`${company.name}: ${String(companyError)}`);
      }
    }

    // Close SMTP connection
    if (smtpClient) {
      await smtpClient.close();
    }

    const result = {
      message: "Monthly billing generation completed",
      referenceMonth,
      generated,
      skipped,
      emailsSent,
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

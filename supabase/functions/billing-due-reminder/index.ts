import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get reminder days configuration
    const { data: reminderConfig } = await supabaseClient
      .from("system_settings")
      .select("value")
      .eq("key", "billing_reminder_days")
      .maybeSingle();

    const reminderDays = (reminderConfig?.value as { days: number })?.days || 3;

    // Get billings due in X days or less that are still pending
    const today = new Date();
    const reminderDate = new Date(today);
    reminderDate.setDate(today.getDate() + reminderDays);

    console.log(`Checking for billings due within ${reminderDays} days (until ${reminderDate.toISOString().split('T')[0]})`);

    const { data: pendingBillings, error: billingsError } = await supabaseClient
      .from("company_billings")
      .select(`
        *,
        companies:company_id (
          id,
          name,
          email
        )
      `)
      .eq("status", "pending")
      .lte("due_date", reminderDate.toISOString().split('T')[0])
      .gte("due_date", today.toISOString().split('T')[0]);

    if (billingsError) {
      console.error("Error fetching pending billings:", billingsError);
      throw billingsError;
    }

    console.log(`Found ${pendingBillings?.length || 0} billings due soon`);

    if (!pendingBillings || pendingBillings.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No billings due soon", reminders_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      throw new Error("Gmail credentials not configured");
    }

    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
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

    let remindersSent = 0;

    for (const billing of pendingBillings) {
      const company = billing.companies;
      if (!company) continue;

      // Get admin and financeiro users for this company
      const { data: companyUsers, error: usersError } = await supabaseClient
        .from("profiles")
        .select(`
          email,
          full_name,
          user_id
        `)
        .eq("company_id", company.id)
        .eq("is_active", true);

      if (usersError) {
        console.error(`Error fetching users for company ${company.id}:`, usersError);
        continue;
      }

      // Get roles for these users
      const userIds = companyUsers?.map(u => u.user_id) || [];
      const { data: userRoles } = await supabaseClient
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds)
        .in("role", ["admin", "financeiro"]);

      const adminFinanceiroUserIds = new Set(userRoles?.map(r => r.user_id) || []);
      const recipientEmails = new Set<string>();

      // Add admin/financeiro emails
      companyUsers?.forEach(user => {
        if (adminFinanceiroUserIds.has(user.user_id)) {
          recipientEmails.add(user.email);
        }
      });

      // Add company email if available
      if (company.email) {
        recipientEmails.add(company.email);
      }

      if (recipientEmails.size === 0) {
        console.log(`No recipients found for company ${company.name}`);
        continue;
      }

      const dueDate = new Date(billing.due_date);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const formattedDueDate = dueDate.toLocaleDateString("pt-BR");
      const formattedTotal = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
      }).format(billing.total);

      const urgencyText = daysUntilDue <= 1 
        ? "⚠️ VENCE AMANHÃ" 
        : daysUntilDue === 0 
          ? "🚨 VENCE HOJE" 
          : `Vence em ${daysUntilDue} dias`;

      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .urgency { background: ${daysUntilDue <= 1 ? '#fef2f2' : '#fffbeb'}; border: 1px solid ${daysUntilDue <= 1 ? '#fecaca' : '#fde68a'}; color: ${daysUntilDue <= 1 ? '#dc2626' : '#d97706'}; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 18px; margin-bottom: 20px; }
    .details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .detail-row:last-child { border-bottom: none; }
    .label { color: #6b7280; }
    .value { font-weight: bold; color: #111827; }
    .total { font-size: 24px; color: #059669; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Lembrete de Vencimento</h1>
    </div>
    <div class="content">
      <div class="urgency">${urgencyText}</div>
      
      <p>Olá,</p>
      <p>Este é um lembrete de que a fatura da empresa <strong>${company.name}</strong> está próxima do vencimento.</p>
      
      <div class="details">
        <div class="detail-row">
          <span class="label">Mês de Referência:</span>
          <span class="value">${new Date(billing.reference_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</span>
        </div>
        <div class="detail-row">
          <span class="label">Contratos PJ:</span>
          <span class="value">${billing.pj_contracts_count}</span>
        </div>
        <div class="detail-row">
          <span class="label">Data de Vencimento:</span>
          <span class="value">${formattedDueDate}</span>
        </div>
        <div class="detail-row">
          <span class="label">Valor Total:</span>
          <span class="value total">${formattedTotal}</span>
        </div>
      </div>
      
      <p>Por favor, regularize o pagamento para evitar qualquer interrupção nos serviços.</p>
    </div>
    <div class="footer">
      <p>Este é um email automático do Aure System.</p>
      <p>Em caso de dúvidas, entre em contato com o suporte.</p>
    </div>
  </div>
</body>
</html>
      `;

      const subject = daysUntilDue <= 1 
        ? `🚨 URGENTE: Fatura vence ${daysUntilDue === 0 ? 'HOJE' : 'AMANHÃ'} - ${company.name}`
        : `⏰ Lembrete: Fatura vence em ${daysUntilDue} dias - ${company.name}`;

      for (const email of recipientEmails) {
        try {
          await client.send({
            from: `Aure System <${gmailUser}>`,
            to: email,
            subject: subject,
            content: "auto",
            html: htmlContent,
          });
          console.log(`Reminder sent to ${email} for billing ${billing.id}`);
          
          await logNotification(supabaseClient, company.id, email, "billing_due_reminder", subject, "sent", {
            billing_id: billing.id,
            days_until_due: daysUntilDue,
            total: billing.total,
          });
          
          remindersSent++;
        } catch (emailError) {
          console.error(`Failed to send reminder to ${email}:`, emailError);
          
          await logNotification(supabaseClient, company.id, email, "billing_due_reminder", subject, "failed", {
            billing_id: billing.id,
            error: String(emailError),
          });
        }
      }
    }

    await client.close();

    console.log(`Total reminders sent: ${remindersSent}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Due date reminders processed`,
        billings_checked: pendingBillings.length,
        reminders_sent: remindersSent
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in billing-due-reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

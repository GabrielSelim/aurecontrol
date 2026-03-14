import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailViaResend } from "../_shared/resend.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Contract {
  id: string;
  user_id: string;
  company_id: string;
  job_title: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  status: string;
  duration_type: string | null;
  duration_value: number | null;
  duration_unit: string | null;
  deliverable_description: string | null;
}

interface Profile {
  full_name: string;
  email: string;
}

interface Company {
  id: string;
  name: string;
  email: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("Starting contract expiration alerts check...");

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get alert configuration from system settings
    const { data: settingsData } = await supabaseClient
      .from("system_settings")
      .select("value")
      .eq("key", "contract_expiration_alert_days")
      .maybeSingle();

    const alertDays = settingsData?.value?.days || 30;
    console.log(`Checking contracts expiring within ${alertDays} days`);

    // Calculate the date range
    const today = new Date();
    const alertDate = new Date();
    alertDate.setDate(today.getDate() + alertDays);
    
    const todayStr = today.toISOString().split('T')[0];
    const alertDateStr = alertDate.toISOString().split('T')[0];

    // Fetch contracts expiring soon (time-based with end_date)
    const { data: expiringContracts, error: contractsError } = await supabaseClient
      .from("contracts")
      .select("*")
      .eq("status", "active")
      .not("end_date", "is", null)
      .gte("end_date", todayStr)
      .lte("end_date", alertDateStr);

    if (contractsError) {
      console.error("Error fetching contracts:", contractsError);
      throw contractsError;
    }

    console.log(`Found ${expiringContracts?.length || 0} contracts expiring soon`);

    if (!expiringContracts || expiringContracts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No expiring contracts found", alertsSent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group contracts by company
    const contractsByCompany = new Map<string, Contract[]>();
    for (const contract of expiringContracts) {
      const companyContracts = contractsByCompany.get(contract.company_id) || [];
      companyContracts.push(contract);
      contractsByCompany.set(contract.company_id, companyContracts);
    }

    let alertsSent = 0;

    // Process each company
    for (const [companyId, contracts] of contractsByCompany) {
      // Get company info
      const { data: companyData } = await supabaseClient
        .from("companies")
        .select("id, name, email")
        .eq("id", companyId)
        .maybeSingle();

      if (!companyData) continue;

      // Get admin users for this company
      const { data: adminProfiles } = await supabaseClient
        .from("profiles")
        .select("user_id, full_name, email")
        .eq("company_id", companyId)
        .eq("is_active", true);

      if (!adminProfiles || adminProfiles.length === 0) continue;

      // Get user roles to filter admins
      const userIds = adminProfiles.map(p => p.user_id);
      const { data: adminRoles } = await supabaseClient
        .from("user_roles")
        .select("user_id")
        .in("user_id", userIds)
        .in("role", ["admin", "master_admin"]);

      const adminUserIds = new Set(adminRoles?.map(r => r.user_id) || []);
      const admins = adminProfiles.filter(p => adminUserIds.has(p.user_id));

      if (admins.length === 0) continue;

      // Get profile info for contract users
      const contractUserIds = contracts.map(c => c.user_id);
      const { data: contractProfiles } = await supabaseClient
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", contractUserIds);

      const profileMap = new Map(contractProfiles?.map(p => [p.user_id, p]) || []);

      // Build email content
      const contractsList = contracts.map(contract => {
        const profile = profileMap.get(contract.user_id);
        const daysUntilExpiry = Math.ceil((new Date(contract.end_date!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const expiryDate = new Date(contract.end_date!).toLocaleDateString('pt-BR');
        
        let durationInfo = "";
        if (contract.duration_type === "time_based") {
          const unitLabels: Record<string, string> = {
            days: "dias",
            weeks: "semanas",
            months: "meses",
            years: "anos",
          };
          durationInfo = `Duração: ${contract.duration_value} ${unitLabels[contract.duration_unit || "months"]}`;
        } else if (contract.duration_type === "delivery_based") {
          durationInfo = `Entrega: ${contract.deliverable_description || "Não especificada"}`;
        }

        return `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px;">${profile?.full_name || "N/A"}</td>
            <td style="padding: 12px;">${contract.job_title}</td>
            <td style="padding: 12px;">${contract.contract_type.toUpperCase()}</td>
            <td style="padding: 12px;">${expiryDate}</td>
            <td style="padding: 12px; color: ${daysUntilExpiry <= 7 ? '#dc2626' : daysUntilExpiry <= 14 ? '#f59e0b' : '#16a34a'}; font-weight: bold;">
              ${daysUntilExpiry} dias
            </td>
            <td style="padding: 12px; font-size: 12px; color: #666;">${durationInfo}</td>
          </tr>
        `;
      }).join("");

      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Alerta de Vencimento de Contratos</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">⚠️ Alerta de Vencimento de Contratos</h1>
            <p style="margin: 10px 0 0; opacity: 0.9;">Empresa: ${companyData.name}</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="color: #333; font-size: 16px; margin-top: 0;">
              Os seguintes contratos estão próximos do vencimento nos próximos <strong>${alertDays} dias</strong>:
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Colaborador</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Cargo</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Tipo</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Vencimento</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Restante</th>
                  <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0;">Info</th>
                </tr>
              </thead>
              <tbody>
                ${contractsList}
              </tbody>
            </table>
            
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #92400e;">
                <strong>Ação necessária:</strong> Revise os contratos listados e tome as medidas apropriadas (renovação, encerramento ou atualização).
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 0;">
              Este é um email automático do sistema Aure. Por favor, não responda diretamente.
            </p>
          </div>
        </body>
        </html>
      `;

      // Send email to each admin
      for (const admin of admins) {
        try {
          await sendEmailViaResend(admin.email, `⚠️ ${contracts.length} contrato(s) próximo(s) do vencimento - ${companyData.name}`, emailHtml);

          // Log notification
          await supabaseClient.from("notification_logs").insert({
            notification_type: "contract_expiration_alert",
            recipient_email: admin.email,
            subject: `${contracts.length} contrato(s) próximo(s) do vencimento`,
            company_id: companyId,
            status: "sent",
            metadata: {
              contracts_count: contracts.length,
              alert_days: alertDays,
              contract_ids: contracts.map(c => c.id),
            },
          });

          alertsSent++;
          console.log(`Alert sent to ${admin.email} for company ${companyData.name}`);
        } catch (emailError: unknown) {
          const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
          console.error(`Failed to send email to ${admin.email}:`, emailError);
          
          // Log failed notification
          await supabaseClient.from("notification_logs").insert({
            notification_type: "contract_expiration_alert",
            recipient_email: admin.email,
            subject: `${contracts.length} contrato(s) próximo(s) do vencimento`,
            company_id: companyId,
            status: "failed",
            metadata: {
              error: errorMessage,
              contracts_count: contracts.length,
            },
          });
        }
      }
    }

    console.log(`Contract expiration alerts completed. ${alertsSent} alerts sent.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Contract expiration alerts sent`,
        alertsSent,
        contractsFound: expiringContracts.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in contract-expiration-alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  type: "UPDATE";
  table: "contract_documents";
  record: {
    id: string;
    contract_id: string;
    signature_status: string;
    completed_at: string | null;
  };
  old_record: {
    signature_status: string;
  };
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

    const payload: WebhookPayload = await req.json();
    
    // Only process when signature_status changes to 'completed'
    if (
      payload.record.signature_status !== "completed" ||
      payload.old_record.signature_status === "completed"
    ) {
      return new Response(
        JSON.stringify({ message: "Not a completion event, skipping" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contractId = payload.record.contract_id;

    // Fetch contract details with company and collaborator info
    const { data: contract, error: contractError } = await supabaseClient
      .from("contracts")
      .select(`
        id,
        job_title,
        company_id,
        user_id,
        companies:company_id (name, email),
        profiles:user_id (full_name, email)
      `)
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      console.error("Error fetching contract:", contractError);
      throw new Error("Contract not found");
    }

    // Get all signers for the contract
    const { data: signatures, error: sigsError } = await supabaseClient
      .from("contract_signatures")
      .select("signer_email, signer_name, signer_type")
      .eq("document_id", payload.record.id);

    if (sigsError) {
      console.error("Error fetching signatures:", sigsError);
    }

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      console.error("Gmail credentials not configured");
      throw new Error("Email configuration missing");
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

    const collaboratorName = (contract.profiles as any)?.full_name || "Colaborador";
    const collaboratorEmail = (contract.profiles as any)?.email;
    const companyName = (contract.companies as any)?.name || "Empresa";
    const companyEmail = (contract.companies as any)?.email;

    // Email to collaborator
    if (collaboratorEmail) {
      const collaboratorHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Contrato Totalmente Assinado! 🎉</h2>
          <p>Olá <strong>${collaboratorName}</strong>,</p>
          <p>Seu contrato PJ com a empresa <strong>${companyName}</strong> para o cargo de <strong>${contract.job_title}</strong> foi totalmente assinado por todas as partes.</p>
          <p>O contrato está agora ativo e disponível para consulta no sistema.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Este email foi enviado automaticamente pelo Aure System.</p>
        </div>
      `;

      try {
        await client.send({
          from: `Aure System <${gmailUser}>`,
          to: collaboratorEmail,
          subject: `✅ Contrato Assinado - ${companyName}`,
          content: "auto",
          html: collaboratorHtml,
        });
        console.log(`Notification sent to collaborator: ${collaboratorEmail}`);

        // Log notification
        await supabaseClient.from("notification_logs").insert({
          notification_type: "contract_completed",
          recipient_email: collaboratorEmail,
          subject: `Contrato Assinado - ${companyName}`,
          status: "sent",
          company_id: contract.company_id,
          metadata: { contract_id: contractId, role: "collaborator" },
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${collaboratorEmail}:`, emailError);
        await supabaseClient.from("notification_logs").insert({
          notification_type: "contract_completed",
          recipient_email: collaboratorEmail,
          subject: `Contrato Assinado - ${companyName}`,
          status: "failed",
          company_id: contract.company_id,
          metadata: { contract_id: contractId, role: "collaborator", error: String(emailError) },
        });
      }
    }

    // Email to company
    if (companyEmail) {
      const companyHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Contrato Totalmente Assinado! 🎉</h2>
          <p>Olá,</p>
          <p>O contrato PJ com <strong>${collaboratorName}</strong> para o cargo de <strong>${contract.job_title}</strong> foi totalmente assinado por todas as partes.</p>
          <p>O contrato está agora ativo e será incluído no próximo ciclo de faturamento.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 12px;">Este email foi enviado automaticamente pelo Aure System.</p>
        </div>
      `;

      try {
        await client.send({
          from: `Aure System <${gmailUser}>`,
          to: companyEmail,
          subject: `✅ Contrato Assinado - ${collaboratorName}`,
          content: "auto",
          html: companyHtml,
        });
        console.log(`Notification sent to company: ${companyEmail}`);

        await supabaseClient.from("notification_logs").insert({
          notification_type: "contract_completed",
          recipient_email: companyEmail,
          subject: `Contrato Assinado - ${collaboratorName}`,
          status: "sent",
          company_id: contract.company_id,
          metadata: { contract_id: contractId, role: "company" },
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${companyEmail}:`, emailError);
        await supabaseClient.from("notification_logs").insert({
          notification_type: "contract_completed",
          recipient_email: companyEmail,
          subject: `Contrato Assinado - ${collaboratorName}`,
          status: "failed",
          company_id: contract.company_id,
          metadata: { contract_id: contractId, role: "company", error: String(emailError) },
        });
      }
    }

    await client.close();

    return new Response(
      JSON.stringify({ success: true, message: "Notifications sent" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in contract-signed-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

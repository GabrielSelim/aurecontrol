import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendEmailViaResend } from "../_shared/resend.ts";

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

// ─── Reminder mode: find pending_signature contracts ≥ 3 days old ───────────
async function handleReminderMode(supabase: ReturnType<typeof createClient>) {
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: pendingContracts, error } = await supabase
    .from("contracts")
    .select(`
      id, job_title, company_id, user_id, created_at,
      companies:company_id (name),
      profiles:user_id (full_name, email)
    `)
    .eq("status", "pending_signature")
    .lte("created_at", cutoff);

  if (error) {
    console.error("Error fetching pending contracts:", error);
    return { reminders: 0 };
  }

  if (!pendingContracts || pendingContracts.length === 0) {
    console.log("No contracts pending signature for ≥3 days");
    return { reminders: 0 };
  }

  let reminders = 0;

  for (const contract of pendingContracts) {
    // Fetch pending signers (not yet signed)
    const { data: pendingSigners } = await supabase
      .from("contract_signatures")
      .select("signer_email, signer_name, signer_type")
      .is("signed_at", null)
      .eq("contract_id", contract.id);

    if (!pendingSigners || pendingSigners.length === 0) continue;

    const companyName = (contract.companies as any)?.name || "Empresa";
    const collaboratorName = (contract.profiles as any)?.full_name || "Colaborador";
    const daysPending = Math.floor(
      (Date.now() - new Date(contract.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    for (const signer of pendingSigners) {
      // Check idempotency — don't send more than one reminder per day per signer
      const todayKey = `reminder_${contract.id}_${signer.signer_email}_${new Date().toISOString().slice(0, 10)}`;
      const { data: existing } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("notification_type", "signature_reminder")
        .eq("recipient_email", signer.signer_email)
        .filter("metadata->>idempotency_key", "eq", todayKey)
        .maybeSingle();

      if (existing) continue;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">⏳ Lembrete: Contrato aguardando sua assinatura</h2>
          <p>Olá <strong>${signer.signer_name}</strong>,</p>
          <p>O contrato PJ <strong>${contract.job_title}</strong> com <strong>${companyName}</strong>
             está aguardando sua assinatura há <strong>${daysPending} dia${daysPending > 1 ? "s" : ""}</strong>.</p>
          <p>Por favor, acesse o sistema para assinar o contrato o quanto antes.</p>
          <p style="margin: 24px 0;">
            <a href="${Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "").replace("http://supabase-kong:8000", "https://aurecontrol.com.br")}/assinar-contrato/${contract.id}"
               style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
              Assinar Contrato
            </a>
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
          <p style="color:#6b7280;font-size:12px;">Este lembrete foi enviado automaticamente pelo Aure System.
          Colaborador: ${collaboratorName}</p>
        </div>
      `;

      try {
        await sendEmailViaResend(
          signer.signer_email,
          `⏳ Lembrete: Contrato aguardando assinatura — ${companyName}`,
          html
        );
        await supabase.from("notification_logs").insert({
          notification_type: "signature_reminder",
          recipient_email: signer.signer_email,
          subject: `Lembrete: Contrato aguardando assinatura — ${companyName}`,
          status: "sent",
          company_id: contract.company_id,
          metadata: { contract_id: contract.id, days_pending: daysPending, idempotency_key: todayKey },
        });
        reminders++;
      } catch (err) {
        console.error(`Failed to send reminder to ${signer.signer_email}:`, err);
        await supabase.from("notification_logs").insert({
          notification_type: "signature_reminder",
          recipient_email: signer.signer_email,
          subject: `Lembrete: Contrato aguardando assinatura — ${companyName}`,
          status: "failed",
          company_id: contract.company_id,
          metadata: { contract_id: contract.id, days_pending: daysPending, idempotency_key: todayKey, error: String(err) },
        });
      }
    }
  }

  return { reminders };
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

    const body = await req.json().catch(() => ({}));

    // ── reminder_mode: called by pg_cron daily ─────────────────────────────
    if (body.reminder_mode === true) {
      const result = await handleReminderMode(supabaseClient);
      return new Response(
        JSON.stringify({ success: true, ...result }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── webhook mode: called when contract_documents updated ───────────────
    const payload = body as WebhookPayload;

    // Only process when signature_status changes to 'completed'
    if (
      payload.record?.signature_status !== "completed" ||
      payload.old_record?.signature_status === "completed"
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
        await sendEmailViaResend(collaboratorEmail, `✅ Contrato Assinado - ${companyName}`, collaboratorHtml);
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
        await sendEmailViaResend(companyEmail, `✅ Contrato Assinado - ${collaboratorName}`, companyHtml);
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

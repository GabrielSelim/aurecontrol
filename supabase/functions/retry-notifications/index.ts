import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Find failed notifications that haven't exceeded max retries
    const { data: failedNotifications, error: fetchError } = await supabaseClient
      .from("notification_logs")
      .select("*")
      .eq("status", "failed")
      .lt("retry_count", 3)
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error("Error fetching failed notifications:", fetchError);
      throw fetchError;
    }

    if (!failedNotifications || failedNotifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No failed notifications to retry", retried: 0 }),
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

    let retriedCount = 0;
    let successCount = 0;

    for (const notification of failedNotifications) {
      const attemptNumber = (notification.retry_count || 0) + 1;
      const idempotencyKey = `retry_${notification.id}_attempt_${attemptNumber}`;

      // Check idempotency - skip if already attempted with this key
      const { data: existingAttempt } = await supabaseClient
        .from("notification_delivery_logs")
        .select("id")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existingAttempt) {
        console.log(`Skipping duplicate retry for ${notification.id} attempt ${attemptNumber}`);
        continue;
      }

      try {
        // Rebuild email from metadata
        const metadata = notification.metadata as Record<string, unknown> | null;
        const subject = notification.subject;
        const recipientEmail = notification.recipient_email;

        // Simple retry email
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">${subject}</h2>
            <p>Esta é uma retentativa de envio automática.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="color: #6b7280; font-size: 12px;">Aure System - Notificação automática (tentativa ${attemptNumber})</p>
          </div>
        `;

        await client.send({
          from: `Aure System <${gmailUser}>`,
          to: recipientEmail,
          subject: `[Retry] ${subject}`,
          content: "auto",
          html: html,
        });

        // Log successful delivery
        await supabaseClient.from("notification_delivery_logs").insert({
          notification_log_id: notification.id,
          attempt_number: attemptNumber,
          status: "delivered",
          channel: "email",
          delivered_at: new Date().toISOString(),
          idempotency_key: idempotencyKey,
        });

        // Update notification status
        await supabaseClient
          .from("notification_logs")
          .update({
            status: "sent",
            retry_count: attemptNumber,
            last_retry_at: new Date().toISOString(),
            delivered_at: new Date().toISOString(),
          })
          .eq("id", notification.id);

        successCount++;
        console.log(`Retry successful for ${notification.id} (attempt ${attemptNumber})`);
      } catch (sendError) {
        // Log failed delivery attempt
        await supabaseClient.from("notification_delivery_logs").insert({
          notification_log_id: notification.id,
          attempt_number: attemptNumber,
          status: "failed",
          channel: "email",
          error_message: String(sendError),
          idempotency_key: idempotencyKey,
        });

        // Update retry count
        await supabaseClient
          .from("notification_logs")
          .update({
            retry_count: attemptNumber,
            last_retry_at: new Date().toISOString(),
          })
          .eq("id", notification.id);

        console.error(`Retry failed for ${notification.id}:`, sendError);
      }

      retriedCount++;
    }

    await client.close();

    return new Response(
      JSON.stringify({
        success: true,
        retried: retriedCount,
        succeeded: successCount,
        failed: retriedCount - successCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in retry-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

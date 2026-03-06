import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmailViaResend(to: string, subject: string, html: string, fromName = "Aure System"): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <noreply@gabrielsanztech.com.br>`,
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error (${res.status}): ${err}`);
  }
}

interface AnnouncementEmailRequest {
  announcement_id: string;
  title: string;
  message: string;
  target_type: "all" | "company" | "role" | "company_role";
  target_company_id?: string | null;
  target_roles?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting send-urgent-announcement function");

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Verify the user is a master admin
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is master admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "master_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      throw new Error("Only master admins can send urgent announcement emails");
    }

    const { announcement_id, title, message, target_type, target_company_id, target_roles }: AnnouncementEmailRequest = await req.json();

    console.log(`Processing announcement: ${title}, target_type: ${target_type}`);

    // Get target users based on announcement targeting
    let targetEmails: string[] = [];

    if (target_type === "all") {
      // Get all active users
      const { data: profiles, error } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("is_active", true);
      
      if (error) throw error;
      targetEmails = profiles?.map(p => p.email) || [];
    } 
    else if (target_type === "company") {
      // Get all users from specific company
      const { data: profiles, error } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("company_id", target_company_id)
        .eq("is_active", true);
      
      if (error) throw error;
      targetEmails = profiles?.map(p => p.email) || [];
    } 
    else if (target_type === "role") {
      // Get all users with specific roles across all companies
      const { data: userRoles, error: rolesError } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .in("role", target_roles || []);

      if (rolesError) throw rolesError;

      const userIds = userRoles?.map(ur => ur.user_id) || [];
      
      if (userIds.length > 0) {
        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("email")
          .in("user_id", userIds)
          .eq("is_active", true);
        
        if (error) throw error;
        targetEmails = profiles?.map(p => p.email) || [];
      }
    } 
    else if (target_type === "company_role") {
      // Get users with specific roles in specific company
      const { data: companyProfiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("user_id, email")
        .eq("company_id", target_company_id)
        .eq("is_active", true);

      if (profilesError) throw profilesError;

      const companyUserIds = companyProfiles?.map(p => p.user_id) || [];

      if (companyUserIds.length > 0) {
        const { data: userRoles, error: rolesError } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .in("user_id", companyUserIds)
          .in("role", target_roles || []);

        if (rolesError) throw rolesError;

        const targetUserIds = new Set(userRoles?.map(ur => ur.user_id) || []);
        targetEmails = companyProfiles
          ?.filter(p => targetUserIds.has(p.user_id))
          .map(p => p.email) || [];
      }
    }

    // Remove duplicates
    targetEmails = [...new Set(targetEmails)];

    console.log(`Found ${targetEmails.length} target emails`);

    if (targetEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No target users found", sent_count: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send emails

    const htmlTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .urgent-badge { background: #fef2f2; color: #dc2626; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; display: inline-block; margin-bottom: 10px; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .message { background: white; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin-top: 15px; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="urgent-badge">⚠️ URGENTE</span>
            <h1>${title}</h1>
          </div>
          <div class="content">
            <p>Você recebeu uma mensagem urgente do sistema Aure:</p>
            <div class="message">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <div class="footer">
              <p>Esta é uma mensagem automática do sistema Aure.</p>
              <p>Por favor, não responda a este email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Send emails in batches to avoid overwhelming the SMTP server
    for (const email of targetEmails) {
      try {
        await sendEmailViaResend(email, `⚠️ [URGENTE] ${title}`, htmlTemplate);
        sentCount++;
        console.log(`Email sent to ${email}`);

        // Log the notification
        await supabaseAdmin.from("notification_logs").insert({
          company_id: target_company_id || null,
          notification_type: "urgent_announcement",
          recipient_email: email,
          subject: `[URGENTE] ${title}`,
          status: "sent",
          metadata: { announcement_id },
        });
      } catch (emailError: any) {
        failedCount++;
        errors.push(`${email}: ${emailError.message}`);
        console.error(`Failed to send to ${email}:`, emailError);

        // Log the failed notification
        await supabaseAdmin.from("notification_logs").insert({
          company_id: target_company_id || null,
          notification_type: "urgent_announcement",
          recipient_email: email,
          subject: `[URGENTE] ${title}`,
          status: "failed",
          metadata: { announcement_id, error: emailError.message },
        });
      }
    }

    console.log(`Finished sending emails. Sent: ${sentCount}, Failed: ${failedCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Emails sent: ${sentCount}, Failed: ${failedCount}`,
        sent_count: sentCount,
        failed_count: failedCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-urgent-announcement:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

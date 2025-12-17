import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  from_name?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { to, subject, html, from_name }: EmailRequest = await req.json();

    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPassword = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPassword) {
      throw new Error("Gmail credentials not configured");
    }

    // Using Gmail SMTP via fetch to Google's API
    // For production, we'll use a simple SMTP approach via base64 encoding
    const senderName = from_name || "Aure System";
    
    // Create email content in RFC 2822 format
    const emailContent = [
      `From: ${senderName} <${gmailUser}>`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      html
    ].join("\r\n");

    // Encode credentials for Basic Auth
    const credentials = btoa(`${gmailUser}:${gmailPassword}`);

    // Send via Gmail SMTP using the Gmail API
    const response = await fetch("https://smtp.gmail.com:587", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
      },
    }).catch(() => null);

    // Since direct SMTP isn't available in Deno Deploy, we'll use an alternative approach
    // Using Gmail's API endpoint for sending emails
    const gmailApiUrl = "https://www.googleapis.com/gmail/v1/users/me/messages/send";
    
    // For Gmail API, we need OAuth. Since we have App Password, let's use nodemailer
    // Actually, let's use a simpler approach with smtp.ts library

    // Using Deno's built-in SMTP support isn't available, so we'll use the denodrivers/smtp
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

    await client.send({
      from: `${senderName} <${gmailUser}>`,
      to: to,
      subject: subject,
      content: "auto",
      html: html,
    });

    await client.close();

    console.log(`Email sent successfully to ${to}`);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);

/**
 * Shared Resend email helper for all Supabase Edge Functions.
 *
 * Required env vars:
 *  - RESEND_API_KEY   → API key from https://resend.com
 *  - RESEND_FROM_EMAIL (optional) → verified sender address, defaults to noreply@aurecontrol.com.br
 */
export async function sendEmailViaResend(
  to: string,
  subject: string,
  html: string,
  fromName = "Aure",
): Promise<void> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) throw new Error("RESEND_API_KEY not configured");

  const fromEmail =
    Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@aurecontrol.com.br";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <${fromEmail}>`,
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

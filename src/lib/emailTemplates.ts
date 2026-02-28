/**
 * Reusable email template utility for the Aure system.
 * Centralises HTML email markup so it can be maintained in one place.
 */

interface BaseEmailOptions {
  recipientName: string;
}

/** Notification email for a witness added to a PJ contract */
interface WitnessNotificationOptions extends BaseEmailOptions {
  contractorName: string;
  signingLink: string | null;
}

export function buildWitnessNotificationEmail({
  recipientName,
  contractorName,
  signingLink,
}: WitnessNotificationOptions): { subject: string; html: string } {
  const subject =
    "Você foi adicionado como testemunha em um contrato - Aure System";

  const signingBlock = signingLink
    ? `
      <p>Clique no botão abaixo para assinar o contrato:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${signingLink}"
           style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Assinar Contrato
        </a>
      </div>
      <p style="color: #666; font-size: 12px;">Ou copie e cole este link no seu navegador:</p>
      <p style="color: #666; font-size: 12px; word-break: break-all;">${signingLink}</p>
    `
    : `<p>Em breve você receberá instruções para assinar o documento.</p>`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Olá ${recipientName},</h2>
      <p>Você foi adicionado como <strong>testemunha</strong> em um contrato PJ no sistema Aure.</p>
      <p><strong>Contrato de:</strong> ${contractorName}</p>
      ${signingBlock}
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #666; font-size: 12px;">Este é um email automático do sistema Aure.</p>
    </div>
  `;

  return { subject, html };
}

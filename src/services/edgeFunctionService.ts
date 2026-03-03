import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Email via Edge Function                                           */
/* ------------------------------------------------------------------ */

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  from_name?: string;
}) {
  const { error } = await supabase.functions.invoke("send-email", {
    body: params,
  });

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  CNPJ Validation via Edge Function                                 */
/* ------------------------------------------------------------------ */

export async function validateCnpj(cnpj: string) {
  const { data, error } = await supabase.functions.invoke("validate-cnpj", {
    body: { cnpj },
  });

  if (error) throw error;
  return data;
}

/* ------------------------------------------------------------------ */
/*  Urgent Announcement via Edge Function                             */
/* ------------------------------------------------------------------ */

export async function sendUrgentAnnouncement(announcementId: string) {
  const { error } = await supabase.functions.invoke("send-urgent-announcement", {
    body: { announcement_id: announcementId },
  });

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Gerar Obrigações PJ via Edge Function                            */
/* ------------------------------------------------------------------ */

export async function gerarObrigacoesPJ(year?: number, month?: number) {
  const now = new Date();
  const { data, error } = await supabase.functions.invoke("gerar-obrigacoes-pj", {
    body: {
      year: year ?? now.getFullYear(),
      month: month ?? (now.getMonth() + 1),
    },
  });

  if (error) throw error;
  return data as {
    generated: number;
    skipped: number;
    errors: number;
    month: string;
    details: string[];
  };
}

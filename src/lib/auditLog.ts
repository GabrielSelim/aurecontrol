import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "contract_created"
  | "contract_updated"
  | "contract_status_changed"
  | "document_generated"
  | "document_updated"
  | "signature_requested"
  | "signature_completed"
  | "signature_cancelled"
  | "contract_sent"
  | "contract_completed"
  | "version_created"
  | "contract_viewed"
  | "certificate_downloaded"
  | "pdf_downloaded";

export type AuditCategory = "contract" | "document" | "signature" | "export" | "general";

const ACTION_LABELS: Record<string, string> = {
  contract_created: "Contrato criado",
  contract_updated: "Contrato atualizado",
  contract_status_changed: "Status do contrato alterado",
  document_generated: "Documento gerado",
  document_updated: "Documento atualizado",
  signature_requested: "Assinatura solicitada",
  signature_completed: "Assinatura realizada",
  signature_cancelled: "Assinatura cancelada",
  contract_sent: "Contrato enviado para assinatura",
  contract_completed: "Contrato totalmente assinado",
  version_created: "Nova versão criada",
  contract_viewed: "Contrato visualizado",
  certificate_downloaded: "Certificado baixado",
  pdf_downloaded: "PDF baixado",
};

const ACTION_CATEGORIES: Record<string, AuditCategory> = {
  contract_created: "contract",
  contract_updated: "contract",
  contract_status_changed: "contract",
  document_generated: "document",
  document_updated: "document",
  signature_requested: "signature",
  signature_completed: "signature",
  signature_cancelled: "signature",
  contract_sent: "contract",
  contract_completed: "contract",
  version_created: "document",
  contract_viewed: "general",
  certificate_downloaded: "export",
  pdf_downloaded: "export",
};

export function getAuditActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

export function getAuditCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    contract: "Contrato",
    document: "Documento",
    signature: "Assinatura",
    export: "Exportação",
    general: "Geral",
  };
  return labels[category] || category;
}

export async function logAuditAction(params: {
  contractId: string;
  documentId?: string;
  action: AuditAction;
  actorName: string;
  actorEmail: string;
  details?: Record<string, unknown>;
}) {
  try {
    let ipAddress = "";
    try {
      const res = await fetch("https://api.ipify.org?format=json");
      const data = await res.json();
      ipAddress = data.ip || "";
    } catch { /* ignore */ }

    await (supabase as any).from("contract_audit_logs").insert({
      contract_id: params.contractId,
      document_id: params.documentId || null,
      action: params.action,
      action_category: ACTION_CATEGORIES[params.action] || "general",
      actor_id: (await supabase.auth.getUser()).data.user?.id || null,
      actor_name: params.actorName,
      actor_email: params.actorEmail,
      details: params.details || {},
      ip_address: ipAddress,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    console.error("Failed to log audit action:", error);
  }
}

export async function createContractVersion(params: {
  contractId: string;
  documentId: string;
  documentHtml: string;
  changeSummary?: string;
}) {
  try {
    // Get next version number
    const { data: existing } = await (supabase as any)
      .from("contract_versions")
      .select("version_number")
      .eq("contract_id", params.contractId)
      .order("version_number", { ascending: false })
      .limit(1);

    const nextVersion = (existing?.[0]?.version_number || 0) + 1;

    // Generate hash client-side using simple approach
    const hash = await generateClientHash(params.documentHtml);

    const userId = (await supabase.auth.getUser()).data.user?.id || null;

    await (supabase as any).from("contract_versions").insert({
      contract_id: params.contractId,
      document_id: params.documentId,
      version_number: nextVersion,
      document_html: params.documentHtml,
      document_hash: hash,
      change_summary: params.changeSummary || `Versão ${nextVersion}`,
      created_by: userId,
    });

    return nextVersion;
  } catch (error) {
    console.error("Failed to create version:", error);
    return null;
  }
}

async function generateClientHash(content: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback: simple hash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(16, "0");
}

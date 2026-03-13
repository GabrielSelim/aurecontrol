import { supabase } from "@/integrations/supabase/client";

/* ================================================================== */
/*  Contract Templates                                                */
/* ================================================================== */

export async function fetchTemplateById(templateId: string) {
  const { data, error } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchActiveTemplates(companyId?: string | null) {
  const query = supabase
    .from("contract_templates")
    .select("*")
    .eq("is_active", true)
    .order("is_system_default", { ascending: false })
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createTemplate(template: {
  company_id: string | null;
  name: string;
  description: string | null;
  content: string;
  default_witness_count: number;
  is_system_default: boolean;
  created_by: string | null;
  category: string | null;
}) {
  const { error } = await supabase
    .from("contract_templates")
    .insert(template);

  if (error) throw error;
}

export async function updateTemplate(
  templateId: string,
  fields: {
    name?: string;
    description?: string | null;
    content?: string;
    default_witness_count?: number;
    category?: string | null;
  }
) {
  const { error } = await supabase
    .from("contract_templates")
    .update(fields)
    .eq("id", templateId);

  if (error) throw error;
}

export async function softDeleteTemplate(templateId: string) {
  const { error } = await supabase
    .from("contract_templates")
    .update({ is_active: false })
    .eq("id", templateId);

  if (error) throw error;
}

export async function duplicateTemplate(template: {
  company_id: string | null;
  name: string;
  description: string | null;
  content: string;
  default_witness_count: number;
  category: string | null;
  created_by: string | null;
}) {
  const { error } = await supabase
    .from("contract_templates")
    .insert({ ...template, is_system_default: false });

  if (error) throw error;
}

/* ================================================================== */
/*  Template Versions                                                 */
/* ================================================================== */

export async function fetchTemplateVersions(templateId: string) {
  const { data, error } = await supabase
    .from("contract_template_versions")
    .select("*")
    .eq("template_id", templateId)
    .order("version_number", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getLatestVersionNumber(templateId: string) {
  const { data } = await supabase
    .from("contract_template_versions")
    .select("version_number")
    .eq("template_id", templateId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.version_number ?? 0;
}

export async function createTemplateVersion(version: {
  template_id: string;
  version_number: number;
  name: string;
  description: string | null;
  content: string;
  saved_by: string | null;
}) {
  const { error } = await supabase
    .from("contract_template_versions")
    .insert(version);

  if (error) throw error;
}

/* ================================================================== */
/*  Template Usage                                                    */
/* ================================================================== */

export async function fetchTemplateUsageCounts() {
  const { data, error } = await supabase
    .from("contract_documents")
    .select("template_id");

  if (error) throw error;
  return data ?? [];
}

/* ================================================================== */
/*  Contracts                                                         */
/* ================================================================== */

export async function fetchContract(contractId: string) {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("id", contractId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchContractsByCompany(
  companyId: string,
  filters?: { status?: string; contract_type?: string }
) {
  let query = supabase
    .from("contracts")
    .select("*")
    .eq("company_id", companyId);

  if (filters?.status) query = query.eq("status", filters.status as never);
  if (filters?.contract_type) query = query.eq("contract_type", filters.contract_type as never);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchActiveContractsByCompany(companyId: string) {
  const { data, error } = await supabase
    .from("contracts")
    .select("id, job_title, user_id, salary")
    .eq("company_id", companyId)
    .eq("status", "active");

  if (error) throw error;
  return data ?? [];
}

export async function updateContractStatus(
  contractId: string,
  status: string
) {
  const { error } = await supabase
    .from("contracts")
    .update({ status: status as never })
    .eq("id", contractId);

  if (error) throw error;
}

export async function countContractsByCompany(
  companyId: string,
  contractType?: string
) {
  let query = supabase
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (contractType) query = query.eq("contract_type", contractType as never);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function countActivePJContracts(companyId: string) {
  const { count, error } = await supabase
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("contract_type", "PJ")
    .eq("status", "active");

  if (error) throw error;
  return count ?? 0;
}

export async function countAllActivePJContracts() {
  const { count, error } = await supabase
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .eq("contract_type", "PJ")
    .eq("status", "active");

  if (error) throw error;
  return count ?? 0;
}

export async function countActiveContractsByType(companyId: string, contractType: string) {
  const { count, error } = await supabase
    .from("contracts")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("contract_type", contractType)
    .in("status", ["active", "assinado"]);

  if (error) throw error;
  return count ?? 0;
}

export async function fetchContractsByUser(userId: string) {
  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createContract(contractData: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("contracts")
    .insert(contractData as never)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createDocument(docData: Record<string, unknown>) {
  const { data, error } = await supabase
    .from("contract_documents")
    .insert(docData as never)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createSignatures(
  entries: Array<Record<string, unknown>>
) {
  const { error } = await supabase
    .from("contract_signatures")
    .insert(entries as never);

  if (error) throw error;
}

export async function createContractSplits(
  splits: Array<Record<string, unknown>>
) {
  const { error } = await supabase
    .from("contract_splits")
    .insert(splits as never);

  if (error) throw error;
}

export async function fetchDocumentHtml(contractId: string) {
  const { data, error } = await supabase
    .from("contract_documents")
    .select("document_html")
    .eq("contract_id", contractId)
    .single();

  if (error) throw error;
  return data?.document_html ?? null;
}

export async function fetchContractsByIds(
  ids: string[],
  filters?: { contract_type?: string; status?: string }
) {
  let query = supabase
    .from("contracts")
    .select("*")
    .in("id", ids);

  if (filters?.contract_type) query = query.eq("contract_type", filters.contract_type as never);
  if (filters?.status) query = query.eq("status", filters.status as never);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchContractDocumentById(documentId: string) {
  const { data, error } = await supabase
    .from("contract_documents")
    .select("contract_id")
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchExpiringContracts(
  companyId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from("contracts")
    .select("id, job_title, end_date, user_id")
    .eq("company_id", companyId)
    .lte("end_date", endDate)
    .gte("end_date", startDate);

  if (error) throw error;
  return data ?? [];
}

export async function fetchContractUserIds(
  companyId: string,
  status: string
) {
  const { data, error } = await supabase
    .from("contracts")
    .select("user_id")
    .eq("company_id", companyId)
    .eq("status", status as never);

  if (error) throw error;
  return data ?? [];
}

export async function fetchContractSalaries(
  companyId: string,
  status: string
) {
  const { data, error } = await supabase
    .from("contracts")
    .select("salary")
    .eq("company_id", companyId)
    .eq("status", status as never);

  if (error) throw error;
  return data ?? [];
}

export async function fetchActiveTemplatesByCompany(
  companyId: string,
  select = "id, name"
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from("contract_templates")
    .select(select as "*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return (data ?? []) as unknown as { id: string; name: string }[];
}

export async function fetchPendingSignaturesByEmail(email: string) {
  const { data, error } = await supabase
    .from("contract_signatures")
    .select("id, signer_name, document_id, signing_token")
    .eq("signer_email", email)
    .is("signed_at", null);

  if (error) throw error;
  return data ?? [];
}

/* ================================================================== */
/*  Contract Documents                                                */
/* ================================================================== */

export async function fetchContractDocument(contractId: string) {
  const { data, error } = await supabase
    .from("contract_documents")
    .select("*")
    .eq("contract_id", contractId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchCompletedDocuments() {
  const { data, error } = await supabase
    .from("contract_documents")
    .select("contract_id, completed_at")
    .eq("signature_status", "completed");

  if (error) throw error;
  return data ?? [];
}

export async function updateDocumentStatus(
  documentId: string,
  status: string,
  completedAt?: string
) {
  const fields: Record<string, unknown> = { signature_status: status };
  if (completedAt) fields.completed_at = completedAt;

  const { error } = await supabase
    .from("contract_documents")
    .update(fields)
    .eq("id", documentId);

  if (error) throw error;
}

/* ================================================================== */
/*  Contract Signatures                                               */
/* ================================================================== */

export async function fetchSignaturesByDocument(documentId: string) {
  const { data, error } = await supabase
    .from("contract_signatures")
    .select("*")
    .eq("document_id", documentId)
    .order("signer_order");

  if (error) throw error;
  return data ?? [];
}

export async function fetchSignatureByToken(token: string) {
  const { data, error } = await supabase
    .from("contract_signatures")
    .select("id, signer_name, signer_email, signed_at, document_id")
    .eq("signing_token", token)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateSignature(
  signatureId: string,
  fields: Record<string, unknown>
) {
  const { error } = await supabase
    .from("contract_signatures")
    .update(fields)
    .eq("id", signatureId);

  if (error) throw error;
}

export async function recordSignature(
  signatureId: string,
  signatureImageUrl: string,
  ipAddress: string | null,
  userAgent: string | null,
  token?: string
) {
  let query = supabase
    .from("contract_signatures")
    .update({
      signed_at: new Date().toISOString(),
      signature_image_url: signatureImageUrl,
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .eq("id", signatureId);

  if (token) query = query.eq("signing_token", token);

  const { error } = await query;
  if (error) throw error;
}

export async function fetchSignatureToken(signatureId: string) {
  const { data, error } = await supabase
    .from("contract_signatures")
    .select("signing_token")
    .eq("id", signatureId)
    .maybeSingle();

  if (error) throw error;
  return data?.signing_token ?? null;
}

export async function updateSignaturePositions(
  positions: Array<{
    id: string;
    position_x: number;
    position_y: number;
    position_page: number;
    position_width: number;
    position_height: number;
  }>
) {
  for (const pos of positions) {
    const { error } = await supabase
      .from("contract_signatures")
      .update({
        position_x: pos.position_x,
        position_y: pos.position_y,
        position_page: pos.position_page,
        position_width: pos.position_width,
        position_height: pos.position_height,
      })
      .eq("id", pos.id);

    if (error) throw error;
  }
}

export async function checkAllSignaturesCompleted(documentId: string) {
  const { data, error } = await supabase
    .from("contract_signatures")
    .select("signed_at")
    .eq("document_id", documentId);

  if (error) throw error;
  return (data ?? []).every((s) => s.signed_at !== null);
}

/* ================================================================== */
/*  Signature Storage                                                 */
/* ================================================================== */

export async function uploadSignatureImage(
  fileName: string,
  blob: Blob
) {
  const { error } = await supabase.storage
    .from("contract-signatures")
    .upload(fileName, blob, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage
    .from("contract-signatures")
    .getPublicUrl(fileName);

  return data.publicUrl;
}

export async function checkSignatureStorageAvailable() {
  const { data } = await supabase.storage.listBuckets();
  return (data ?? []).some(
    (b) => b.name === "contract-signatures"
  );
}

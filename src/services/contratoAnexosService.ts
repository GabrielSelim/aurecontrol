import { supabase } from "@/integrations/supabase/client";

export interface ContratoAnexo {
  id: string;
  contract_id: string;
  company_id: string;
  uploaded_by: string;
  name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  created_at: string;
}

export async function fetchContratoAnexos(contractId: string): Promise<ContratoAnexo[]> {
  const { data, error } = await supabase
    .from("contrato_anexos")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ContratoAnexo[];
}

export async function uploadContratoAnexo(params: {
  contractId: string;
  companyId: string;
  uploadedBy: string;
  file: File;
  description?: string;
}): Promise<ContratoAnexo> {
  const { contractId, companyId, uploadedBy, file, description } = params;
  const ext = file.name.split(".").pop();
  const filePath = `${companyId}/${contractId}/${Date.now()}_${file.name}`;

  // Upload to storage
  const { error: storageErr } = await supabase.storage
    .from("contrato-anexos")
    .upload(filePath, file, { contentType: file.type });

  if (storageErr) throw storageErr;

  // Insert record
  const { data, error } = await supabase
    .from("contrato_anexos")
    .insert({
      contract_id: contractId,
      company_id: companyId,
      uploaded_by: uploadedBy,
      name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
      description: description ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ContratoAnexo;
}

export async function deleteContratoAnexo(anexoId: string, filePath: string): Promise<void> {
  // Remove from storage
  await supabase.storage.from("contrato-anexos").remove([filePath]);

  // Remove record
  const { error } = await supabase
    .from("contrato_anexos")
    .delete()
    .eq("id", anexoId);

  if (error) throw error;
}

export function getAnexoPublicUrl(filePath: string): string {
  const { data } = supabase.storage
    .from("contrato-anexos")
    .getPublicUrl(filePath);
  return data.publicUrl;
}

export async function getAnexoSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from("contrato-anexos")
    .createSignedUrl(filePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

import { supabase } from "@/integrations/supabase/client";

export interface NfseRecord {
  id: string;
  contract_id: string;
  company_id: string;
  numero: string | null;
  valor: number;
  competencia: string;
  status: "pendente" | "emitida" | "cancelada" | "erro";
  xml: string | null;
  pdf_url: string | null;
  error_message: string | null;
  emitida_em: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractSplit {
  id: string;
  contract_id: string;
  beneficiary_name: string;
  beneficiary_document: string | null;
  beneficiary_bank: string | null;
  beneficiary_agency: string | null;
  beneficiary_account: string | null;
  percentage: number;
  created_at: string;
}

export async function fetchNfseByContract(contractId: string): Promise<NfseRecord[]> {
  const { data, error } = await supabase
    .from("nfse")
    .select("*")
    .eq("contract_id", contractId)
    .order("competencia", { ascending: false });

  if (error) throw error;
  return (data ?? []) as NfseRecord[];
}

export async function createNfse(nfse: {
  contractId: string;
  companyId: string;
  valor: number;
  competencia: string;
}): Promise<NfseRecord> {
  const { data, error } = await supabase
    .from("nfse")
    .insert([{
      contract_id: nfse.contractId,
      company_id: nfse.companyId,
      valor: nfse.valor,
      competencia: nfse.competencia,
      status: "pendente",
    }])
    .select()
    .single();

  if (error) throw error;
  return data as NfseRecord;
}

export async function cancelNfse(nfseId: string): Promise<void> {
  const { error } = await supabase
    .from("nfse")
    .update({ status: "cancelada" })
    .eq("id", nfseId);

  if (error) throw error;
}

// Contract Splits

export async function fetchSplitsByContract(contractId: string): Promise<ContractSplit[]> {
  const { data, error } = await supabase
    .from("contract_splits")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createContractSplit(split: {
  contractId: string;
  beneficiaryName: string;
  beneficiaryDocument?: string;
  beneficiaryBank?: string;
  beneficiaryAgency?: string;
  beneficiaryAccount?: string;
  percentage: number;
}): Promise<ContractSplit> {
  const { data, error } = await supabase
    .from("contract_splits")
    .insert([{
      contract_id: split.contractId,
      beneficiary_name: split.beneficiaryName,
      beneficiary_document: split.beneficiaryDocument ?? null,
      beneficiary_bank: split.beneficiaryBank ?? null,
      beneficiary_agency: split.beneficiaryAgency ?? null,
      beneficiary_account: split.beneficiaryAccount ?? null,
      percentage: split.percentage,
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteContractSplit(splitId: string): Promise<void> {
  const { error } = await supabase
    .from("contract_splits")
    .delete()
    .eq("id", splitId);

  if (error) throw error;
}

import { supabase } from "@/integrations/supabase/client";

export interface PJOnboardingData {
  // Step 1 — Dados pessoais
  full_name: string;
  cpf: string;
  phone: string;
  birth_date?: string;
  nationality?: string;
  // Step 2 — Dados da empresa
  pj_cnpj: string;
  pj_razao_social: string;
  pj_nome_fantasia?: string;
  pj_regime_tributario: string;
  // Step 3 — Endereço
  address_cep?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  // Step 4 — Dados bancários
  pj_bank_name?: string;
  pj_bank_agency?: string;
  pj_bank_account?: string;
  pj_bank_account_type?: string;
  pj_pix_key?: string;
  pj_pix_key_type?: string;
}

export async function savePJOnboarding(userId: string, data: PJOnboardingData) {
  const { error } = await supabase
    .from("profiles")
    .update({
      ...data,
      pj_onboarding_done: true,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;
}

export async function fetchPJProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id, user_id, full_name, email, cpf, phone, avatar_url,
      birth_date, nationality,
      pj_cnpj, pj_razao_social, pj_nome_fantasia, pj_regime_tributario,
      address_cep, address_street, address_number, address_complement,
      address_neighborhood, address_city, address_state,
      pj_bank_name, pj_bank_agency, pj_bank_account, pj_bank_account_type,
      pj_pix_key, pj_pix_key_type, pj_onboarding_done
    `)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchPJContracts(userId: string) {
  const { data, error } = await supabase
    .from("contracts")
    .select(`
      id, job_title, contract_type, salary, start_date, end_date,
      status, company_id, created_at
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchPJPayments(userId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id, amount, due_date, paid_at, status, description, contract_id,
      payment_method, notes, created_at
    `)
    .eq("user_id", userId)
    .order("due_date", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

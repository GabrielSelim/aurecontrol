import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Company Read                                                      */
/* ------------------------------------------------------------------ */

export async function fetchCompany(companyId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("name, cnpj, email, phone, address")
    .eq("id", companyId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchCompanyFull(companyId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchAllCompanies() {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchActiveCompanies() {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, cnpj")
    .eq("is_active", true)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function fetchCompaniesByIds(ids: string[]) {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, cnpj")
    .in("id", ids);

  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/*  Company Update                                                    */
/* ------------------------------------------------------------------ */

export async function updateCompany(
  companyId: string,
  fields: Record<string, unknown>
) {
  const { error } = await supabase
    .from("companies")
    .update(fields)
    .eq("id", companyId);

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Logo Storage                                                      */
/* ------------------------------------------------------------------ */

export async function uploadCompanyLogo(fileName: string, file: File) {
  const { error } = await supabase.storage
    .from("logos")
    .upload(fileName, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("logos").getPublicUrl(fileName);
  return data.publicUrl;
}

/* ------------------------------------------------------------------ */
/*  Company Counts                                                    */
/* ------------------------------------------------------------------ */

export async function countAllCompanies() {
  const { count, error } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

export async function countActiveCompanies() {
  const { count, error } = await supabase
    .from("companies")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  if (error) throw error;
  return count ?? 0;
}

export async function fetchRecentCompanies(limit = 5) {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function fetchCompanyName(companyId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  if (error) throw error;
  return data?.name ?? null;
}

export async function fetchCompanyMaybe(companyId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

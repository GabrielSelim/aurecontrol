import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Profile CRUD                                                      */
/* ------------------------------------------------------------------ */

export async function fetchProfile(profileId: string, companyId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", profileId)
    .eq("company_id", companyId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(
  userId: string,
  fields: Record<string, unknown>
) {
  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function updateProfileById(
  profileId: string,
  fields: Record<string, unknown>
) {
  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", profileId);

  if (error) throw error;
}

export async function fetchProfileByUserId(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function fetchProfileByEmail(
  email: string,
  companyId: string,
  select = "full_name, cpf, phone, pj_cnpj, pj_razao_social, address_cep, address_street, address_city"
) {
  const { data, error } = await supabase
    .from("profiles")
    .select(select)
    .eq("email", email)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function countProfilesByCompany(companyId: string) {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) throw error;
  return count ?? 0;
}

/* ------------------------------------------------------------------ */
/*  User Roles                                                        */
/* ------------------------------------------------------------------ */

export async function fetchUserRoles(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

export async function fetchUserRolesByUserIds(userIds: string[]) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("user_id", userIds);

  if (error) throw error;
  return data ?? [];
}

export async function fetchUserIdsByRole(role: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", role);

  if (error) throw error;
  return (data ?? []).map((r) => r.user_id);
}

export async function deleteUserRoles(userId: string) {
  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .neq("role", "master_admin");

  if (error) throw error;
}

export async function insertUserRole(userId: string, role: string) {
  const { error } = await supabase
    .from("user_roles")
    .insert({ user_id: userId, role });

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Bulk / Filtered Queries                                           */
/* ------------------------------------------------------------------ */

export async function fetchProfilesByCompany(
  companyId: string,
  options?: { isActive?: boolean; select?: string }
) {
  let query = supabase
    .from("profiles")
    .select(options?.select ?? "*")
    .eq("company_id", companyId);

  if (options?.isActive !== undefined) query = query.eq("is_active", options.isActive);
  query = query.order("full_name");

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function fetchProfileByUserIdMaybe(
  userId: string,
  select = "full_name, email"
) {
  const { data, error } = await supabase
    .from("profiles")
    .select(select)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchProfilesByUserIds(
  userIds: string[],
  select = "*"
) {
  const { data, error } = await supabase
    .from("profiles")
    .select(select)
    .in("user_id", userIds);

  if (error) throw error;
  return data ?? [];
}

export async function countActiveProfilesByCompany(companyId: string) {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("is_active", true);

  if (error) throw error;
  return count ?? 0;
}

/* ------------------------------------------------------------------ */
/*  Avatar Storage                                                    */
/* ------------------------------------------------------------------ */

export async function uploadAvatar(fileName: string, file: File) {
  const { error } = await supabase.storage
    .from("avatars")
    .upload(fileName, file, { upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
  return data.publicUrl;
}

import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Invites CRUD                                                      */
/* ------------------------------------------------------------------ */

export async function fetchInvitesByCompany(companyId: string) {
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function checkDuplicateInvite(
  email: string,
  companyId: string
) {
  const { data, error } = await supabase
    .from("invites")
    .select("id")
    .eq("email", email)
    .eq("company_id", companyId)
    .eq("status", "pending")
    .maybeSingle();

  if (error) throw error;
  return data; // null means no duplicate
}

export async function createInvite(invite: {
  email: string;
  role: string;
  company_id: string;
  invited_by: string;
  expires_at?: string;
}) {
  const { data, error } = await supabase
    .from("invites")
    .insert(invite)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateInviteStatus(
  inviteId: string,
  status: string,
  extraFields?: Record<string, unknown>
) {
  const { error } = await supabase
    .from("invites")
    .update({ status, ...extraFields })
    .eq("id", inviteId);

  if (error) throw error;
}

export async function extendInviteExpiry(
  inviteId: string,
  newExpiresAt: string
) {
  const { error } = await supabase
    .from("invites")
    .update({ expires_at: newExpiresAt })
    .eq("id", inviteId);

  if (error) throw error;
}

export async function renewExpiredInvite(
  inviteId: string,
  newExpiresAt: string
) {
  const { error } = await supabase
    .from("invites")
    .update({ status: "pending", expires_at: newExpiresAt })
    .eq("id", inviteId);

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  RPC                                                               */
/* ------------------------------------------------------------------ */

export async function getInviteByToken(token: string) {
  const { data, error } = await supabase.rpc("get_invite_by_token", {
    _token: token,
  });

  if (error) throw error;
  return data;
}

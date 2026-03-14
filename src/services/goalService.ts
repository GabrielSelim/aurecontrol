import { supabase } from "@/integrations/supabase/client";

export interface ContractGoal {
  id: string;
  contract_id: string;
  company_id: string;
  name: string;
  description: string | null;
  target_value: number | null;
  status: "pending" | "achieved" | "rejected" | "partial";
  due_date: string | null;
  achieved_at: string | null;
  reviewed_by: string | null;
  reviewer_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractGoalInsert {
  contract_id: string;
  company_id: string;
  name: string;
  description?: string | null;
  target_value?: number | null;
  due_date?: string | null;
  created_by?: string | null;
}

export async function fetchGoalsByContract(contractId: string): Promise<ContractGoal[]> {
  const { data, error } = await supabase
    .from("contract_goals")
    .select("*")
    .eq("contract_id", contractId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ContractGoal[];
}

export async function createGoal(payload: ContractGoalInsert): Promise<ContractGoal> {
  const { data, error } = await supabase
    .from("contract_goals")
    .insert(payload as never)
    .select()
    .single();

  if (error) throw error;
  return data as ContractGoal;
}

export async function updateGoalStatus(
  goalId: string,
  status: ContractGoal["status"],
  reviewedBy: string,
  reviewerNotes?: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    reviewed_by: reviewedBy,
    reviewer_notes: reviewerNotes ?? null,
    updated_at: new Date().toISOString(),
  };
  if (status === "achieved") {
    updates.achieved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("contract_goals")
    .update(updates as never)
    .eq("id", goalId);

  if (error) throw error;
}

export async function deleteGoal(goalId: string): Promise<void> {
  const { error } = await supabase
    .from("contract_goals")
    .delete()
    .eq("id", goalId);

  if (error) throw error;
}

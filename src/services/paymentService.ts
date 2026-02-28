import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Payments CRUD                                                     */
/* ------------------------------------------------------------------ */

export async function fetchPaymentsByCompany(companyId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createPayments(
  payloads: Array<Record<string, unknown>>
) {
  const { error } = await supabase.from("payments").insert(payloads);
  if (error) throw error;
}

export async function approvePayment(
  paymentId: string,
  approvedBy: string,
  paymentDate: string
) {
  const { error } = await supabase
    .from("payments")
    .update({
      status: "paid",
      payment_date: paymentDate,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  if (error) throw error;
}

export async function batchApprovePayments(
  ids: string[],
  approvedBy: string,
  paymentDate: string
) {
  const { error } = await supabase
    .from("payments")
    .update({
      status: "paid",
      payment_date: paymentDate,
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (error) throw error;
}

export async function rejectPayment(paymentId: string) {
  const { error } = await supabase
    .from("payments")
    .update({ status: "rejected" })
    .eq("id", paymentId);

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Contract Splits                                                   */
/* ------------------------------------------------------------------ */

export async function fetchContractSplits() {
  const { data, error } = await supabase
    .from("contract_splits")
    .select("contract_id, beneficiary_name, beneficiary_document, percentage");

  if (error) throw error;
  return data ?? [];
}

/* ------------------------------------------------------------------ */
/*  Billings                                                          */
/* ------------------------------------------------------------------ */

export async function fetchAllBillings() {
  const { data, error } = await supabase
    .from("company_billings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createBilling(billing: {
  company_id: string;
  reference_month: string;
  pj_contracts_count: number;
  unit_price: number;
  subtotal: number;
  total: number;
  due_date: string;
  status: string;
}) {
  const { error } = await supabase
    .from("company_billings")
    .insert([billing]);

  if (error) throw error;
}

export async function markBillingAsPaid(
  billingId: string,
  paymentMethod: string
) {
  const { error } = await supabase
    .from("company_billings")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod,
    })
    .eq("id", billingId);

  if (error) throw error;
}

export async function cancelBilling(billingId: string) {
  const { error } = await supabase
    .from("company_billings")
    .update({ status: "cancelled" })
    .eq("id", billingId);

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Per-User Payments                                                 */
/* ------------------------------------------------------------------ */

export async function fetchPaymentsByUser(userId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function countPaymentsByUser(userId: string) {
  const { count, error } = await supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

/* ------------------------------------------------------------------ */
/*  Payment Counts & Aggregations                                     */
/* ------------------------------------------------------------------ */

export async function countPaymentsByCompany(
  companyId: string,
  filters?: { status?: string; fromDate?: string }
) {
  let query = supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.fromDate) query = query.gte("created_at", filters.fromDate);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchPaidPaymentsInRange(filters: {
  companyId?: string;
  fromDate: string;
  toDate: string;
}) {
  let query = supabase
    .from("payments")
    .select("amount")
    .eq("status", "paid")
    .gte("payment_date", filters.fromDate)
    .lte("payment_date", filters.toDate);

  if (filters.companyId) query = query.eq("company_id", filters.companyId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function countPendingPayments(companyId?: string) {
  let query = supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (companyId) query = query.eq("company_id", companyId);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function countOverduePayments(filters?: {
  companyId?: string;
  beforeDate?: string;
}) {
  let query = supabase
    .from("payments")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  if (filters?.companyId) query = query.eq("company_id", filters.companyId);
  if (filters?.beforeDate) query = query.lt("due_date", filters.beforeDate);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchDelinquentContractIds(companyId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("contract_id")
    .eq("company_id", companyId)
    .eq("status", "pending")
    .lt("due_date", new Date().toISOString());

  if (error) throw error;
  return data ?? [];
}

export async function fetchBillingsByCompany(companyId: string) {
  const { data, error } = await supabase
    .from("company_billings")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function countBillingsByCompany(companyId: string) {
  const { count, error } = await supabase
    .from("company_billings")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId);

  if (error) throw error;
  return count ?? 0;
}

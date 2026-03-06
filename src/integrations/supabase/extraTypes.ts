/**
 * Supplementary Supabase table types for tables not yet in the auto-generated types.
 *
 * These types cover `contract_audit_logs` and `contract_versions` which exist
 * in the database but were added after the last `supabase gen types` run.
 *
 * Once you regenerate types (`supabase gen types typescript`), you can remove
 * this file and update imports accordingly.
 */

import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  contract_audit_logs                                               */
/* ------------------------------------------------------------------ */

export interface ContractAuditLogRow {
  id: string;
  contract_id: string;
  document_id: string | null;
  action: string;
  action_category: string;
  actor_id: string | null;
  actor_name: string;
  actor_email: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ContractAuditLogInsert {
  contract_id: string;
  document_id?: string | null;
  action: string;
  action_category?: string;
  actor_id?: string | null;
  actor_name: string;
  actor_email: string;
  details?: Record<string, unknown>;
  ip_address?: string | null;
  user_agent?: string | null;
}

/* ------------------------------------------------------------------ */
/*  contract_versions                                                 */
/* ------------------------------------------------------------------ */

export interface ContractVersionRow {
  id: string;
  contract_id: string;
  document_id: string;
  version_number: number;
  document_html: string;
  document_hash: string | null;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ContractVersionInsert {
  contract_id: string;
  document_id: string;
  version_number: number;
  document_html: string;
  document_hash?: string | null;
  change_summary?: string | null;
  created_by?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Typed helpers — avoid `(supabase as any).from(...)` casts         */
/* ------------------------------------------------------------------ */

/**
 * Access the `contract_audit_logs` table with typed Row/Insert support.
 *
 * Now that `contract_audit_logs` is in the generated Database types,
 * this helper simply returns the typed query builder directly.
 */
 
export function auditLogsTable() {
  return supabase.from("contract_audit_logs");
}

/**
 * Access the `contract_versions` table with typed Row/Insert support.
 *
 * `contract_versions` is not yet in the generated types (no migration exists).
 * Uses an `as unknown as` cast internally so callers don't have to.
 */
 
export function contractVersionsTable() {
  return (supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> })
    .from("contract_versions");
}

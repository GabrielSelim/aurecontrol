/**
 * Shared rate-limiting helper for Supabase Edge Functions.
 *
 * Uses the `rate_limit_check` PostgreSQL RPC function (defined in migration
 * 20260315010000_rate_limits.sql) to count calls per (key, window).
 *
 * Usage:
 *   import { checkRateLimit } from "../_shared/rateLimit.ts";
 *
 *   const allowed = await checkRateLimit(supabase, `cnpj:${ip}`, 10, 60);
 *   if (!allowed) return new Response("Too Many Requests", { status: 429 });
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * @param supabase  - Supabase client (service role)
 * @param key       - Unique identifier for this rate-limit bucket (e.g. "cnpj:1.2.3.4")
 * @param maxCalls  - Maximum calls allowed in the window
 * @param windowSec - Window duration in seconds (default: 60)
 * @returns true if the request is allowed, false if rate-limited
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  maxCalls: number,
  windowSec = 60,
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("rate_limit_check", {
      p_key: key,
      p_max_calls: maxCalls,
      p_window_seconds: windowSec,
    });
    if (error) {
      console.warn("rate_limit_check RPC error (failing open):", error.message);
      return true; // fail open — don't block legitimate traffic on DB error
    }
    return data === true;
  } catch (err) {
    console.warn("rate_limit_check exception (failing open):", err);
    return true;
  }
}

/** Extract client IP from request headers (Supabase adds CF-Connecting-IP) */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("CF-Connecting-IP") ??
    req.headers.get("X-Forwarded-For")?.split(",")[0].trim() ??
    "unknown"
  );
}

import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Notification Preferences                                          */
/* ------------------------------------------------------------------ */

export async function fetchNotificationPreferences(userId: string) {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

export async function upsertNotificationPreferences(
  userId: string,
  preferences: Array<{
    notification_type: string;
    channel_email: boolean;
    channel_in_app: boolean;
    is_enabled: boolean;
  }>
) {
  const upserts = preferences.map((pref) => ({
    user_id: userId,
    ...pref,
  }));

  const { error } = await supabase
    .from("notification_preferences")
    .upsert(upserts, { onConflict: "user_id,notification_type" });

  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/*  Notification Logs                                                 */
/* ------------------------------------------------------------------ */

export async function fetchNotificationLogs(typeFilter?: string) {
  let query = supabase
    .from("notification_logs")
    .select(`*, companies:company_id (name)`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (typeFilter && typeFilter !== "all") {
    query = query.eq("notification_type", typeFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchDetailedNotificationLogs() {
  const { data, error } = await supabase
    .from("notification_logs")
    .select("*, companies:company_id(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return data;
}

export async function fetchDeliveryLogs(notificationLogId: string) {
  const { data, error } = await supabase
    .from("notification_delivery_logs")
    .select("*")
    .eq("notification_log_id", notificationLogId)
    .order("attempt_number", { ascending: true });

  if (error) throw error;
  return data;
}

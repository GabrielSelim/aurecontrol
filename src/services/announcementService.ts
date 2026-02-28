import { supabase } from "@/integrations/supabase/client";

/* ------------------------------------------------------------------ */
/*  Announcements                                                     */
/* ------------------------------------------------------------------ */

export async function fetchActiveAnnouncements() {
  const { data, error } = await supabase
    .from("system_announcements")
    .select("id, title, message, priority, created_at, expires_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function fetchAnnouncementReads(userId: string) {
  const { data, error } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

export async function markAnnouncementAsRead(announcementId: string, userId: string) {
  const { error } = await supabase
    .from("announcement_reads")
    .upsert(
      { announcement_id: announcementId, user_id: userId },
      { onConflict: "announcement_id,user_id" }
    );

  if (error) throw error;
}

export async function markAllAnnouncementsAsRead(
  announcementIds: string[],
  userId: string
) {
  const upserts = announcementIds.map((id) => ({
    announcement_id: id,
    user_id: userId,
  }));

  const { error } = await supabase
    .from("announcement_reads")
    .upsert(upserts, { onConflict: "announcement_id,user_id" });

  if (error) throw error;
}

/**
 * Subscribe to realtime changes on system_announcements.
 * Returns an unsubscribe function.
 */
export function subscribeToAnnouncements(
  onUpdate: () => void
) {
  const channel = supabase
    .channel("announcements-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "system_announcements" },
      onUpdate
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

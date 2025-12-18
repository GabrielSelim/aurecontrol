import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  expires_at: string | null;
  is_read: boolean;
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchAnnouncements = useCallback(async () => {
    if (!user) {
      setAnnouncements([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch announcements (RLS will filter based on user's role and company)
      const { data: announcementsData, error: announcementsError } = await supabase
        .from("system_announcements")
        .select("id, title, message, priority, created_at, expires_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (announcementsError) throw announcementsError;

      // Fetch read status for current user
      const { data: readsData, error: readsError } = await supabase
        .from("announcement_reads")
        .select("announcement_id")
        .eq("user_id", user.id);

      if (readsError) throw readsError;

      const readIds = new Set(readsData?.map((r) => r.announcement_id) || []);

      const announcementsWithReadStatus = (announcementsData || []).map((a) => ({
        ...a,
        priority: a.priority as "low" | "normal" | "high" | "urgent",
        is_read: readIds.has(a.id),
      }));

      setAnnouncements(announcementsWithReadStatus);
      setUnreadCount(announcementsWithReadStatus.filter((a) => !a.is_read).length);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const markAsRead = useCallback(async (announcementId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("announcement_reads")
        .upsert({
          announcement_id: announcementId,
          user_id: user.id,
        }, {
          onConflict: "announcement_id,user_id",
        });

      if (error) throw error;

      setAnnouncements((prev) =>
        prev.map((a) =>
          a.id === announcementId ? { ...a, is_read: true } : a
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking announcement as read:", error);
    }
  }, [user]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    const unreadAnnouncements = announcements.filter((a) => !a.is_read);
    if (unreadAnnouncements.length === 0) return;

    try {
      const { error } = await supabase
        .from("announcement_reads")
        .upsert(
          unreadAnnouncements.map((a) => ({
            announcement_id: a.id,
            user_id: user.id,
          })),
          { onConflict: "announcement_id,user_id" }
        );

      if (error) throw error;

      setAnnouncements((prev) =>
        prev.map((a) => ({ ...a, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }, [user, announcements]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("announcements-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "system_announcements",
        },
        () => {
          fetchAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAnnouncements]);

  return {
    announcements,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchAnnouncements,
  };
}

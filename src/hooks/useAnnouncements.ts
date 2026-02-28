import { useEffect, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  subscribeToAnnouncements,
} from "@/services/announcementService";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import {
  useActiveAnnouncements,
  useAnnouncementReads,
  useMarkAnnouncementRead,
  useMarkAllAnnouncementsRead,
  queryKeys,
} from "@/hooks/queries";

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
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: announcementsData, isLoading: loadingAnnouncements } = useActiveAnnouncements();
  const { data: readsData, isLoading: loadingReads } = useAnnouncementReads(user?.id);
  const markReadMutation = useMarkAnnouncementRead();
  const markAllReadMutation = useMarkAllAnnouncementsRead();

  const isLoading = loadingAnnouncements || loadingReads;

  const announcements: Announcement[] = useMemo(() => {
    if (!announcementsData) return [];
    const readIds = new Set(readsData?.map((r) => r.announcement_id) || []);
    return announcementsData.map((a) => ({
      ...a,
      priority: a.priority as "low" | "normal" | "high" | "urgent",
      is_read: readIds.has(a.id),
    }));
  }, [announcementsData, readsData]);

  const unreadCount = useMemo(
    () => announcements.filter((a) => !a.is_read).length,
    [announcements]
  );

  const markAsRead = useCallback(
    async (announcementId: string) => {
      if (!user) return;
      try {
        await markReadMutation.mutateAsync({ announcementId, userId: user.id });
      } catch (error) {
        logger.error("Error marking announcement as read:", error);
      }
    },
    [user, markReadMutation]
  );

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const unread = announcements.filter((a) => !a.is_read);
    if (unread.length === 0) return;
    try {
      await markAllReadMutation.mutateAsync({
        announcementIds: unread.map((a) => a.id),
        userId: user.id,
      });
    } catch (error) {
      logger.error("Error marking all as read:", error);
    }
  }, [user, announcements, markAllReadMutation]);

  // Realtime subscription → invalidate cache instead of manual fetch
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToAnnouncements(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    });
    return unsubscribe;
  }, [user, queryClient]);

  return {
    announcements,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all }),
  };
}

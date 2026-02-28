import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchActiveAnnouncements,
  fetchAnnouncementReads,
  markAnnouncementAsRead,
  markAllAnnouncementsAsRead,
} from "@/services/announcementService";
import { queryKeys } from "./queryKeys";

/* ------------------------------------------------------------------ */
/*  Queries                                                           */
/* ------------------------------------------------------------------ */

export function useActiveAnnouncements() {
  return useQuery({
    queryKey: queryKeys.announcements.active(),
    queryFn: fetchActiveAnnouncements,
  });
}

export function useAnnouncementReads(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.announcements.reads(userId!),
    queryFn: () => fetchAnnouncementReads(userId!),
    enabled: !!userId,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations                                                         */
/* ------------------------------------------------------------------ */

export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementId, userId }: { announcementId: string; userId: string }) =>
      markAnnouncementAsRead(announcementId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}

export function useMarkAllAnnouncementsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementIds, userId }: { announcementIds: string[]; userId: string }) =>
      markAllAnnouncementsAsRead(announcementIds, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}

import { useState, useEffect } from "react";
import {
  Bell, Check, CheckCheck, AlertTriangle, AlertCircle, Info,
  FileText, CreditCard, PenLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type InAppNotification,
} from "@/services/notificationService";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logger } from "@/lib/logger";

const priorityConfig = {
  low: { icon: Info, color: "text-muted-foreground", bgColor: "bg-muted" },
  normal: { icon: Bell, color: "text-blue-500", bgColor: "bg-blue-50 dark:bg-blue-950" },
  high: { icon: AlertTriangle, color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-950" },
  urgent: { icon: AlertCircle, color: "text-destructive", bgColor: "bg-destructive/10" },
};

const eventIcons: Record<string, React.ElementType> = {
  contract_signed: FileText,
  signature_pending: PenLine,
  payment_pending: CreditCard,
  contract_expiring: AlertTriangle,
  default: Bell,
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { announcements, unreadCount: announcementUnread, isLoading: announcementsLoading, markAsRead, markAllAsRead } = useAnnouncements();

  const [userNotifs, setUserNotifs] = useState<InAppNotification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    if (user) loadUserNotifs();
  }, [user]);

  // Refresh when popover opens
  useEffect(() => {
    if (open && user) loadUserNotifs();
  }, [open]);

  const loadUserNotifs = async () => {
    if (!user) return;
    setNotifLoading(true);
    try {
      const data = await fetchUserNotifications(user.id, 20);
      setUserNotifs(data);
    } catch (err) {
      logger.error("NotificationBell load error:", err);
    } finally {
      setNotifLoading(false);
    }
  };

  const unreadNotifs = userNotifs.filter((n) => !n.read).length;
  const totalUnread = announcementUnread + unreadNotifs;

  const handleMarkNotifRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setUserNotifs((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      logger.error("markNotificationRead error:", err);
    }
  };

  const handleMarkAllRead = async () => {
    markAllAsRead();
    if (user && unreadNotifs > 0) {
      try {
        await markAllNotificationsRead(user.id);
        setUserNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch (err) {
        logger.error("markAllNotificationsRead error:", err);
      }
    }
  };

  const isLoading = announcementsLoading || notifLoading;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {totalUnread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {totalUnread > 9 ? "9+" : totalUnread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {totalUnread > 0 && (
            <Button variant="ghost" size="sm" className="h-auto py-1 px-2 text-xs" onClick={handleMarkAllRead}>
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[350px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : announcements.length === 0 && userNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* User-specific in-app notifications */}
              {userNotifs.map((notif) => {
                const Icon = eventIcons[notif.event_type ?? "default"] ?? Bell;
                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer",
                      !notif.read && "bg-primary/5"
                    )}
                    onClick={() => !notif.read && handleMarkNotifRead(notif.id, { stopPropagation: () => {} } as any)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm font-medium leading-tight", !notif.read && "font-semibold")}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={(e) => handleMarkNotifRead(notif.id, e)}
                              aria-label="Marcar como lida"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* System announcements */}
              {announcements.map((announcement) => {
                const config = priorityConfig[announcement.priority];
                const Icon = config.icon;
                return (
                  <div
                    key={announcement.id}
                    className={cn(
                      "px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer",
                      !announcement.is_read && "bg-primary/5"
                    )}
                    onClick={() => !announcement.is_read && markAsRead(announcement.id)}
                  >
                    <div className="flex gap-3">
                      <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center", config.bgColor)}>
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm font-medium leading-tight", !announcement.is_read && "font-semibold")}>
                            {announcement.title}
                          </p>
                          {!announcement.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={(e) => { e.stopPropagation(); markAsRead(announcement.id); }}
                              aria-label="Marcar como lida"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{announcement.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const priorityConfig = {
  low: {
    icon: Info,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    label: "Baixa",
  },
  normal: {
    icon: Bell,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    label: "Normal",
  },
  high: {
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    label: "Alta",
  },
  urgent: {
    icon: AlertCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    label: "Urgente",
  },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { announcements, unreadCount, isLoading, markAsRead, markAllAsRead } = useAnnouncements();

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsRead(id);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : announcements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {announcements.map((announcement) => {
                const config = priorityConfig[announcement.priority];
                const Icon = config.icon;

                return (
                  <div
                    key={announcement.id}
                    className={cn(
                      "px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer",
                      !announcement.is_read && "bg-primary/5"
                    )}
                    onClick={() => !announcement.is_read && markAsRead(announcement.id)}
                  >
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                          config.bgColor
                        )}
                      >
                        <Icon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm font-medium leading-tight",
                              !announcement.is_read && "font-semibold"
                            )}
                          >
                            {announcement.title}
                          </p>
                          {!announcement.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={(e) => handleMarkAsRead(announcement.id, e)}
                              aria-label="Marcar como lida"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {announcement.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(announcement.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

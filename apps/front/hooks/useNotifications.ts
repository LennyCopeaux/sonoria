"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { fetchApi } from "@/lib/api";

export interface NotificationItem {
  id: string;
  type: "new_follower" | "new_comment";
  fromUserId?: string;
  artistId?: string;
  trackId?: string;
  commentId?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  unreadCount: number;
}

export function useNotifications() {
  const { isLoggedIn, isReady } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!isReady || !isLoggedIn) return;

    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        const data = await fetchApi<NotificationsResponse>(
          "/social/notifications/unread",
        );
        if (!cancelled) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      } catch {
        if (!cancelled) {
          setNotifications([]);
          setUnreadCount(0);
        }
      }
    };

    void fetchNotifications();
    const interval = window.setInterval(() => {
      void fetchNotifications();
    }, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isReady, isLoggedIn]);

  return { unreadCount, notifications };
}

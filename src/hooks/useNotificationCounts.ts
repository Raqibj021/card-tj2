import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { notificationChangedEvent, notificationSection, type NotificationSection } from "../lib/notificationCenter";
import { supabase } from "../lib/supabase";

export type NotificationCounts = Record<NotificationSection, number>;
const emptyCounts: NotificationCounts = { all: 0, organization: 0, payments: 0, cards: 0, services: 0, support: 0, account: 0 };

export function useNotificationCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<NotificationCounts>(emptyCounts);

  const refresh = useCallback(async () => {
    if (!supabase || !user) { setCounts(emptyCounts); return; }
    const { data, error } = await supabase.from("notifications").select("kind").is("read_at", null);
    if (error) return;
    const next = { ...emptyCounts };
    for (const item of data ?? []) {
      const section = notificationSection(String(item.kind ?? ""));
      next.all += 1;
      next[section] += 1;
    }
    setCounts(next);
  }, [user]);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(notificationChangedEvent, onChange);
    window.addEventListener("focus", onChange);
    const timer = window.setInterval(onChange, 45_000);
    const channel = supabase && user
      ? supabase.channel(`notification-counts-${user.id}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, onChange)
          .subscribe()
      : null;
    return () => {
      window.removeEventListener(notificationChangedEvent, onChange);
      window.removeEventListener("focus", onChange);
      window.clearInterval(timer);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [refresh, user]);

  return { counts, refresh };
}


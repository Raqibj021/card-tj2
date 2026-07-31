import { adminSupabase } from "./supabase";

export type AdminNavCounts = {
  total: number; accounts: number; cards: number; moderation: number; payments: number; support: number;
};

export const adminCountsChangedEvent = "vizora:admin-counts-changed";
export const signalAdminCountsChanged = () => window.dispatchEvent(new Event(adminCountsChangedEvent));
export const emptyAdminNavCounts: AdminNavCounts = { total: 0, accounts: 0, cards: 0, moderation: 0, payments: 0, support: 0 };

export const adminNotificationRepository = {
  async counts(): Promise<AdminNavCounts> {
    if (!adminSupabase) return emptyAdminNavCounts;
    const { data, error } = await adminSupabase.rpc("get_admin_nav_counts");
    if (error) return emptyAdminNavCounts;
    return { ...emptyAdminNavCounts, ...((data ?? {}) as AdminNavCounts) };
  }
};

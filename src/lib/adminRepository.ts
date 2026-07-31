import { adminSupabase as supabase } from "./supabase";

export interface AdminSnapshot {
  status: "prelaunch" | "live";
  officialLaunchAt: string | null;
  promotionLimit: number;
  promotionClaimed: number;
  users: number;
  cards: number;
  publicCards: number;
  organizations: number;
  employees: number;
  pendingReviews: number;
  pendingPayments: number;
  leads: number;
  openTickets: number;
  serviceOrders: number;
  contracts: number;
  queuedEmails: number;
  views: number;
  revenue: number;
  recentCards: Array<{ id: string; name: string; slug: string; status: string; createdAt: string }>;
  recentOrganizations: Array<{ id: string; name: string; status: string; employees: number; createdAt: string }>;
  recentPayments: Array<{ id: string; number: string; customer: string; amount: number; status: string; createdAt: string }>;
  recentTickets: Array<{ id: string; number: string; subject: string; status: string; createdAt: string }>;
}

export interface LaunchPreview {
  users: number;
  cards: number;
  organizations: number;
  leads: number;
  orders: number;
  tickets: number;
}

export interface AdminAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: "active" | "blocked";
  statusReason: string;
  identityVerified: boolean;
  cards: number;
  organizations: number;
  duplicateSignals: number;
  createdAt: string;
}

export interface AdminOrganization {
  id: string;
  name: string;
  legalName: string;
  slug: string;
  status: string;
  ownerName: string;
  ownerEmail: string;
  employees: number;
  departments: number;
  cards: number;
  activeUntil: string | null;
  createdAt: string;
}

export interface AdminOrganizationDetail extends AdminOrganization {
  organizationType?: string;
  phone?: string;
  email?: string;
  planCode?: string;
  employeeLimit?: number;
  structure: Array<{ id: string; name: string; parentId: string | null; employees: number }>;
  members: Array<{
    id: string;
    name: string;
    email: string;
    position: string;
    department: string;
    cardSlug: string;
    cardStatus: string;
    isPublic: boolean;
  }>;
}

const emptySnapshot: AdminSnapshot = {
  status: "prelaunch",
  officialLaunchAt: null,
  promotionLimit: 50,
  promotionClaimed: 0,
  users: 0,
  cards: 0,
  publicCards: 0,
  organizations: 0,
  employees: 0,
  pendingReviews: 0,
  pendingPayments: 0,
  leads: 0,
  openTickets: 0,
  serviceOrders: 0,
  contracts: 0,
  queuedEmails: 0,
  views: 0,
  revenue: 0,
  recentCards: [],
  recentOrganizations: [],
  recentPayments: [],
  recentTickets: []
};

const normalize = (value: Record<string, unknown>): AdminSnapshot => ({
  ...emptySnapshot,
  status: value.status === "live" ? "live" : "prelaunch",
  officialLaunchAt: value.officialLaunchAt ? String(value.officialLaunchAt) : null,
  promotionLimit: Number(value.promotionLimit ?? 50),
  promotionClaimed: Number(value.promotionClaimed ?? 0),
  users: Number(value.users ?? 0),
  cards: Number(value.cards ?? 0),
  publicCards: Number(value.publicCards ?? 0),
  organizations: Number(value.organizations ?? 0),
  employees: Number(value.employees ?? 0),
  pendingReviews: Number(value.pendingReviews ?? 0),
  pendingPayments: Number(value.pendingPayments ?? 0),
  leads: Number(value.leads ?? 0),
  openTickets: Number(value.openTickets ?? 0),
  serviceOrders: Number(value.serviceOrders ?? 0),
  contracts: Number(value.contracts ?? 0),
  queuedEmails: Number(value.queuedEmails ?? 0),
  views: Number(value.views ?? 0),
  revenue: Number(value.revenue ?? 0),
  recentCards: (value.recentCards ?? []) as AdminSnapshot["recentCards"],
  recentOrganizations: (value.recentOrganizations ?? []) as AdminSnapshot["recentOrganizations"],
  recentPayments: (value.recentPayments ?? []) as AdminSnapshot["recentPayments"],
  recentTickets: (value.recentTickets ?? []) as AdminSnapshot["recentTickets"]
});

export const adminRepository = {
  async snapshot() {
    if (!supabase) return emptySnapshot;
    const { data, error } = await supabase.rpc("get_admin_console_snapshot");
    if (error) throw error;
    return normalize((data ?? {}) as Record<string, unknown>);
  },

  async launchPreview() {
    if (!supabase) return { users: 0, cards: 0, organizations: 0, leads: 0, orders: 0, tickets: 0 };
    const { data, error } = await supabase.rpc("get_prelaunch_cleanup_preview");
    if (error) throw error;
    const value = (data ?? {}) as Record<string, unknown>;
    return {
      users: Number(value.users ?? 0),
      cards: Number(value.cards ?? 0),
      organizations: Number(value.organizations ?? 0),
      leads: Number(value.leads ?? 0),
      orders: Number(value.orders ?? 0),
      tickets: Number(value.tickets ?? 0)
    };
  },

  async clearPrelaunchData(confirmation: string) {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { data, error } = await supabase.rpc("reset_prelaunch_data", { confirmation });
    if (error) throw error;
    return data as LaunchPreview;
  },

  async startOfficialLaunch(confirmation: string) {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { data, error } = await supabase.rpc("begin_official_launch", { confirmation });
    if (error) throw error;
    return String(data);
  },

  async accounts(search = "") {
    if (!supabase) return { accounts: [] as AdminAccount[], organizations: [] as AdminOrganization[] };
    const { data, error } = await supabase.rpc("get_admin_accounts_workspace", { search_text: search });
    if (error) throw error;
    const value = (data ?? {}) as { accounts?: AdminAccount[]; organizations?: AdminOrganization[] };
    return { accounts: value.accounts ?? [], organizations: value.organizations ?? [] };
  },

  async organizationDetail(organizationId: string) {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { data, error } = await supabase.rpc("get_admin_organization_detail", {
      target_organization_id: organizationId
    });
    if (error) throw error;
    return data as AdminOrganizationDetail;
  },

  async reviewOrganization(
    organizationId: string,
    decision: "approved" | "rejected" | "changes_requested",
    note: string
  ) {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { data, error } = await supabase.rpc("admin_review_organization", {
      target_organization_id: organizationId,
      decision,
      note: note.trim()
    });
    if (error) throw error;
    window.dispatchEvent(new Event("vizora:admin-counts-changed"));
    return data as { organizationId: string; status: string; ownerId: string };
  },

  async setAccountStatus(profileId: string, status: "active" | "blocked", reason: string) {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { error } = await supabase.rpc("admin_set_account_status", {
      target_profile_id: profileId,
      target_status: status,
      reason: reason.trim()
    });
    if (error) throw error;
  }
};

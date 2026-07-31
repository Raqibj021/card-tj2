import { adminSupabase as supabase } from "./supabase";
import { signalAdminCountsChanged } from "./adminNotificationRepository";

export type AdminCardSummary = {
  id: string; ownerId: string; ownerName: string; ownerEmail: string; slug: string;
  fullName: string; position: string; organization: string; visibility: string;
  reviewStatus: string; language: string; views: number; photo: string;
  contactsCount: number; createdAt: string; updatedAt: string;
};

export type AdminCardDetails = AdminCardSummary & {
  ownerPhone: string; description: string; companyLogo: string;
  contacts: Record<string, string>; address: string; theme: string; template: string;
  verifiedAt: string | null;
};

export type AdminCardWorkspace = {
  stats: { total: number; public: number; private: number; pending: number; approved: number; views: number };
  cards: AdminCardSummary[];
  accessHistory: Array<{
    id: number; cardId: string; cardName: string; cardSlug: string; adminName: string;
    adminEmail: string; reason: string; visibility: string; accessedAt: string;
  }>;
};

const empty: AdminCardWorkspace = {
  stats: { total: 0, public: 0, private: 0, pending: 0, approved: 0, views: 0 },
  cards: [],
  accessHistory: []
};

const countContacts = (contacts: unknown) =>
  Object.values((contacts && typeof contacts === "object" ? contacts : {}) as Record<string, unknown>)
    .filter((value) => typeof value === "string" && value.trim()).length;

async function loadWorkspaceDirectly(): Promise<AdminCardWorkspace> {
  if (!supabase) return empty;
  const { data: rows, error } = await supabase
    .from("cards")
    .select("id,owner_id,slug,full_name,position,organization_name,visibility,review_status,language,views,photo_path,contacts,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) throw error;

  const ownerIds = [...new Set((rows ?? []).map((row) => String(row.owner_id)))];
  const ownerMap = new Map<string, { full_name?: string; email?: string }>();
  if (ownerIds.length) {
    const { data: owners, error: ownersError } = await supabase
      .from("profiles")
      .select("id,full_name,email")
      .in("id", ownerIds);
    if (ownersError) throw ownersError;
    (owners ?? []).forEach((owner) => ownerMap.set(String(owner.id), owner));
  }

  const cards: AdminCardSummary[] = (rows ?? []).map((row) => {
    const owner = ownerMap.get(String(row.owner_id));
    return {
      id: String(row.id),
      ownerId: String(row.owner_id),
      ownerName: String(owner?.full_name ?? ""),
      ownerEmail: String(owner?.email ?? ""),
      slug: String(row.slug ?? ""),
      fullName: String(row.full_name ?? ""),
      position: String(row.position ?? ""),
      organization: String(row.organization_name ?? ""),
      visibility: String(row.visibility ?? "private"),
      reviewStatus: String(row.review_status ?? "draft"),
      language: String(row.language ?? "ru"),
      views: Number(row.views ?? 0),
      photo: String(row.photo_path ?? ""),
      contactsCount: countContacts(row.contacts),
      createdAt: String(row.created_at ?? ""),
      updatedAt: String(row.updated_at ?? "")
    };
  });

  return {
    stats: {
      total: cards.length,
      public: cards.filter((card) => ["public", "public_organization"].includes(card.visibility)).length,
      private: cards.filter((card) => !["public", "public_organization"].includes(card.visibility)).length,
      pending: cards.filter((card) => card.reviewStatus === "pending").length,
      approved: cards.filter((card) => card.reviewStatus === "approved").length,
      views: cards.reduce((sum, card) => sum + card.views, 0)
    },
    cards,
    accessHistory: []
  };
}

export const adminCardsRepository = {
  async workspace(): Promise<AdminCardWorkspace> {
    if (!supabase) return empty;
    const { data, error } = await supabase.rpc("get_admin_cards_workspace");
    if (error) return loadWorkspaceDirectly();
    return { ...empty, ...(data as AdminCardWorkspace) };
  },
  async deleteForever(cardId: string): Promise<void> {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { error } = await supabase.rpc("admin_delete_card_permanently", {
      target_card_id: cardId
    });
    if (error) throw error;
    signalAdminCountsChanged();
  },
  async review(cardId: string, decision: "approved" | "changes_requested" | "rejected", note = ""): Promise<void> {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { error } = await supabase.rpc("admin_review_card", {
      target_card_id: cardId,
      decision,
      note
    });
    if (error) throw error;
    signalAdminCountsChanged();
  },
  async details(cardId: string, reason = "administrative_review"): Promise<AdminCardDetails> {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { data, error } = await supabase.rpc("admin_open_card_details", {
      target_card_id: cardId,
      access_reason: reason
    });
    if (error) throw error;
    return data as AdminCardDetails;
  }
};

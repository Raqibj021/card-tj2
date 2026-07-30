import { adminSupabase as supabase } from "./supabase";

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

export const adminCardsRepository = {
  async workspace(): Promise<AdminCardWorkspace> {
    if (!supabase) return empty;
    const { data, error } = await supabase.rpc("get_admin_cards_workspace");
    if (error) throw error;
    return { ...empty, ...(data as AdminCardWorkspace) };
  },
  async deleteForever(cardId: string): Promise<void> {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { error } = await supabase.rpc("admin_delete_card_permanently", {
      target_card_id: cardId
    });
    if (error) throw error;
  },
  async review(cardId: string, decision: "approved" | "changes_requested" | "rejected", note = ""): Promise<void> {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { error } = await supabase.rpc("admin_review_card", {
      target_card_id: cardId,
      decision,
      note
    });
    if (error) throw error;
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

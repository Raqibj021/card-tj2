import { supabase } from "./supabase";

export type ModerationDecision = "approved" | "changes_requested" | "rejected" | "suspended";

export interface ModerationCard {
  id: string; ownerId: string; name: string; position: string; organization: string;
  slug: string; status: string; description: string; phone: string; email: string;
  updatedAt: string; riskSignals: string[];
}
export interface ModerationVerification {
  id: string; profileId: string; cardId: string | null; name: string; email: string;
  cardName: string; profession: string; requiresLicense: boolean; documentPaths: string[];
  status: string; note: string; createdAt: string;
}
export interface ModerationReport {
  id: string; cardId: string; cardName: string; cardSlug: string; ownerId: string;
  reporter: string; reason: string; details: string; status: string; createdAt: string;
}
export interface ModerationAudit {
  id: number; action: string; details: Record<string, unknown>; createdAt: string;
}
export interface ModerationWorkspace {
  stats: { cards: number; documents: number; reports: number; riskSignals: number };
  cards: ModerationCard[];
  verifications: ModerationVerification[];
  reports: ModerationReport[];
  audit: ModerationAudit[];
}

const empty: ModerationWorkspace = {
  stats: { cards: 0, documents: 0, reports: 0, riskSignals: 0 },
  cards: [], verifications: [], reports: [], audit: []
};

export const moderationRepository = {
  async workspace(): Promise<ModerationWorkspace> {
    if (!supabase) return empty;
    const { data, error } = await supabase.rpc("get_admin_moderation_workspace");
    if (error) throw error;
    return { ...empty, ...((data ?? {}) as ModerationWorkspace) };
  },
  async reviewCard(id: string, decision: ModerationDecision, note: string) {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { error } = await supabase.rpc("admin_review_card", {
      target_card_id: id, decision, note
    });
    if (error) throw error;
  },
  async reviewVerification(id: string, decision: Exclude<ModerationDecision, "suspended">, note: string) {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { error } = await supabase.rpc("admin_review_verification", {
      target_request_id: id, decision, note
    });
    if (error) throw error;
  },
  async resolveReport(id: string, action: "dismiss" | "hide_card" | "restore_card", note: string) {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { error } = await supabase.rpc("admin_resolve_report", {
      target_report_id: id, action, note
    });
    if (error) throw error;
  },
  async documentUrl(path: string) {
    if (!supabase) throw new Error("Supabase не подключён.");
    const { data, error } = await supabase.storage.from("verification-documents").createSignedUrl(path, 300);
    if (error) throw error;
    return data.signedUrl;
  }
};

import { supabase } from "./supabase";

export type InviteForm = {
  fullName: string;
  profession: string;
  city: string;
  about: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  instagram: string;
  language: "ru" | "tj" | "en";
  source: string;
  design: string;
};

export type CardInvite = {
  id: string;
  created_at: string;
  full_name: string;
  profession: string;
  city: string;
  about: string;
  phone: string;
  whatsapp: string;
  telegram: string;
  instagram: string;
  language: "ru" | "tj" | "en";
  source: string;
  design: string;
  status: "new" | "approved" | "rejected" | "claimed";
  card_id: string | null;
  claim_token: string;
  claimed_at: string | null;
  cards?: { slug: string } | null;
};

export type InvitePreview = { full_name: string; profession: string; slug: string | null; status: string; language: string; design: string };

const client = () => {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
};

const errorCode = (message: string) => {
  for (const code of ["bad_phone", "bad_whatsapp", "bad_name", "consent_required", "too_many_requests", "already_claimed", "not_found", "not_ready", "auth_required", "already_processed"]) {
    if (message.includes(code)) return code;
  }
  return "unknown";
};

export const inviteRepository = {
  async submit(form: InviteForm) {
    const { data, error } = await client().rpc("submit_card_invite", {
      p_full_name: form.fullName,
      p_profession: form.profession,
      p_city: form.city,
      p_about: form.about,
      p_phone: form.phone,
      p_whatsapp: form.whatsapp,
      p_telegram: form.telegram,
      p_instagram: form.instagram,
      p_language: form.language,
      p_source: form.source,
      p_consent: true,
      p_design: form.design
    });
    if (error) throw new Error(errorCode(error.message));
    return data as string;
  },

  async list() {
    const { data, error } = await client()
      .from("card_invites")
      .select("*, cards(slug)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return (data ?? []) as CardInvite[];
  },

  async approve(id: string, slug: string) {
    const { data, error } = await client().rpc("admin_approve_card_invite", { p_invite_id: id, p_slug: slug });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    return row as { card_id: string; slug: string; claim_token: string };
  },

  async reject(id: string) {
    const { error } = await client().from("card_invites").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  },

  async preview(token: string) {
    const { data, error } = await client().rpc("get_card_invite", { p_token: token });
    if (error) throw new Error(errorCode(error.message));
    const row = Array.isArray(data) ? data[0] : data;
    return (row ?? null) as InvitePreview | null;
  },

  async claim(token: string) {
    const { data, error } = await client().rpc("claim_card_invite", { p_token: token });
    if (error) throw new Error(errorCode(error.message));
    return data as string;
  }
};

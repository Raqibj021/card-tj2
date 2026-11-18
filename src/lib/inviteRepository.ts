import { adminSupabase, supabase } from "./supabase";

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
  photo: string;
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
  photo_data: string;
  needs_payment?: boolean;
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
// Admin screens run on the separate admin session.
const adminClient = () => {
  if (!adminSupabase) throw new Error("Supabase is not configured");
  return adminSupabase;
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
      p_design: form.design,
      p_photo: form.photo
    });
    if (error) throw new Error(errorCode(error.message));
    return data as string;
  },

  async list() {
    const { data, error } = await adminClient()
      .from("card_invites")
      .select("*, cards(slug)")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return (data ?? []) as CardInvite[];
  },

  async categories() {
    const { data } = await adminClient().rpc("get_enabled_profession_categories", { language_code: "ru" });
    return (data ?? []) as { id: string; name: string; slug: string }[];
  },

  async approve(id: string, slug: string, photoData = "", category: string | null = null) {
    const db = adminClient();
    const { data, error } = await db.rpc("admin_approve_card_invite", { p_invite_id: id, p_slug: slug, p_category: category });
    if (error) throw new Error(error.message);
    const row = (Array.isArray(data) ? data[0] : data) as { card_id: string; slug: string; claim_token: string };
    if (photoData.startsWith("data:image/")) {
      // Upload the applicant's photo to storage and attach it to the new card.
      const { data: auth } = await db.auth.getUser();
      const blob = await (await fetch(photoData)).blob();
      const path = `${auth.user?.id}/${row.card_id}/photo-${Date.now()}.jpg`;
      const upload = await db.storage.from("card-assets").upload(path, blob, { upsert: false, contentType: blob.type || "image/jpeg", cacheControl: "31536000" });
      if (!upload.error) {
        const url = db.storage.from("card-assets").getPublicUrl(path).data.publicUrl;
        await db.from("cards").update({ photo_path: url }).eq("id", row.card_id);
      }
    }
    return row;
  },

  async promo() {
    const { data, error } = await adminClient().rpc("admin_card_invites_promo");
    if (error) throw error;
    return data as { limit: number; used: number; places: Record<string, number> };
  },

  async reject(id: string) {
    const { error } = await adminClient().from("card_invites").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", id);
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

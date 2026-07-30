import { demoCards } from "../data/demo";
import type { CardDraft, DigitalCard } from "../types/card";
import { supabase } from "./supabase";

const STORAGE_KEY = "vizora.cards.v1";
const isDemoCard = (card: DigitalCard) => card.id.startsWith("demo-");

export interface CardRepository {
  list(): DigitalCard[];
  getById(id: string): DigitalCard | undefined;
  getBySlug(slug: string): DigitalCard | undefined;
  save(draft: CardDraft, id?: string): DigitalCard;
  remove(id: string): void;
  incrementViews(id: string): void;
  getPublicBySlug(slug: string): Promise<DigitalCard | undefined>;
  listRemote(): Promise<DigitalCard[]>;
  requestPublication(id: string): Promise<{ ok: boolean; message: string }>;
}

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `card-${Date.now()}-${Math.random().toString(36).slice(2)}`;

class LocalStorageCardRepository implements CardRepository {
  private fromDatabase(row: Record<string, unknown>): DigitalCard {
    const contacts = (row.contacts ?? {}) as Partial<DigitalCard>;
    return {
      id: String(row.id),
      slug: String(row.slug),
      photo: String(row.photo_path ?? ""),
      companyLogo: String(contacts.companyLogo ?? ""),
      fullName: String(row.full_name ?? ""),
      position: String(row.position ?? ""),
      organization: String(row.organization_name ?? ""),
      description: String(row.description ?? ""),
      phone: contacts.phone ?? "",
      secondPhone: contacts.secondPhone ?? "",
      whatsapp: contacts.whatsapp ?? "",
      telegram: contacts.telegram ?? "",
      instagram: contacts.instagram ?? "",
      facebook: contacts.facebook ?? "",
      email: contacts.email ?? "",
      website: contacts.website ?? "",
      address: String(row.address ?? ""),
      language: (row.language as DigitalCard["language"]) ?? "ru",
      theme: (row.theme as DigitalCard["theme"]) ?? "blue",
      template: (row.template as DigitalCard["template"]) ?? "executive",
      visibility: (row.visibility as DigitalCard["visibility"]) ?? "private",
      reviewStatus: (row.review_status as DigitalCard["reviewStatus"]) ?? "draft",
      trialExpiresAt: row.trial_expires_at ? String(row.trial_expires_at) : null,
      views: Number(row.views ?? 0),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString())
    };
  }

  private async uploadAsset(
    userId: string,
    cardId: string,
    kind: "photo" | "logo",
    value: string
  ) {
    if (!supabase || !value.startsWith("data:")) return value;
    const response = await fetch(value);
    const blob = await response.blob();
    const extension = blob.type.includes("png") ? "png" : blob.type.includes("jpeg") ? "jpg" : "webp";
    const path = `${userId}/${cardId}/${kind}.${extension}`;
    const { error } = await supabase.storage
      .from("card-assets")
      .upload(path, blob, { upsert: true, contentType: blob.type, cacheControl: "3600" });
    if (error) return value;
    return supabase.storage.from("card-assets").getPublicUrl(path).data.publicUrl;
  }

  private async saveRemote(card: DigitalCard) {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data: existing } = await supabase
      .from("cards")
      .select("id, visibility, review_status, trial_expires_at")
      .eq("owner_id", auth.user.id)
      .maybeSingle();

    const remoteId = String(existing?.id ?? card.id);
    const photo = await this.uploadAsset(auth.user.id, remoteId, "photo", card.photo);
    const companyLogo = await this.uploadAsset(auth.user.id, remoteId, "logo", card.companyLogo);
    const trialExpiresAt =
      existing?.trial_expires_at ??
      card.trialExpiresAt ??
      new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: saved } = await supabase.from("cards").upsert(
      {
        id: remoteId,
        owner_id: auth.user.id,
        slug: card.slug,
        full_name: card.fullName,
        position: card.position,
        organization_name: card.organization,
        description: card.description,
        photo_path: photo.startsWith("http") ? photo : null,
        contacts: {
          phone: card.phone,
          secondPhone: card.secondPhone,
          whatsapp: card.whatsapp,
          telegram: card.telegram,
          instagram: card.instagram,
          facebook: card.facebook,
          email: card.email,
          website: card.website,
          companyLogo: companyLogo.startsWith("http") ? companyLogo : ""
        },
        address: card.address,
        language: card.language,
        theme: card.theme,
        template: card.template,
        visibility:
          existing?.review_status === "approved"
            ? "private"
            : existing?.visibility ?? card.visibility ?? "private",
        review_status:
          existing?.review_status === "approved"
            ? "pending"
            : existing?.review_status ?? card.reviewStatus ?? "draft",
        trial_expires_at: trialExpiresAt,
        updated_at: new Date().toISOString()
      },
      { onConflict: "owner_id" }
    ).select("*").single();

    if (saved) {
      const remoteCard = this.fromDatabase(saved);
      const localCards = this.read().filter((item) => item.id !== card.id && item.id !== remoteCard.id);
      this.write([remoteCard, ...localCards]);
    }
  }

  private read(): DigitalCard[] {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      this.write(demoCards);
      return demoCards;
    }

    try {
      return JSON.parse(stored) as DigitalCard[];
    } catch {
      this.write(demoCards);
      return demoCards;
    }
  }

  private write(cards: DigitalCard[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }

  list() {
    return this.read().sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getById(id: string) {
    return this.read().find((card) => card.id === id);
  }

  getBySlug(slug: string) {
    return this.read().find(
      (card) => card.slug.toLowerCase() === slug.toLowerCase()
    );
  }

  save(draft: CardDraft, id?: string) {
    const cards = this.read();
    const existing = id ? cards.find((card) => card.id === id) : undefined;
    const timestamp = new Date().toISOString();
    const card: DigitalCard = {
      ...draft,
      id: existing?.id ?? createId(),
      views: existing?.views ?? 0,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      visibility: existing?.reviewStatus === "approved" ? "private" : existing?.visibility ?? "private",
      reviewStatus: existing?.reviewStatus === "approved" ? "pending" : existing?.reviewStatus ?? "draft",
      trialExpiresAt:
        existing?.trialExpiresAt ??
        new Date(Date.now() + 15 * 60 * 1000).toISOString()
    };

    const nextCards = existing
      ? cards.map((item) => (item.id === existing.id ? card : item))
      : [card, ...cards];
    this.write(nextCards);
    void this.saveRemote(card);
    return card;
  }

  remove(id: string) {
    this.write(this.read().filter((card) => card.id !== id));
    if (supabase) void supabase.from("cards").delete().eq("id", id);
  }

  incrementViews(id: string) {
    const cards = this.read();
    this.write(
      cards.map((card) =>
        card.id === id
          ? {
              ...card,
              views: card.views + 1
            }
          : card
      )
    );
    if (supabase) void supabase.rpc("increment_card_views", { target_card_id: id });
  }

  async getPublicBySlug(slug: string) {
    const local = this.getBySlug(slug);
    if (local && (!local.trialExpiresAt || new Date(local.trialExpiresAt).getTime() > Date.now())) {
      return local;
    }
    if (!supabase) return undefined;
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("slug", slug.toLowerCase())
      .maybeSingle();
    if (error || !data) return undefined;
    return this.fromDatabase(data);
  }

  async listRemote() {
    const localUserCards = this.list().filter((card) => !isDemoCard(card));
    if (!supabase) return localUserCards;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return localUserCards;
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", auth.user.id)
      .order("updated_at", { ascending: false });
    if (error || !data?.length) return localUserCards;
    return data.map((row) => this.fromDatabase(row));
  }

  async requestPublication(id: string) {
    if (!supabase) return { ok: false, message: "Сервер временно недоступен." };
    const card = this.getById(id);
    if (!card) return { ok: false, message: "Визитка не найдена." };
    await this.saveRemote(card);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { ok: false, message: "Сначала войдите в аккаунт." };
    const { data: remote } = await supabase
      .from("cards")
      .select("id")
      .eq("owner_id", auth.user.id)
      .maybeSingle();
    if (!remote) return { ok: false, message: "Не удалось синхронизировать визитку." };
    const { error } = await supabase.rpc("request_card_review", { target_card_id: remote.id });
    if (error) return { ok: false, message: error.message };
    this.write(this.read().map((item) =>
      item.id === card.id || item.id === remote.id
        ? { ...item, reviewStatus: "pending" }
        : item
    ));
    return { ok: true, message: "Визитка отправлена на проверку." };
  }
}

// Later this implementation can be replaced with SupabaseCardRepository
// without changing page components.
export const cardRepository: CardRepository =
  new LocalStorageCardRepository();

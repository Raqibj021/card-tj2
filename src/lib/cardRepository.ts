import { demoCards } from "../data/demo";
import type { CardDraft, DigitalCard } from "../types/card";
import { supabase } from "./supabase";

const STORAGE_KEY = "vizora.cards.v1";

export interface CardRepository {
  list(): DigitalCard[];
  getById(id: string): DigitalCard | undefined;
  getBySlug(slug: string): DigitalCard | undefined;
  save(draft: CardDraft, id?: string): DigitalCard;
  remove(id: string): void;
  incrementViews(id: string): void;
  getPublicBySlug(slug: string): Promise<DigitalCard | undefined>;
  listRemote(): Promise<DigitalCard[]>;
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
      views: Number(row.views ?? 0),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      updatedAt: String(row.updated_at ?? new Date().toISOString())
    };
  }

  private async saveRemote(card: DigitalCard) {
    if (!supabase) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data: existing } = await supabase
      .from("cards")
      .select("id")
      .eq("owner_id", auth.user.id)
      .maybeSingle();

    await supabase.from("cards").upsert(
      {
        id: existing?.id ?? card.id,
        owner_id: auth.user.id,
        slug: card.slug,
        full_name: card.fullName,
        position: card.position,
        organization_name: card.organization,
        description: card.description,
        photo_path: card.photo.startsWith("http") ? card.photo : null,
        contacts: {
          phone: card.phone,
          secondPhone: card.secondPhone,
          whatsapp: card.whatsapp,
          telegram: card.telegram,
          instagram: card.instagram,
          facebook: card.facebook,
          email: card.email,
          website: card.website
        },
        address: card.address,
        language: card.language,
        theme: card.theme,
        template: card.template,
        visibility: "private",
        review_status: "draft",
        updated_at: new Date().toISOString()
      },
      { onConflict: "owner_id" }
    );
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
      updatedAt: timestamp
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
    if (local) return local;
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
    if (!supabase) return this.list();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return this.list();
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", auth.user.id)
      .order("updated_at", { ascending: false });
    if (error || !data?.length) return this.list();
    return data.map((row) => this.fromDatabase(row));
  }
}

// Later this implementation can be replaced with SupabaseCardRepository
// without changing page components.
export const cardRepository: CardRepository =
  new LocalStorageCardRepository();

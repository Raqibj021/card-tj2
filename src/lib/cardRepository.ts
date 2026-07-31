import { demoCards } from "../data/demo";
import type { CardDraft, DigitalCard } from "../types/card";
import { createUuid } from "./id";
import { supabase } from "./supabase";

const STORAGE_KEY = "vizora.cards.v1";
const REMOVED_CARDS_KEY = "vizora.removed-cards.v1";
const isDemoCard = (card: DigitalCard) => card.id.startsWith("demo-");
export interface CardRepository {
  list(): DigitalCard[];
  getById(id: string): DigitalCard | undefined;
  getBySlug(slug: string): DigitalCard | undefined;
  save(draft: CardDraft, id?: string): DigitalCard;
  remove(id: string): Promise<{ ok: boolean; message: string }>;
  incrementViews(id: string): void;
  getPublicBySlug(slug: string): Promise<DigitalCard | undefined>;
  listRemote(): Promise<DigitalCard[]>;
  requestPublication(id: string): Promise<{ ok: boolean; message: string }>;
}

const createId = createUuid;

class LocalStorageCardRepository implements CardRepository {
  private pendingRemoteSaves = new Set<Promise<void>>();

  private removedIds() {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(REMOVED_CARDS_KEY) ?? "[]");
      return new Set<string>(Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []);
    } catch {
      return new Set<string>();
    }
  }

  private markRemoved(id: string) {
    const removed = this.removedIds();
    removed.add(id);
    localStorage.setItem(REMOVED_CARDS_KEY, JSON.stringify([...removed]));
  }

  private unmarkRemoved(id: string) {
    const removed = this.removedIds();
    removed.delete(id);
    localStorage.setItem(REMOVED_CARDS_KEY, JSON.stringify([...removed]));
  }

  private trackRemoteSave(card: DigitalCard) {
    const operation = this.saveRemote(card);
    this.pendingRemoteSaves.add(operation);
    void operation.finally(() => this.pendingRemoteSaves.delete(operation));
  }

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
    if (this.removedIds().has(card.id)) return;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data: existing } = await supabase
      .from("cards")
      .select("id, visibility, review_status")
      .eq("owner_id", auth.user.id)
      .maybeSingle();

    const remoteId = String(existing?.id ?? card.id);
    const photo = await this.uploadAsset(auth.user.id, remoteId, "photo", card.photo);
    const companyLogo = await this.uploadAsset(auth.user.id, remoteId, "logo", card.companyLogo);
    if (this.removedIds().has(card.id) || this.removedIds().has(remoteId)) return;
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
        trial_expires_at: null,
        updated_at: new Date().toISOString()
      },
      { onConflict: "owner_id" }
    ).select("*").single();

    if (saved) {
      const remoteCard = this.fromDatabase(saved);
      if (this.removedIds().has(card.id) || this.removedIds().has(remoteCard.id)) {
        await supabase.from("cards").delete().eq("owner_id", auth.user.id);
        return;
      }
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
      const value: unknown = JSON.parse(stored);
      if (!Array.isArray(value)) return [];
      return value.filter(
        (card): card is DigitalCard =>
          Boolean(card) &&
          typeof card === "object" &&
          typeof (card as Partial<DigitalCard>).id === "string"
      );
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
    const existing =
      (id ? cards.find((card) => card.id === id) : undefined) ??
      cards.find((card) => !isDemoCard(card));
    const timestamp = new Date().toISOString();
    const card: DigitalCard = {
      ...draft,
      id: existing?.id ?? createId(),
      views: existing?.views ?? 0,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      visibility: existing?.reviewStatus === "approved" ? "private" : existing?.visibility ?? "private",
      reviewStatus: existing?.reviewStatus === "approved" ? "pending" : existing?.reviewStatus ?? "draft",
      trialExpiresAt: null
    };

    const nextCards = existing
      ? cards.map((item) => (item.id === existing.id ? card : item))
      : [card, ...cards];
    this.write(nextCards);
    this.trackRemoteSave(card);
    return card;
  }

  async remove(id: string) {
    if (!supabase || id.startsWith("demo-")) {
      this.markRemoved(id);
      this.write(this.read().filter((item) => item.id !== id));
      return { ok: true, message: "Визитка удалена навсегда." };
    }

    // Stop an already queued save from recreating the card while deletion is
    // being confirmed by the server.
    this.markRemoved(id);
    await Promise.allSettled([...this.pendingRemoteSaves]);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      this.write(this.read().filter((item) => item.id !== id));
      return { ok: true, message: "Визитка удалена с этого устройства." };
    }

    // A personal account has one server card. Delete by owner rather than by
    // the possibly stale local id, so a pending card cannot return on refresh.
    const { error } = await supabase
      .from("cards")
      .delete()
      .eq("owner_id", auth.user.id);

    if (error) {
      this.unmarkRemoved(id);
      return {
        ok: false,
        message: "Сервер не подтвердил удаление. Визитка сохранена — повторите попытку."
      };
    }

    this.write(this.read().filter((item) => item.id !== id));
    return { ok: true, message: "Визитка удалена навсегда." };
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

    if (!supabase) {
      return local;
    }

    // A completed save must reach Supabase before the card page decides which
    // status is authoritative.
    await Promise.allSettled([...this.pendingRemoteSaves]);
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("slug", slug.toLowerCase())
      .maybeSingle();

    if (!error && data) {
      const remoteCard = this.fromDatabase(data);
      const next = this.read().filter(
        (item) => item.id !== remoteCard.id && item.slug.toLowerCase() !== slug.toLowerCase()
      );
      this.write([remoteCard, ...next]);
      return remoteCard;
    }

    if (!error) {
      const { data: employee, error: employeeError } = await supabase.rpc(
        "get_public_organization_employee",
        { target_slug: slug.toLowerCase() }
      );
      if (!employeeError && employee) {
        const value = employee as Record<string, unknown>;
        const organizationCard: DigitalCard = {
          id: String(value.id), slug: String(value.slug), photo: String(value.photo ?? ""),
          companyLogo: String(value.companyLogo ?? ""), fullName: String(value.fullName ?? ""),
          position: String(value.position ?? ""), organization: String(value.organization ?? ""),
          description: String(value.description ?? ""), phone: String(value.phone ?? ""),
          secondPhone: String(value.secondPhone ?? ""), whatsapp: String(value.whatsapp ?? ""),
          telegram: String(value.telegram ?? ""), instagram: String(value.instagram ?? ""),
          facebook: String(value.facebook ?? ""), email: String(value.email ?? ""),
          website: String(value.website ?? ""), address: String(value.address ?? ""),
          language: (value.language as DigitalCard["language"]) ?? "ru",
          theme: (value.theme as DigitalCard["theme"]) ?? "teal",
          template: (value.template as DigitalCard["template"]) ?? "executive",
          visibility: "public_organization", reviewStatus: "approved", trialExpiresAt: null,
          views: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          organizationManaged: true
        };
        return organizationCard;
      }
    }

    // A temporary network or Supabase error must never erase the owner's
    // local draft. Hide it for this request, but keep it available for retry.
    if (error) return auth.user ? local : undefined;

    // For a signed-in owner, an absent/rejected server row must never be
    // resurrected from localStorage after an admin action or deletion.
    if (auth.user) {
      if (local && !isDemoCard(local)) {
        this.write(this.read().filter((item) => item.id !== local.id));
      }
      return undefined;
    }

    // Unapproved cards are available only to their authenticated owner through
    // Supabase RLS. Never expose a local draft to an anonymous visitor.
    return undefined;
  }

  async listRemote() {
    const removed = this.removedIds();
    const localUserCards = this.list().filter(
      (card) => !isDemoCard(card) && !removed.has(card.id)
    );
    if (!supabase) return localUserCards;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return localUserCards;
    await Promise.allSettled([...this.pendingRemoteSaves]);
    const { data, error } = await supabase
      .from("cards")
      .select("*")
      .eq("owner_id", auth.user.id)
      .order("updated_at", { ascending: false });
    if (error) return [];
    const remoteCards = (data ?? [])
      .map((row) => this.fromDatabase(row))
      .filter((card) => !removed.has(card.id));
    const demo = this.read().filter(isDemoCard);
    this.write([...remoteCards, ...demo]);
    return remoteCards;
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

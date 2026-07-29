import { demoCards } from "../data/demo";
import type { CardDraft, DigitalCard } from "../types/card";

const STORAGE_KEY = "vizora.cards.v1";

export interface CardRepository {
  list(): DigitalCard[];
  getById(id: string): DigitalCard | undefined;
  getBySlug(slug: string): DigitalCard | undefined;
  save(draft: CardDraft, id?: string): DigitalCard;
  remove(id: string): void;
  incrementViews(id: string): void;
}

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `card-${Date.now()}-${Math.random().toString(36).slice(2)}`;

class LocalStorageCardRepository implements CardRepository {
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
    return card;
  }

  remove(id: string) {
    this.write(this.read().filter((card) => card.id !== id));
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
  }
}

// Later this implementation can be replaced with SupabaseCardRepository
// without changing page components.
export const cardRepository: CardRepository =
  new LocalStorageCardRepository();

export type Language = "ru" | "tj" | "en";
export type CardTemplate = "executive" | "minimal" | "creative";
export type CardTheme = "teal" | "blue" | "plum" | "amber" | "graphite";

export interface DigitalCard {
  id: string;
  slug: string;
  photo: string;
  fullName: string;
  position: string;
  organization: string;
  description: string;
  phone: string;
  secondPhone: string;
  whatsapp: string;
  telegram: string;
  instagram: string;
  facebook: string;
  email: string;
  website: string;
  address: string;
  language: Language;
  theme: CardTheme;
  template: CardTemplate;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export type CardDraft = Omit<
  DigitalCard,
  "id" | "views" | "createdAt" | "updatedAt"
>;

export interface PlatformStats {
  users: number;
  cards: number;
  views: number;
}

export type Language = "ru" | "tj" | "en";
export type CardTemplate = "executive" | "minimal" | "creative";
export type CardTheme =
  | "teal"
  | "blue"
  | "plum"
  | "amber"
  | "graphite"
  | "navy"
  | "violet"
  | "burgundy";

export interface DigitalCard {
  id: string;
  slug: string;
  photo: string;
  companyLogo: string;
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
  visibility?: "private" | "public" | "organization" | "public_organization";
  reviewStatus?: "draft" | "pending" | "approved" | "changes_requested" | "rejected" | "suspended";
  trialExpiresAt?: string | null;
  views: number;
  createdAt: string;
  updatedAt: string;
  organizationManaged?: boolean;
  professionCategoryId?: string;
  specialistTitle?: string;
  specialistCity?: string;
  specialistTags?: string[];
  specialistExperience?: string;
  specialistSummary?: string;
  directoryHidden?: boolean;
  directoryRemovedAt?: string | null;
  directoryFeaturedUntil?: string | null;
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

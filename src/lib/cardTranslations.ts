import type { DigitalCard, Language } from "../types/card";

export function normalizeTranslations(value: unknown): NonNullable<DigitalCard["translations"]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as NonNullable<DigitalCard["translations"]>;
}

/** Shows the visitor's language when the owner filled it; otherwise the original text. */
export function localizeCard(card: DigitalCard, language: Language): DigitalCard {
  const translation = card.translations?.[language];
  if (!translation) return card;
  return {
    ...card,
    fullName: translation.fullName?.trim() || card.fullName,
    position: translation.position?.trim() || card.position,
    organization: translation.organization?.trim() || card.organization,
    description: translation.description?.trim() || card.description
  };
}

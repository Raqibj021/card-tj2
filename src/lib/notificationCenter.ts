import type { Language } from "../types/card";

export type NotificationSection = "all" | "organization" | "payments" | "cards" | "services" | "support" | "account";

export const notificationChangedEvent = "vizora:notifications-changed";

export function signalNotificationsChanged() {
  window.dispatchEvent(new Event(notificationChangedEvent));
}

export function notificationSection(kind: string): Exclude<NotificationSection, "all"> {
  const value = kind.toLowerCase();
  if (value.startsWith("organization_") || value.includes("invitation") || value.includes("employee")) return "organization";
  if (value.startsWith("payment_") || value.includes("subscription") || value.includes("plan_") || value.includes("tariff")) return "payments";
  if (value.startsWith("card_") || value === "card_review" || value.startsWith("verification_")) return "cards";
  if (value === "service" || value.startsWith("service_") || value.startsWith("contract_") || value.startsWith("order_")) return "services";
  if (value.startsWith("support_") || value.includes("ticket")) return "support";
  return "account";
}

const labels: Record<Exclude<NotificationSection, "all">, Record<Language, string>> = {
  organization: { ru: "Организация", tj: "Ташкилот", en: "Organization" },
  payments: { ru: "Оплата", tj: "Пардохт", en: "Payment" },
  cards: { ru: "Визитка", tj: "Варақа", en: "Business card" },
  services: { ru: "Заказы и услуги", tj: "Фармоиш ва хизматҳо", en: "Orders and services" },
  support: { ru: "Поддержка", tj: "Дастгирӣ", en: "Support" },
  account: { ru: "Аккаунт", tj: "Ҳисоб", en: "Account" }
};

export function notificationSectionLabel(section: Exclude<NotificationSection, "all">, language: Language) {
  return labels[section][language];
}

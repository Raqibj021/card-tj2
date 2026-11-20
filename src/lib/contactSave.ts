import type { DigitalCard } from "../types/card";
import { sanitizePhone } from "./cardUtils";

if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/phone-contact/worker.js", {
    scope: "/phone-contact/", type: "module"
  }).catch(() => { /* The contact page works without a service worker. */ });
}

const vcfUrl = (card: DigitalCard) => `${location.origin}/phone-contact/?s=${encodeURIComponent(card.slug)}`;

export const contactSaveUrl = (card: DigitalCard) => {
  if (!/Android/i.test(navigator.userAgent)) return vcfUrl(card);

  const url = new URL("https://contacts.google.com/new");
  // Keep the full name in the order entered on the card.
  url.searchParams.set("givenname", card.fullName.trim());
  const phone = card.phone?.trim() || card.secondPhone?.trim();
  if (phone) url.searchParams.set("phone", sanitizePhone(phone));
  if (card.email?.trim()) url.searchParams.set("email", card.email.trim());
  return url.href;
};

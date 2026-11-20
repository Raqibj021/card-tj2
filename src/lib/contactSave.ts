import type { DigitalCard } from "../types/card";
import { normalizeUrl, sanitizePhone, socialUrl } from "./cardUtils";

if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/phone-contact/worker.js", {
    scope: "/phone-contact/", type: "module"
  }).catch(() => { /* The contact page works without a service worker. */ });
}

export const vcfUrl = (card: DigitalCard) => `${location.origin}/phone-contact/?s=${encodeURIComponent(card.slug)}`;

export const googleContactUrl = (card: DigitalCard) => {
  const url = new URL("https://contacts.google.com/new");
  // Keep the full name in the order entered on the card.
  url.searchParams.set("givenname", card.fullName.trim());
  const phone = card.phone?.trim() || card.secondPhone?.trim();
  if (phone) url.searchParams.set("phone", sanitizePhone(phone));
  if (card.email?.trim()) url.searchParams.set("email", card.email.trim());
  return url.href;
};

export const contactClientId = import.meta.env.VITE_GOOGLE_CONTACTS_CLIENT_ID?.trim();

type Token = { access_token?: string; error?: string };
type TokenClient = { requestAccessToken(): void };
type Identity = { initTokenClient(options: {
  client_id: string; scope: string; callback: (token: Token) => void;
  error_callback: () => void;
}): TokenClient };
const identity = () => (window as Window & { google?: { accounts?: { oauth2?: Identity } } }).google?.accounts?.oauth2;

let loading: Promise<void> | undefined;
export function loadContactAuthorization() {
  if (identity()) return Promise.resolve();
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.onload = () => identity() ? resolve() : reject(new Error("Google unavailable"));
    script.onerror = () => { script.remove(); reject(new Error("Google unavailable")); };
    document.head.append(script);
  }).catch(error => { loading = undefined; throw error; });
  return loading;
}

export function googlePerson(card: DigitalCard) {
  const phones = [...new Set([card.phone, card.secondPhone].filter(Boolean).map(sanitizePhone).filter(Boolean))];
  const urls = [{ type: "Vizora", value: new URL("/" + encodeURIComponent(card.slug), location.origin).href }];
  if (card.website) urls.push({ type: "work", value: normalizeUrl(card.website) });
  for (const type of ["instagram", "facebook", "telegram"] as const) {
    if (card[type]?.trim()) urls.push({ type, value: socialUrl(type, card[type]) });
  }
  if (card.whatsapp) urls.push({ type: "WhatsApp", value: "https://wa.me/" + sanitizePhone(card.whatsapp).replace(/^\+/, "") });
  return {
    names: [{ unstructuredName: card.fullName }],
    phoneNumbers: phones.map(value => ({ value })), urls,
    ...(card.email && { emailAddresses: [{ value: card.email.trim() }] }),
    ...(card.address && { addresses: [{ formattedValue: card.address }] }),
    ...((card.organization || card.position) && { organizations: [{ name: card.organization, title: card.position }] }),
    ...(card.description && { biographies: [{ value: card.description, contentType: "TEXT_PLAIN" }] })
  };
}

export async function createGoogleContact(card: DigitalCard) {
  const api = identity();
  if (!api) throw new Error("Google unavailable");
  const token = await new Promise<string>((resolve, reject) => {
    const fail = () => reject(new Error("Google authorization incomplete"));
    const client = api.initTokenClient({
      client_id: contactClientId, scope: "https://www.googleapis.com/auth/contacts",
      callback: t => t.access_token && !t.error ? resolve(t.access_token) : fail(),
      error_callback: fail
    });
    client.requestAccessToken();
  });
  const response = await fetch("https://people.googleapis.com/v1/people:createContact", {
    method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
    body: JSON.stringify(googlePerson(card))
  });
  if (!response.ok) throw new Error("Google contact creation failed");
}

export async function downloadContactFile(card: DigitalCard) {
  const modulePath = "/phone-contact/contact.js";
  const { onRequestGet } = await import(/* @vite-ignore */ modulePath);
  const response: Response = await onRequestGet({ request: new Request(vcfUrl(card)) });
  if (!response.ok || !response.headers.get("Content-Type")?.startsWith("text/vcard")) throw new Error("Contact unavailable");
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = card.slug + ".vcf";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

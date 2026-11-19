import type { DigitalCard } from "../types/card";
import { sanitizePhone } from "./cardUtils";

const vcfUrl = (card: DigitalCard) => `${location.origin}/vcard/${encodeURIComponent(card.slug)}.vcf`;

/**
 * Android: an intent that opens the phone's own "New contact" form already filled in.
 * iPhone and others: a real .vcf from the server — Safari shows the "Create contact" card.
 */
export const contactSaveUrl = (card: DigitalCard) => {
  const isAndroid = /Android/i.test(navigator.userAgent);
  if (!isAndroid) return vcfUrl(card);
  const extra = (key: string, value?: string) => value ? `S.${key}=${encodeURIComponent(value)};` : "";
  const link = `${location.origin}/card/${card.slug}`;
  return "intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/contact;"
    + extra("name", card.fullName)
    + extra("phone", card.phone ? sanitizePhone(card.phone) : "")
    + "i.phone_type=2;"
    + extra("secondary_phone", card.secondPhone ? sanitizePhone(card.secondPhone) : "")
    + extra("email", card.email?.trim())
    + extra("company", card.organization)
    + extra("job_title", card.position)
    + extra("notes", [card.description, link].filter(Boolean).join("\n"))
    + extra("browser_fallback_url", vcfUrl(card))
    + "end";
};

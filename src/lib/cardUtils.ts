import QRCode from "qrcode";
import type { DigitalCard } from "../types/card";

export const themeColors = {
  teal: { accent: "#0f766e", soft: "#ccfbf1", label: "Бирюзовая" },
  blue: { accent: "#1d4ed8", soft: "#dbeafe", label: "Синяя" },
  plum: { accent: "#7e22ce", soft: "#f3e8ff", label: "Сливовая" },
  amber: { accent: "#b45309", soft: "#fef3c7", label: "Янтарная" },
  graphite: { accent: "#1f2937", soft: "#e5e7eb", label: "Графитовая" },
  navy: { accent: "#123b7a", soft: "#dce9ff", label: "Тёмно-синяя" },
  violet: { accent: "#6d3be8", soft: "#eee8ff", label: "Фиолетовая" },
  burgundy: { accent: "#8f2444", soft: "#fae4eb", label: "Бордовая" }
} as const;

export const sanitizePhone = (phone: string) =>
  phone.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");

export const normalizeUrl = (url: string) => {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

export const socialUrl = (
  type: "telegram" | "instagram" | "facebook",
  value: string
) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const clean = value.replace(/^@/, "").trim();
  if (type === "telegram") {
    return /^\+?\d+$/.test(clean)
      ? `https://t.me/+${clean.replace(/\D/g, "")}`
      : `https://t.me/${clean}`;
  }
  if (type === "instagram") return `https://instagram.com/${clean}`;
  return `https://facebook.com/${clean}`;
};

const transliteration: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  ғ: "gh",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  ӣ: "i",
  й: "y",
  к: "k",
  қ: "q",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ӯ: "u",
  ф: "f",
  х: "kh",
  ҳ: "h",
  ц: "ts",
  ч: "ch",
  ҷ: "j",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya"
};

export const createSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split("")
    .map((letter) => transliteration[letter] ?? letter)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);

const escapeVCard = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

export const buildVCard = (card: DigitalCard) => {
  const nameParts = card.fullName.trim().split(/\s+/);
  const lastName = nameParts.length > 1 ? nameParts.pop() ?? "" : "";
  const firstName = nameParts.join(" ");
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`,
    `FN:${escapeVCard(card.fullName)}`,
    card.organization ? `ORG:${escapeVCard(card.organization)}` : "",
    card.position ? `TITLE:${escapeVCard(card.position)}` : "",
    card.phone ? `TEL;TYPE=CELL:${sanitizePhone(card.phone)}` : "",
    card.secondPhone
      ? `TEL;TYPE=WORK:${sanitizePhone(card.secondPhone)}`
      : "",
    card.email ? `EMAIL;TYPE=INTERNET:${card.email}` : "",
    card.website ? `URL:${normalizeUrl(card.website)}` : "",
    card.address ? `ADR;TYPE=WORK:;;${escapeVCard(card.address)};;;;` : "",
    card.description ? `NOTE:${escapeVCard(card.description)}` : "",
    "END:VCARD"
  ];
  return lines.filter(Boolean).join("\r\n");
};

export const openVCardSaveDialog = async (card: DigitalCard) => {
  const isAndroid = /Android/i.test(navigator.userAgent);

  if (isAndroid) {
    const contactExtras = [
      ["name", card.fullName],
      ["phone", sanitizePhone(card.phone)],
      ["email", card.email],
      ["company", card.organization],
      ["job_title", card.position]
    ]
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => `S.${key}=${encodeURIComponent(value)}`)
      .join(";");

    // Chrome on Android passes this intent directly to the system Contacts app,
    // opening the native "create contact" screen instead of downloading a file.
    window.location.href =
      `intent:#Intent;action=android.intent.action.INSERT;` +
      `type=vnd.android.cursor.dir/contact;${contactExtras};end`;
    return;
  }

  const file = new File(
    [buildVCard(card)],
    `${card.slug || "contact"}.vcf`,
    { type: "text/vcard;charset=utf-8" }
  );

  if (
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: card.fullName,
        text: card.organization || card.position || undefined
      });
      return;
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
    }
  }

  // iOS/Safari understands a vCard opened in the current tab and displays the
  // native contact preview with the "Create New Contact" action.
  window.location.href =
    `data:text/vcard;charset=utf-8,${encodeURIComponent(buildVCard(card))}`;
};

export const downloadQrCode = async (value: string, filename: string) => {
  const url = await QRCode.toDataURL(value, {
    width: 1200,
    margin: 2,
    color: {
      dark: "#0b1220",
      light: "#ffffff"
    },
    errorCorrectionLevel: "H"
  });
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}-qr.png`;
  anchor.click();
};

export const formatDate = (date: string, language = "ru") =>
  new Intl.DateTimeFormat(
    language === "tj" ? "tg-TJ" : language === "en" ? "en-GB" : "ru-RU",
    { day: "2-digit", month: "short", year: "numeric" }
  ).format(new Date(date));

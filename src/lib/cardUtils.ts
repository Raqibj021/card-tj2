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
    card.photo ? `PHOTO;VALUE=URI:${card.photo}` : "",
    card.whatsapp ? `X-SOCIALPROFILE;TYPE=whatsapp:https://wa.me/${sanitizePhone(card.whatsapp).replace("+", "")}` : "",
    card.telegram ? `X-SOCIALPROFILE;TYPE=telegram:${socialUrl("telegram", card.telegram)}` : "",
    card.instagram ? `X-SOCIALPROFILE;TYPE=instagram:${socialUrl("instagram", card.instagram)}` : "",
    card.facebook ? `X-SOCIALPROFILE;TYPE=facebook:${socialUrl("facebook", card.facebook)}` : "",
    card.description ? `NOTE:${escapeVCard(card.description)}` : "",
    "END:VCARD"
  ];
  return lines.filter(Boolean).join("\r\n");
};

export const openVCardSaveDialog = async (card: DigitalCard): Promise<boolean> => {
  const file = new File(
    [buildVCard(card)],
    `${card.slug || "contact"}.vcf`,
    { type: "text/vcard" }
  );

  // Let the OS offer compatible apps; never silently download a contact or
  // navigate to a data URL (blocked by modern mobile browsers).
  if (
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function" ||
    !navigator.canShare({ files: [file] })
  ) return false;

  try {
    await navigator.share({ files: [file], title: card.fullName });
    return true;
  } catch (error) {
    // Cancelling the native picker is not a failed save.
    if ((error as Error).name === "AbortError") return true;
    return false;
  }
};

/** Capture the actual card markup using its mobile styles, not a second design. */
export const downloadCardImage = async (card: DigitalCard, page: HTMLElement) => {
  const { toCanvas } = await import("html-to-image");
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.tabIndex = -1;
  // A fixed mobile viewport makes the same export available on desktop too.
  frame.style.cssText = "position:fixed;left:-10000px;top:0;width:360px;height:640px;border:0;pointer-events:none";
  document.body.appendChild(frame);

  try {
    const doc = frame.contentDocument;
    if (!doc || !frame.contentWindow) throw new Error("Could not prepare card capture");
    doc.open();
    doc.write("<!doctype html><html><head></head><body></body></html>");
    doc.close();
    doc.documentElement.className = document.documentElement.className;
    doc.documentElement.lang = document.documentElement.lang;
    doc.body.className = document.body.className;

    const stylesReady = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map((style) => {
      const copy = style.cloneNode(true) as HTMLStyleElement | HTMLLinkElement;
      if (copy instanceof HTMLLinkElement) {
        copy.href = (style as HTMLLinkElement).href;
        return new Promise<void>((resolve, reject) => {
          copy.onload = () => resolve();
          copy.onerror = () => reject(new Error("Card stylesheet could not be loaded"));
          doc.head.appendChild(copy);
        });
      }
      doc.head.appendChild(copy);
      return Promise.resolve();
    });

    const clone = page.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".profile-dialog-backdrop, .toast").forEach((node) => node.remove());
    doc.body.appendChild(clone);
    await Promise.all(stylesReady);
    await doc.fonts.ready;
    await Promise.all(Array.from(clone.querySelectorAll("img")).map(async (img) => {
      img.loading = "eager";
      await img.decode();
    }));

    const surface = clone.querySelector<HTMLElement>(".profile-main-card");
    if (!surface) throw new Error("Card surface is missing");
    const bounds = surface.getBoundingClientRect();
    const width = Math.ceil(bounds.width);
    const height = Math.ceil(Math.max(bounds.height, surface.scrollHeight));
    const screenshot = await toCanvas(surface, {
      width,
      height,
      pixelRatio: 3,
      preferredFontFormat: "woff2"
    });

    // Fit the full card into 9:16 without cropping contacts or distorting the QR.
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is not supported");
    context.fillStyle = frame.contentWindow.getComputedStyle(surface).backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / screenshot.width, canvas.height / screenshot.height);
    const targetWidth = screenshot.width * scale;
    const targetHeight = screenshot.height * scale;
    context.drawImage(screenshot, (1080 - targetWidth) / 2, (1920 - targetHeight) / 2, targetWidth, targetHeight);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image export failed")), "image/png")
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${card.slug || "business-card"}-9x16.png`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  } finally {
    frame.remove();
  }
};

export const downloadQrCode = async (value: string, filename: string) => {
  const url = await QRCode.toDataURL(value, {
    width: 1200,
    margin: 4,
    color: {
      dark: "#0b1220",
      light: "#ffffff"
    },
    errorCorrectionLevel: "M"
  });
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}-qr.png`;
  anchor.click();
};

export const formatDate = (date: string, language = "ru") => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat(
    language === "tj" ? "tg-TJ" : language === "en" ? "en-GB" : "ru-RU",
    { day: "2-digit", month: "short", year: "numeric" }
  ).format(parsed);
};

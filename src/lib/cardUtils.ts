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

const loadCanvasImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });

const drawCoverImage = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
};

export const downloadCardImage = async (card: DigitalCard) => {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");

  const palette = themeColors[card.theme];
  const gradient = context.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, palette.accent);
  gradient.addColorStop(0.46, "#071426");
  gradient.addColorStop(1, "#020711");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 1080, 1350);

  context.fillStyle = "rgba(255,255,255,.08)";
  context.beginPath();
  context.arc(910, 130, 270, 0, Math.PI * 2);
  context.fill();

  if (card.companyLogo) {
    try {
      const logo = await loadCanvasImage(card.companyLogo);
      context.save();
      context.beginPath();
      context.roundRect(70, 68, 116, 116, 28);
      context.clip();
      context.fillStyle = "#ffffff";
      context.fillRect(70, 68, 116, 116);
      drawCoverImage(context, logo, 70, 68, 116, 116);
      context.restore();
    } catch { /* The text fallback below remains available. */ }
  }

  context.fillStyle = "rgba(255,255,255,.68)";
  context.font = "700 25px Arial, sans-serif";
  context.fillText("ЦИФРОВАЯ ВИЗИТКА", card.companyLogo ? 216 : 70, 102);
  context.fillStyle = "#ffffff";
  context.font = "800 42px Arial, sans-serif";
  context.fillText((card.organization || "Vizora.tj").slice(0, 28), card.companyLogo ? 216 : 70, 155);

  if (card.photo) {
    try {
      const photo = await loadCanvasImage(card.photo);
      context.save();
      context.beginPath();
      context.roundRect(70, 245, 360, 430, 48);
      context.clip();
      drawCoverImage(context, photo, 70, 245, 360, 430);
      context.restore();
    } catch { /* Initials are drawn below when the photo cannot be loaded. */ }
  }
  if (!card.photo) {
    context.fillStyle = "rgba(255,255,255,.12)";
    context.beginPath();
    context.roundRect(70, 245, 360, 430, 48);
    context.fill();
    context.fillStyle = "#ffffff";
    context.font = "800 112px Arial, sans-serif";
    context.fillText(card.fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join(""), 150, 500);
  }

  context.fillStyle = "#ffffff";
  context.font = "800 58px Arial, sans-serif";
  const nameWords = card.fullName.split(/\s+/);
  const firstLine = nameWords.slice(0, 2).join(" ");
  context.fillText(firstLine.slice(0, 24), 490, 330);
  if (nameWords.length > 2) context.fillText(nameWords.slice(2).join(" ").slice(0, 24), 490, 400);
  context.fillStyle = "rgba(255,255,255,.72)";
  context.font = "500 31px Arial, sans-serif";
  context.fillText((card.position || card.organization || "").slice(0, 34), 490, nameWords.length > 2 ? 458 : 395);

  const contactLines = [
    card.phone && `☎  ${card.phone}`,
    card.secondPhone && `☎  ${card.secondPhone}`,
    card.email && `✉  ${card.email}`,
    card.website && `⌁  ${card.website.replace(/^https?:\/\//, "")}`,
    card.address && `⌖  ${card.address}`
  ].filter(Boolean) as string[];
  context.font = "600 29px Arial, sans-serif";
  contactLines.slice(0, 5).forEach((line, index) => {
    context.fillStyle = index === 0 ? "#ffffff" : "rgba(255,255,255,.82)";
    context.fillText(line.slice(0, 48), 490, 535 + index * 64);
  });

  context.fillStyle = "rgba(255,255,255,.1)";
  context.beginPath();
  context.roundRect(70, 760, 940, 410, 42);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "800 34px Arial, sans-serif";
  context.fillText("СВЯЗАТЬСЯ", 120, 830);
  const socials = [
    card.instagram && "Instagram",
    card.facebook && "Facebook",
    card.whatsapp && "WhatsApp",
    card.telegram && "Telegram"
  ].filter(Boolean) as string[];
  context.font = "700 30px Arial, sans-serif";
  socials.forEach((social, index) => context.fillText(social, 120 + (index % 2) * 400, 910 + Math.floor(index / 2) * 80));
  context.fillStyle = "rgba(255,255,255,.58)";
  context.font = "600 25px Arial, sans-serif";
  context.fillText("Vizora.tj", 70, 1280);

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image export failed")), "image/png", 0.95)
  );
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${card.slug || "business-card"}.png`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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

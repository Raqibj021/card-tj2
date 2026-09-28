import type { CSSProperties } from "react";
import {
  Building2,
  Check,
  Facebook,
  Globe2,
  Instagram,
  Mail,
  MapPin,
  Phone,
  QrCode,
  Send
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { themeColors } from "../lib/cardUtils";
import type { CardDraft, DigitalCard } from "../types/card";
import WhatsAppIcon from "./icons/WhatsAppIcon";

interface CardPreviewProps {
  card: CardDraft | DigitalCard;
  compact?: boolean;
}

type AccentStyle = CSSProperties & {
  "--card-accent": string;
  "--card-soft": string;
};

const initials = (name: string) =>
  (name || "Card TJ")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const formatDisplayName = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => {
      const normalized = part.toLocaleLowerCase();
      return normalized
        ? normalized.charAt(0).toLocaleUpperCase() + normalized.slice(1)
        : "";
    })
    .join(" ");

export default function CardPreview({
  card,
  compact = false
}: CardPreviewProps) {
  const { t, language } = useApp();
  const copy = {
    ru: { kicker: "ПРОФЕССИОНАЛЬНЫЙ ПРОФИЛЬ", description: "Кратко расскажите о себе, своей работе и главной ценности для клиента." },
    tj: { kicker: "ПРОФИЛИ КАСБӢ", description: "Дар бораи худ, фаъолияти худ ва арзиши асосӣ барои муштарӣ кӯтоҳ маълумот диҳед." },
    en: { kicker: "PROFESSIONAL PROFILE", description: "Briefly introduce yourself, your work and the value you provide to clients." }
  }[language];
  const palette = themeColors[card.theme] ?? themeColors.teal;
  const style: AccentStyle = {
    "--card-accent": palette.accent,
    "--card-soft": palette.soft
  };
  const displayName = formatDisplayName(card.fullName || t("fullName"));

  return (
    <article className="card-live-preview" style={style} aria-label={t("livePreview")}>
      <div className="card-live-cover">
        <span className="card-live-brand">
          <span className="card-live-logo">{card.companyLogo ? <img src={card.companyLogo} alt="" /> : (card.organization || "V").charAt(0)}</span>
          <span><small>{copy.kicker}</small><strong>{card.organization || "Vizora.tj"}</strong></span>
        </span>
        <span className="card-live-status"><Check size={12} /> VIZORA</span>
      </div>
      <div className="card-live-content">
        {card.photo ? <img className="card-live-avatar" src={card.photo} alt="" /> : <span className="card-live-avatar card-live-fallback">{initials(card.fullName)}</span>}
        <div className="card-live-identity"><h3>{displayName}</h3><p>{card.position || t("position")}</p>{card.organization && <small><Building2 size={14} /> {card.organization}</small>}</div>
        <div className="card-live-socials" aria-hidden="true"><Send /><WhatsAppIcon size={23} /><Instagram /><Facebook /></div>
        <div className="card-live-actions" aria-hidden="true"><span><Phone />{t("call")}</span><span><Mail />E-mail</span><span><Globe2 />{t("website")}</span><span><MapPin />{t("address")}</span></div>
        <div className="card-live-save"><Check size={18} /> {t("saveContact")}</div>
        {!compact && <div className="card-live-bottom"><span><QrCode size={68} /></span><div><small>{t("copyLink")}</small><small>{t("downloadQr")}</small><strong>⌁ NFC</strong></div></div>}
      </div>
    </article>
  );
}

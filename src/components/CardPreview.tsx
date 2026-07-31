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
    <article
      data-card-id={"id" in card ? card.id : undefined}
      className={`digital-card digital-card-${card.template} ${
        compact ? "digital-card-compact" : ""
      }`}
      style={style}
    >
      <div className="card-preview-cover">
        <div className="card-preview-orb" />
        <span className="card-preview-brand">
          <span className={card.companyLogo ? "has-company-logo" : ""}>
            {card.companyLogo ? (
              <img src={card.companyLogo} alt="" />
            ) : (
              (card.organization || "V").charAt(0)
            )}
          </span>
          {card.organization || "VIZORA.TJ"}
        </span>
        <span className="card-preview-qr"><QrCode size={18} /></span>
      </div>

      <div className="card-preview-body">
        <div className="card-profile">
          <div className="card-avatar-wrap">
            {card.photo ? (
              <img
                src={card.photo}
                alt={displayName}
                className="card-avatar"
              />
            ) : (
              <div className="card-avatar card-avatar-fallback">
                {initials(card.fullName)}
              </div>
            )}
            <span className="card-preview-verified"><Check size={12} /></span>
          </div>
          <div className="min-w-0">
            <span className="card-kicker">{copy.kicker}</span>
            <h3 className="card-name">{displayName}</h3>
            <p className="card-role">{card.position || t("position")}</p>
          </div>
        </div>

        <p className="card-description">
          {card.description ||
            copy.description}
        </p>

        {!compact && (
          <div className="card-organization">
            <Building2 size={16} />
            <span>{card.organization || t("organization")}</span>
          </div>
        )}

        <div className="card-primary-actions">
          <div className="card-primary-button">
            <Phone size={18} />
            <span>{t("call")}</span>
          </div>
          <div className="card-primary-button card-primary-button-light">
            <WhatsAppIcon size={18} />
            <span>WhatsApp</span>
          </div>
        </div>

        {!compact && (
          <>
            <div className="card-contact-list">
              <div>
                <Phone size={16} />
                <span>{card.phone || "+992 00 000 00 00"}</span>
              </div>
              <div>
                <Mail size={16} />
                <span>{card.email || "name@example.tj"}</span>
              </div>
              <div>
                <Globe2 size={16} />
                <span>{card.website || "www.example.tj"}</span>
              </div>
              <div>
                <MapPin size={16} />
                <span>{card.address || t("address")}</span>
              </div>
            </div>
            <div className="card-socials">
              <span><Send size={15} /> Telegram</span>
              <span><Instagram size={15} /> Instagram</span>
              <span><Facebook size={15} /> Facebook</span>
            </div>
          </>
        )}

        <div className="card-signature">
          <span className="mini-logo">V</span>
          <span>vizora.tj/demo</span>
        </div>
      </div>
    </article>
  );
}

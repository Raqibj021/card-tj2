import type { CSSProperties } from "react";
import {
  Building2,
  Globe2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { themeColors } from "../lib/cardUtils";
import type { CardDraft, DigitalCard } from "../types/card";

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

export default function CardPreview({
  card,
  compact = false
}: CardPreviewProps) {
  const { t } = useApp();
  const palette = themeColors[card.theme];
  const style: AccentStyle = {
    "--card-accent": palette.accent,
    "--card-soft": palette.soft
  };

  return (
    <article
      className={`digital-card digital-card-${card.template} ${
        compact ? "digital-card-compact" : ""
      }`}
      style={style}
    >
      <div className="card-topline" />
      <div className="card-profile">
        {card.photo ? (
          <img
            src={card.photo}
            alt={card.fullName || t("photo")}
            className="card-avatar"
          />
        ) : (
          <div className="card-avatar card-avatar-fallback">
            {initials(card.fullName)}
          </div>
        )}
        <div className="min-w-0">
          <span className="card-kicker">
            {card.organization || "Vizora.tj profile"}
          </span>
          <h3 className="card-name">{card.fullName || t("fullName")}</h3>
          <p className="card-role">{card.position || t("position")}</p>
        </div>
      </div>

      <p className="card-description">
        {card.description ||
          "Кратко расскажите о себе, своей работе и главной ценности для клиента."}
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
          <MessageCircle size={18} />
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
            <span><MessageCircle size={15} /> Instagram</span>
          </div>
        </>
      )}

      <div className="card-signature">
        <span className="mini-logo">C</span>
        <span>card.tj/{card.slug || "your-name"}</span>
      </div>
    </article>
  );
}

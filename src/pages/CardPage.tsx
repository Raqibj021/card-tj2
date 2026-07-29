import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  Download,
  Facebook,
  Globe2,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Share2,
  UserPlus,
  ClipboardPenLine,
  PhoneCall,
  WalletCards
} from "lucide-react";
import { Link, useParams } from "react-router";
import QRCodeImage from "../components/QRCode";
import BrandLogo from "../components/BrandLogo";
import { useApp } from "../context/AppContext";
import { cardRepository } from "../lib/cardRepository";
import {
  downloadQrCode,
  downloadVCard,
  normalizeUrl,
  sanitizePhone,
  socialUrl,
  themeColors
} from "../lib/cardUtils";
import type { DigitalCard, Language } from "../types/card";
import LeadFormModal from "../components/LeadFormModal";
import type { Lead } from "../lib/leadRepository";
import { walletAdapter } from "../lib/wallet";

type AccentStyle = CSSProperties & {
  "--profile-accent": string;
  "--profile-soft": string;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

export default function CardPage() {
  const { slug = "" } = useParams();
  const { t, language, setLanguage, theme, toggleTheme } = useApp();
  const [toast, setToast] = useState("");
  const [card, setCard] = useState<DigitalCard | undefined>(() =>
    cardRepository.getBySlug(slug)
  );
  const [loading, setLoading] = useState(!card);
  const [leadSource, setLeadSource] = useState<Lead["source"] | null>(null);
  const cardUrl = window.location.href;

  useEffect(() => {
    let active = true;
    setLoading(true);
    void cardRepository.getPublicBySlug(slug).then((result) => {
      if (!active) return;
      setCard(result);
      setLoading(false);
    });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!card) return;
    setLanguage(card.language);
    const viewKey = `vizora.viewed.${card.id}`;
    if (!sessionStorage.getItem(viewKey)) {
      cardRepository.incrementViews(card.id);
      sessionStorage.setItem(viewKey, "1");
    }
  }, [card, setLanguage]);

  if (loading) {
    return (
      <main className="card-missing">
        <BrandLogo />
        <div className="profile-loading"><span /><p>Загружаем визитку…</p></div>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="card-missing">
        <Link to="/" className="brand-mark">
          <BrandLogo />
        </Link>
        <div className="empty-state mt-8 max-w-xl">
          <div className="empty-state-icon"><Globe2 size={26} /></div>
          <h1>{t("cardNotFound")}</h1>
          <p>{t("cardNotFoundText")}</p>
          <Link to="/create" className="button button-primary mt-6">
            {t("create")}
          </Link>
        </div>
      </main>
    );
  }

  const palette = themeColors[card.theme];
  const style: AccentStyle = {
    "--profile-accent": palette.accent,
    "--profile-soft": palette.soft
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  };

  const share = async () => {
    const data = {
      title: `${card.fullName} — Vizora.tj`,
      text: `${card.fullName}, ${card.position}`,
      url: cardUrl
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(cardUrl);
    showToast(t("copied"));
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(cardUrl);
    showToast(t("copied"));
  };

  const addToWallet = async () => {
    if (!card) return;
    const apple = /iPhone|iPad|Macintosh/i.test(navigator.userAgent);
    const result = await walletAdapter.addPass({
      cardId: card.id,
      cardSlug: card.slug,
      platform: apple ? "apple" : "google"
    });
    showToast(result.message);
  };

  const actionLinks = [
    card.phone && {
      href: `tel:${sanitizePhone(card.phone)}`,
      icon: Phone,
      label: t("call"),
      primary: true
    },
    card.whatsapp && {
      href: `https://wa.me/${sanitizePhone(card.whatsapp).replace("+", "")}`,
      icon: MessageCircle,
      label: "WhatsApp",
      primary: true
    },
    card.telegram && {
      href: socialUrl("telegram", card.telegram),
      icon: Send,
      label: "Telegram",
      primary: false
    },
    card.email && {
      href: `mailto:${card.email}`,
      icon: Mail,
      label: "E-mail",
      primary: false
    }
  ].filter(Boolean) as Array<{
    href: string;
    icon: typeof Phone;
    label: string;
    primary: boolean;
  }>;

  return (
    <main className={`profile-page profile-${card.template}`} style={style}>
      <div className="profile-background-shape" />
      <header className="profile-toolbar">
        <Link to="/" className="profile-brand">
          <BrandLogo compact />
        </Link>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="profile-language">
            {t("cardLanguage")}
          </label>
          <select
            id="profile-language"
            className="profile-select"
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as Language)
            }
          >
            <option value="ru">RU</option>
            <option value="tj">TJ</option>
            <option value="en">EN</option>
          </select>
          <button
            type="button"
            className="profile-toolbar-button"
            onClick={toggleTheme}
            aria-label={theme === "light" ? t("darkTheme") : t("lightTheme")}
          >
            {theme === "light" ? "◐" : "◑"}
          </button>
          <button
            type="button"
            className="profile-toolbar-button"
            onClick={share}
            aria-label={t("share")}
          >
            <Share2 size={18} />
          </button>
        </div>
      </header>

      <div className="profile-layout">
        <section className="profile-main-card">
          <div className="profile-cover">
            <span className="profile-cover-logo">C</span>
            <span>{card.organization || "Vizora.tj"}</span>
          </div>
          <div className="profile-content">
            <div className="profile-avatar-wrap">
              {card.photo ? (
                <img src={card.photo} alt={card.fullName} className="profile-avatar" />
              ) : (
                <div className="profile-avatar profile-avatar-fallback">
                  {initials(card.fullName)}
                </div>
              )}
              <span className="profile-verified" title="Проверенный профиль">
                <Check size={15} />
              </span>
            </div>

            <div className="profile-identity">
              <h1>{card.fullName}</h1>
              <p className="profile-role">{card.position}</p>
              {card.organization && (
                <p className="profile-company">
                  <Building2 size={16} /> {card.organization}
                </p>
              )}
            </div>

            {card.description && (
              <p className="profile-description">{card.description}</p>
            )}

            <div className="profile-action-grid">
              {actionLinks.map(({ href, icon: Icon, label, primary }) => (
                <a
                  href={href}
                  key={label}
                  className={`profile-action ${primary ? "profile-action-primary" : ""}`}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                >
                  <Icon size={19} />
                  <span>{label}</span>
                </a>
              ))}
            </div>

            <button
              type="button"
              className="profile-save-button"
              onClick={() => downloadVCard(card)}
            >
              <UserPlus size={20} />
              {t("saveContact")}
            </button>

            <div className="lead-action-grid">
              <button type="button" onClick={() => setLeadSource("contact")}>
                <MessageCircle size={18} /><span>Связаться</span>
              </button>
              <button type="button" onClick={() => setLeadSource("callback")}>
                <PhoneCall size={18} /><span>Заказать звонок</span>
              </button>
              <button type="button" onClick={() => setLeadSource("request")}>
                <ClipboardPenLine size={18} /><span>Оставить заявку</span>
              </button>
            </div>

            <div className="profile-detail-list">
              {card.phone && (
                <a href={`tel:${sanitizePhone(card.phone)}`}>
                  <span><Phone size={18} /></span>
                  <div><small>{t("phone")}</small><strong>{card.phone}</strong></div>
                </a>
              )}
              {card.secondPhone && (
                <a href={`tel:${sanitizePhone(card.secondPhone)}`}>
                  <span><Phone size={18} /></span>
                  <div><small>{t("secondPhone")}</small><strong>{card.secondPhone}</strong></div>
                </a>
              )}
              {card.email && (
                <a href={`mailto:${card.email}`}>
                  <span><Mail size={18} /></span>
                  <div><small>{t("email")}</small><strong>{card.email}</strong></div>
                </a>
              )}
              {card.website && (
                <a href={normalizeUrl(card.website)} target="_blank" rel="noreferrer">
                  <span><Globe2 size={18} /></span>
                  <div><small>{t("website")}</small><strong>{card.website.replace(/^https?:\/\//, "")}</strong></div>
                </a>
              )}
              {card.address && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.address)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span><MapPin size={18} /></span>
                  <div><small>{t("address")}</small><strong>{card.address}</strong><em>{t("map")}</em></div>
                </a>
              )}
            </div>

            {(card.instagram || card.facebook || card.telegram) && (
              <div className="profile-social-row">
                {card.instagram && (
                  <a href={socialUrl("instagram", card.instagram)} target="_blank" rel="noreferrer" aria-label="Instagram">
                    <Instagram size={20} />
                  </a>
                )}
                {card.facebook && (
                  <a href={socialUrl("facebook", card.facebook)} target="_blank" rel="noreferrer" aria-label="Facebook">
                    <Facebook size={20} />
                  </a>
                )}
                {card.telegram && (
                  <a href={socialUrl("telegram", card.telegram)} target="_blank" rel="noreferrer" aria-label="Telegram">
                    <Send size={20} />
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="profile-side">
          <div className="profile-qr-card">
            <QRCodeImage value={cardUrl} size={210} className="mx-auto rounded-2xl" />
            <h2>QR-код</h2>
            <p>{t("scanQr")}</p>
            <div className="mt-5 grid gap-2">
              <button type="button" className="button button-secondary w-full" onClick={copyLink}>
                <Share2 size={17} /> {t("copyLink")}
              </button>
              <button
                type="button"
                className="button button-ghost w-full"
                onClick={() => downloadQrCode(cardUrl, card.slug)}
              >
                <Download size={17} /> {t("downloadQr")}
              </button>
              <button type="button" className="button button-ghost w-full" onClick={addToWallet}>
                <WalletCards size={17} /> Добавить в Wallet
              </button>
            </div>
          </div>
          <Link to="/create" className="profile-powered">
            <span>Создайте свою визитку бесплатно</span>
            <ArrowLeft className="rotate-180" size={17} />
          </Link>
        </aside>
      </div>

      <footer className="profile-footer">
        <span>Создано на</span>
        <Link to="/">Vizora.tj</Link>
      </footer>

      {toast && <div className="toast"><Check size={17} /> {toast}</div>}
      {leadSource && (
        <LeadFormModal
          cardId={card.id}
          cardSlug={card.slug}
          ownerName={card.fullName}
          source={leadSource}
          onClose={() => setLeadSource(null)}
        />
      )}
    </main>
  );
}

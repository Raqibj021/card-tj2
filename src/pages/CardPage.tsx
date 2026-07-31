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
  LockKeyhole,
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
import { useAuth } from "../context/AuthContext";
import { cardRepository } from "../lib/cardRepository";
import { promoRepository, type LaunchPromoStatus } from "../lib/promoRepository";
import {
  downloadQrCode,
  openVCardSaveDialog,
  normalizeUrl,
  sanitizePhone,
  socialUrl,
  themeColors
} from "../lib/cardUtils";
import type { DigitalCard, Language } from "../types/card";
import LeadFormModal from "../components/LeadFormModal";
import type { Lead } from "../lib/leadRepository";
import { walletAdapter } from "../lib/wallet";
import WhatsAppIcon from "../components/icons/WhatsAppIcon";
import ReportCardButton from "../components/ReportCardButton";

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

const profileCopy = {
  ru: {
    digitalCard: "Цифровая визитка",
    verified: "Профиль подтверждён",
    quickRequest: "Быстрая заявка",
    howHelp: "Чем я могу помочь?",
    write: "Написать",
    callback: "Заказать звонок",
    request: "Оставить заявку",
    qrCode: "QR-код",
    addWallet: "Добавить в Wallet",
    createOwn: "Создайте свою визитку",
    createdOn: "Создано на",
    loading: "Загружаем визитку…",
    preview: "Предпросмотр профиля",
    trialQrTitle: "QR-код пока недоступен",
    trialQrText: "Это демо-версия. Продолжите оформление и активируйте визитку, чтобы получить рабочий QR-код.",
    continueCheckout: "Продолжить оформление",
    trial: "ДЕМО · НЕ АКТИВИРОВАНО",
    trialText: "Данные сохранены. Выберите бесплатную акцию или оплату, чтобы отправить визитку на проверку.",
    promoButton: "Использовать бесплатную акцию",
    promoPlaces: "Осталось бесплатных мест",
    payButton: "Оплатить и отправить чек",
    activating: "Отправляем…",
    submitReview: "Отправить на проверку",
    pending: "ОЖИДАЕТ ПРОВЕРКИ",
    pendingText: "Визитка сохранена. Администратор проверит данные и одобрит её в ближайшее время.",
    pendingQrTitle: "QR-код появится после проверки",
    pendingQrText: "До одобрения администратора QR-код, ссылка и контактные действия не работают.",
    missingInfo: "Информация не добавлена"
  },
  tj: {
    digitalCard: "Варақаи рақамӣ",
    verified: "Профил тасдиқ шудааст",
    quickRequest: "Дархости фаврӣ",
    howHelp: "Чӣ тавр кумак карда метавонам?",
    write: "Навиштан",
    callback: "Дархости занг",
    request: "Пешниҳоди дархост",
    qrCode: "QR-код",
    addWallet: "Илова ба Wallet",
    createOwn: "Варақаи худро созед",
    createdOn: "Сохта шудааст дар",
    loading: "Варақа бор шуда истодааст…",
    preview: "Пешнамоиши профил",
    trialQrTitle: "QR-код ҳоло дастрас нест",
    trialQrText: "Ин нусхаи намоишӣ аст. Барои гирифтани QR-коди фаъол расмиятдарориро идома дода, варақаро фаъол намоед.",
    continueCheckout: "Идомаи расмиятдарорӣ",
    trial: "НАМОИШӢ · ФАЪОЛ НЕСТ",
    trialText: "Маълумот нигоҳ дошта шуд. Барои фиристодан ба санҷиш аксияи ройгон ё пардохтро интихоб кунед.",
    promoButton: "Истифодаи аксияи ройгон",
    promoPlaces: "Ҷойҳои ройгони боқимонда",
    payButton: "Пардохт ва фиристодани расид",
    activating: "Фиристода истодааст…",
    submitReview: "Ба санҷиш фиристодан",
    pending: "ИНТИЗОРИ САНҶИШ",
    pendingText: "Варақа нигоҳ дошта шуд. Администратор маълумотро месанҷад ва ба наздикӣ онро тасдиқ мекунад.",
    pendingQrTitle: "QR-код пас аз санҷиш пайдо мешавад",
    pendingQrText: "То тасдиқи администратор QR-код, пайванд ва амалҳои тамос кор намекунанд.",
    missingInfo: "Маълумот илова нашудааст"
  },
  en: {
    digitalCard: "Digital business card",
    verified: "Verified profile",
    quickRequest: "Quick request",
    howHelp: "How can I help?",
    write: "Message",
    callback: "Request a call",
    request: "Send a request",
    qrCode: "QR code",
    addWallet: "Add to Wallet",
    createOwn: "Create your own card",
    createdOn: "Created with",
    loading: "Loading business card…",
    preview: "Profile preview",
    trialQrTitle: "QR code is not available yet",
    trialQrText: "This is a demo. Continue checkout and activate the card to receive a working QR code.",
    continueCheckout: "Continue checkout",
    trial: "DEMO · NOT ACTIVATED",
    trialText: "Your data is saved. Choose the free launch offer or payment to submit the card for review.",
    promoButton: "Use the free launch offer",
    promoPlaces: "Free places remaining",
    payButton: "Pay and upload receipt",
    activating: "Submitting…",
    submitReview: "Submit for review",
    pending: "AWAITING REVIEW",
    pendingText: "The card has been saved. An administrator will review and approve it shortly.",
    pendingQrTitle: "QR code will appear after review",
    pendingQrText: "The QR code, public link and contact actions remain disabled until administrator approval.",
    missingInfo: "Information not provided"
  }
} as const;

export default function CardPage() {
  const { slug = "" } = useParams();
  const { t, language, setLanguage, theme, toggleTheme } = useApp();
  const { user } = useAuth();
  const [toast, setToast] = useState("");
  const [card, setCard] = useState<DigitalCard | undefined>(() =>
    cardRepository.getBySlug(slug)
  );
  const [loading, setLoading] = useState(!card);
  const [leadSource, setLeadSource] = useState<Lead["source"] | null>(null);
  const [promo, setPromo] = useState<LaunchPromoStatus | null>(null);
  const [activating, setActivating] = useState(false);
  const cardUrl = window.location.href;
  const labels = profileCopy[language];

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      setCard(undefined);
      setLoading(false);
    }, 12000);
    setLoading(true);
    void cardRepository.getPublicBySlug(slug)
      .then((result) => {
        if (active) setCard(result);
      })
      .catch(() => {
        if (active) setCard(undefined);
      })
      .finally(() => {
        if (!active) return;
        window.clearTimeout(timer);
        setLoading(false);
      });
    return () => { active = false; window.clearTimeout(timer); };
  }, [slug]);

  useEffect(() => {
    if (!card) return;
    setLanguage(card.language);
    if (card.reviewStatus !== "approved") return;
    const viewKey = `vizora.viewed.${card.id}`;
    if (!sessionStorage.getItem(viewKey)) {
      cardRepository.incrementViews(card.id);
      sessionStorage.setItem(viewKey, "1");
    }
  }, [card, setLanguage]);

  useEffect(() => {
    if (!user || !card || card.reviewStatus !== "draft") return;
    void promoRepository.status().then(setPromo).catch(() => setPromo(null));
  }, [card, user]);

  if (loading) {
    return (
      <main className="card-missing">
        <BrandLogo />
        <div className="profile-loading"><span /><p>{labels.loading}</p></div>
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
  const isLocked = card.reviewStatus !== "approved";
  const needsActivation = card.reviewStatus === "draft";
  const style: AccentStyle = {
    "--profile-accent": palette.accent,
    "--profile-soft": palette.soft
  };

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  };

  const claimPromo = async () => {
    setActivating(true);
    try {
      const result = await promoRepository.claim(card.id);
      setPromo(result);
      setCard({ ...card, reviewStatus: "pending", trialExpiresAt: null });
      showToast(labels.pendingText);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Не удалось применить акцию.");
    } finally {
      setActivating(false);
    }
  };

  const submitForReview = async () => {
    setActivating(true);
    try {
      const result = await cardRepository.requestPublication(card.id);
      showToast(result.message);
      if (result.ok) setCard({ ...card, reviewStatus: "pending", trialExpiresAt: null });
    } finally {
      setActivating(false);
    }
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
      icon: WhatsAppIcon,
      label: "WhatsApp",
      primary: true
    },
    (card.telegram || card.organizationManaged) && {
      href: card.telegram ? socialUrl("telegram", card.telegram) : null,
      icon: Send,
      label: "Telegram",
      primary: false
    },
    (card.email || card.organizationManaged) && {
      href: card.email ? `mailto:${card.email}` : null,
      icon: Mail,
      label: "E-mail",
      primary: false
    }
  ].filter(Boolean) as Array<{
    href: string | null;
    icon: typeof Phone;
    label: string;
    primary: boolean;
  }>;

  return (
    <main className={`profile-page profile-${card.template} ${isLocked ? "profile-trial" : ""}`} style={style}>
      <div className="profile-background-shape" />
      <header className="profile-toolbar">
        <Link to="/" className="profile-brand">
          <BrandLogo light />
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
            onClick={() => isLocked ? showToast(labels.pendingQrText) : void share()}
            aria-label={t("share")}
            title={isLocked ? labels.pendingQrText : t("share")}
          >
            <Share2 size={18} />
          </button>
        </div>
      </header>

      <div className="profile-layout">
        <section className="profile-main-card">
          {isLocked && (
            <>
              <div className="trial-watermark" aria-hidden="true">{needsActivation ? labels.trial : labels.pending}</div>
              <div className="trial-countdown" role="status">
                <strong>{needsActivation ? labels.trial : labels.pending}</strong>
                <span>{needsActivation ? labels.trialText : labels.pendingText}</span>
                {needsActivation && promo?.eligible && !promo.hasEntitlement && promo.remaining > 0 && (
                  <button type="button" disabled={activating} className="button button-primary" onClick={() => void claimPromo()}>
                    {activating ? labels.activating : labels.promoButton}
                    {!activating && <em>{promo.remaining}/{promo.limit}</em>}
                  </button>
                )}
                {needsActivation && promo?.hasEntitlement ? (
                  <button type="button" disabled={activating} className="button button-primary" onClick={() => void submitForReview()}>
                    {activating ? labels.activating : labels.submitReview}
                  </button>
                ) : needsActivation && <Link to="/payment?plan=personal" className="button button-secondary">{labels.payButton}</Link>}
              </div>
            </>
          )}
          <div className="profile-cover">
            <div className="profile-cover-brand">
              <span className={`profile-cover-logo ${card.companyLogo ? "has-company-logo" : ""}`}>
                {card.companyLogo ? (
                  <img src={card.companyLogo} alt="" />
                ) : (
                  (card.organization || card.fullName || "V").charAt(0)
                )}
              </span>
              <div>
                <small>{labels.digitalCard}</small>
                <strong>{card.organization || "Vizora.tj"}</strong>
              </div>
            </div>
            <span className={`profile-status ${isLocked ? "is-preview" : ""}`}>
              {isLocked ? <LockKeyhole size={13} /> : <Check size={13} />}
              {isLocked ? (needsActivation ? labels.preview : labels.pending) : labels.verified}
            </span>
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
              {!isLocked && (
                <span className="profile-verified" title={labels.verified}>
                  <Check size={15} />
                </span>
              )}
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
                  href={isLocked || !href ? undefined : href}
                  key={label}
                  className={`profile-action ${primary ? "profile-action-primary" : ""} ${isLocked || !href ? "is-disabled" : ""}`}
                  aria-disabled={isLocked || !href}
                  onClick={isLocked ? (event) => { event.preventDefault(); showToast(labels.pendingQrText); } : !href ? (event) => { event.preventDefault(); showToast(labels.missingInfo); } : undefined}
                  target={href?.startsWith("http") ? "_blank" : undefined}
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
              disabled={isLocked}
              onClick={() => isLocked ? showToast(labels.pendingQrText) : void openVCardSaveDialog(card)}
            >
              <UserPlus size={20} />
              {t("saveContact")}
            </button>

            {!card.organizationManaged && <div className="profile-lead-panel">
              <div>
                <small>{labels.quickRequest}</small>
                <strong>{labels.howHelp}</strong>
              </div>
              <div className="lead-action-grid">
                <button type="button" disabled={isLocked} onClick={() => setLeadSource("contact")}>
                  <MessageCircle size={18} /><span>{labels.write}</span>
                </button>
                <button type="button" disabled={isLocked} onClick={() => setLeadSource("callback")}>
                  <PhoneCall size={18} /><span>{labels.callback}</span>
                </button>
                <button type="button" disabled={isLocked} onClick={() => setLeadSource("request")}>
                  <ClipboardPenLine size={18} /><span>{labels.request}</span>
                </button>
              </div>
            </div>}

            <div className="profile-detail-list">
              {card.phone && (
                <a
                  href={isLocked ? undefined : `tel:${sanitizePhone(card.phone)}`}
                  aria-disabled={isLocked}
                  className={isLocked ? "is-disabled" : undefined}
                  onClick={isLocked ? (event) => { event.preventDefault(); showToast(labels.pendingQrText); } : undefined}
                >
                  <span><Phone size={18} /></span>
                  <div><small>{t("phone")}</small><strong>{card.phone}</strong></div>
                </a>
              )}
              {card.secondPhone && (
                <a
                  href={isLocked ? undefined : `tel:${sanitizePhone(card.secondPhone)}`}
                  aria-disabled={isLocked}
                  className={isLocked ? "is-disabled" : undefined}
                  onClick={isLocked ? (event) => { event.preventDefault(); showToast(labels.pendingQrText); } : undefined}
                >
                  <span><Phone size={18} /></span>
                  <div><small>{t("secondPhone")}</small><strong>{card.secondPhone}</strong></div>
                </a>
              )}
              {card.website && (
                <a
                  href={isLocked ? undefined : normalizeUrl(card.website)}
                  target={isLocked ? undefined : "_blank"}
                  rel="noreferrer"
                  aria-disabled={isLocked}
                  className={isLocked ? "is-disabled" : undefined}
                  onClick={isLocked ? (event) => { event.preventDefault(); showToast(labels.pendingQrText); } : undefined}
                >
                  <span><Globe2 size={18} /></span>
                  <div><small>{t("website")}</small><strong>{card.website.replace(/^https?:\/\//, "")}</strong></div>
                </a>
              )}
              {card.address && (
                <a
                  href={isLocked ? undefined : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.address)}`}
                  target={isLocked ? undefined : "_blank"}
                  rel="noreferrer"
                  aria-disabled={isLocked}
                  className={isLocked ? "is-disabled" : undefined}
                  onClick={isLocked ? (event) => { event.preventDefault(); showToast(labels.pendingQrText); } : undefined}
                >
                  <span><MapPin size={18} /></span>
                  <div><small>{t("address")}</small><strong>{card.address}</strong><em>{t("map")}</em></div>
                </a>
              )}
              {card.organizationManaged && !card.website && <button type="button" className="is-disabled" onClick={() => showToast(labels.missingInfo)}><span><Globe2 size={18} /></span><div><small>{t("website")}</small><strong>{labels.missingInfo}</strong></div></button>}
              {card.organizationManaged && !card.address && <button type="button" className="is-disabled" onClick={() => showToast(labels.missingInfo)}><span><MapPin size={18} /></span><div><small>{t("address")}</small><strong>{labels.missingInfo}</strong></div></button>}
            </div>

            {(card.instagram || card.facebook || card.whatsapp || card.telegram) && (
              <div className="profile-social-row">
                {card.instagram && (
                  <a href={isLocked ? undefined : socialUrl("instagram", card.instagram)} target={isLocked ? undefined : "_blank"} rel="noreferrer" aria-label="Instagram" aria-disabled={isLocked} className={isLocked ? "is-disabled" : undefined} onClick={isLocked ? (event) => { event.preventDefault(); showToast(labels.pendingQrText); } : undefined}>
                    <Instagram size={20} />
                  </a>
                )}
                {card.facebook && (
                  <a href={isLocked ? undefined : socialUrl("facebook", card.facebook)} target={isLocked ? undefined : "_blank"} rel="noreferrer" aria-label="Facebook" aria-disabled={isLocked} className={isLocked ? "is-disabled" : undefined} onClick={isLocked ? (event) => { event.preventDefault(); showToast(labels.pendingQrText); } : undefined}>
                    <Facebook size={20} />
                  </a>
                )}
                {card.whatsapp && (
                  <a href={isLocked ? undefined : `https://wa.me/${sanitizePhone(card.whatsapp).replace("+", "")}`} target={isLocked ? undefined : "_blank"} rel="noreferrer" aria-label="WhatsApp" aria-disabled={isLocked} className={isLocked ? "is-disabled" : undefined} onClick={isLocked ? (event) => { event.preventDefault(); showToast(labels.pendingQrText); } : undefined}>
                    <WhatsAppIcon size={20} />
                  </a>
                )}
                {card.telegram && (
                  <a href={isLocked ? undefined : socialUrl("telegram", card.telegram)} target={isLocked ? undefined : "_blank"} rel="noreferrer" aria-label="Telegram" aria-disabled={isLocked} className={isLocked ? "is-disabled" : undefined} onClick={isLocked ? (event) => { event.preventDefault(); showToast(labels.pendingQrText); } : undefined}>
                    <Send size={20} />
                  </a>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="profile-side">
          {isLocked ? (
            <div className="profile-qr-card profile-qr-card-locked">
              <div className="trial-qr-placeholder" aria-hidden="true">
                <LockKeyhole size={44} />
                <span>DEMO</span>
              </div>
              <h2>{needsActivation ? labels.trialQrTitle : labels.pendingQrTitle}</h2>
              <p>{needsActivation ? labels.trialQrText : labels.pendingQrText}</p>
              {needsActivation && promo?.eligible && !promo.hasEntitlement && promo.remaining > 0 && (
                <button type="button" disabled={activating} className="button button-primary mt-5 w-full" onClick={() => void claimPromo()}>
                  {activating ? labels.activating : labels.promoButton}
                </button>
              )}
              {needsActivation && promo?.hasEntitlement ? (
                <button type="button" disabled={activating} className="button button-primary mt-3 w-full" onClick={() => void submitForReview()}>
                  {activating ? labels.activating : labels.submitReview}
                </button>
              ) : needsActivation && <Link to="/payment?plan=personal" className="button button-secondary mt-3 w-full">{labels.payButton}</Link>}
            </div>
          ) : (
            <div className="profile-qr-card">
              <QRCodeImage value={cardUrl} size={210} className="mx-auto rounded-2xl" />
              <h2>{labels.qrCode}</h2>
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
                {!card.organizationManaged && <button type="button" className="button button-ghost w-full" onClick={addToWallet}>
                  <WalletCards size={17} /> {labels.addWallet}
                </button>}
              </div>
            </div>
          )}
          <Link to="/create" className="profile-powered">
            <span>{labels.createOwn}</span>
            <ArrowLeft className="rotate-180" size={17} />
          </Link>
        </aside>
      </div>

      <footer className="profile-footer">
        <span>{labels.createdOn}</span>
        <Link to="/">Vizora.tj</Link>
        {!isLocked && !card.organizationManaged && <ReportCardButton cardId={card.id} />}
      </footer>

      {toast && <div className="toast"><Check size={17} /> {toast}</div>}
      {leadSource && !card.organizationManaged && (
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

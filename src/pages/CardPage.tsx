import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  BriefcaseBusiness,
  Check,
  Download,
  Facebook,
  Globe2,
  Images,
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
  SmartphoneNfc,
  WalletCards
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { supabase } from "../lib/supabase";
import QRCodeImage from "../components/QRCode";
import BrandLogo from "../components/BrandLogo";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { cardRepository } from "../lib/cardRepository";
import { promoRepository, type LaunchPromoStatus } from "../lib/promoRepository";
import {
  downloadQrCode,
  downloadCardImage,
  openVCardSaveDialog,
  normalizeUrl,
  sanitizePhone,
  socialUrl,
  themeColors
} from "../lib/cardUtils";
import type { DigitalCard, Language } from "../types/card";
import { localizeCard } from "../lib/cardTranslations";
import LeadFormModal from "../components/LeadFormModal";
import type { Lead } from "../lib/leadRepository";
import { walletAdapter } from "../lib/wallet";
import WhatsAppIcon from "../components/icons/WhatsAppIcon";
import ReportCardButton from "../components/ReportCardButton";
import { verificationRepository } from "../lib/verificationRepository";

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
    payGateTitle: "Активируйте визитку",
    payGateText: "Визитка уже в вашем кабинете, но пока видна только вам. Бесплатные места акции закончились — выберите тариф и оплатите, чтобы визитка стала доступна всем, а QR-код и NFC заработали.",
    payGatePlans: [["personal", "Личная", 20], ["specialist", "Специалист", 50], ["pro", "PRO", 100]],
    payGatePer: "сомони / год",
    payGateLater: "Позже",
    activating: "Отправляем…",
    submitReview: "Отправить на проверку",
    pending: "ОЖИДАЕТ ПРОВЕРКИ",
    pendingText: "Визитка сохранена. Администратор проверит данные и одобрит её в ближайшее время.",
    pendingQrTitle: "QR-код появится после проверки",
    pendingQrText: "Заявка проверяется целиком. После одного решения станут доступны QR-код, ссылка и контакты.",
    fixAndResubmit: "Исправить и отправить повторно",
    missingInfo: "Информация не добавлена",
    phoneNumbers: "Номера для звонка",
    saveTitle: "Как сохранить визитку?",
    savePhone: "В контакты телефона",
    savePhoneHint: "Имя, телефоны, e-mail и фото — сразу в «Контакты»",
    contactUnsupported: "Браузер не поддерживает передачу контакта приложению. Автоматическое скачивание отключено.",
    saveImage: "Как фото визитки",
    imageSaved: "Фото визитки загружено",
    imageError: "Не удалось сохранить фото визитки.",
    close: "Закрыть",
    orderNfc: "Заказать NFC-карту",
    qrActions: "QR-код визитки"
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
    payGateTitle: "Варақаро фаъол кунед",
    payGateText: "Варақа аллакай дар кабинети шумост, вале ҳоло танҳо ба шумо намоён аст. Ҷойҳои ройгони аксия тамом шуданд — тарофаро интихоб ва пардохт кунед, то варақа ба ҳама дастрас шавад ва QR-код ва NFC кор кунанд.",
    payGatePlans: [["personal", "Шахсӣ", 20], ["specialist", "Мутахассис", 50], ["pro", "PRO", 100]],
    payGatePer: "сомонӣ / сол",
    payGateLater: "Баъдтар",
    activating: "Фиристода истодааст…",
    submitReview: "Ба санҷиш фиристодан",
    pending: "ИНТИЗОРИ САНҶИШ",
    pendingText: "Варақа нигоҳ дошта шуд. Администратор маълумотро месанҷад ва ба наздикӣ онро тасдиқ мекунад.",
    pendingQrTitle: "QR-код пас аз санҷиш пайдо мешавад",
    pendingQrText: "Дархост пурра санҷида мешавад. Пас аз як қарор QR-код, пайванд ва тамосҳо дастрас мешаванд.",
    fixAndResubmit: "Ислоҳ ва дубора фиристодан",
    missingInfo: "Маълумот илова нашудааст",
    phoneNumbers: "Рақамҳо барои занг",
    saveTitle: "Варақаро чӣ гуна нигоҳ дорем?",
    savePhone: "Ба тамосҳои телефон",
    savePhoneHint: "Ном, телефонҳо, e-mail ва сурат — рост ба «Тамосҳо»",
    contactUnsupported: "Браузер интиқоли тамосро дастгирӣ намекунад. Боргирии худкор хомӯш аст.",
    saveImage: "Ҳамчун сурати варақа",
    imageSaved: "Сурати варақа бор шуд",
    imageError: "Сурати варақаро нигоҳ дошта натавонистем.",
    close: "Пӯшидан",
    orderNfc: "Фармоиши корти NFC",
    qrActions: "QR-коди варақа"
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
    payGateTitle: "Activate your card",
    payGateText: "The card is already in your account but only you can see it. The free launch places are taken — choose a plan and pay so the card goes public and the QR code and NFC start working.",
    payGatePlans: [["personal", "Personal", 20], ["specialist", "Specialist", 50], ["pro", "PRO", 100]],
    payGatePer: "somoni / year",
    payGateLater: "Later",
    activating: "Submitting…",
    submitReview: "Submit for review",
    pending: "AWAITING REVIEW",
    pendingText: "The card has been saved. An administrator will review and approve it shortly.",
    pendingQrTitle: "QR code will appear after review",
    pendingQrText: "The complete application is under review. One decision will enable the QR code, public link and contacts.",
    fixAndResubmit: "Fix and resubmit",
    missingInfo: "Information not provided",
    phoneNumbers: "Phone numbers",
    saveTitle: "How would you like to save it?",
    savePhone: "Save to phone contacts",
    savePhoneHint: "Name, phones, e-mail and photo — straight to Contacts",
    contactUnsupported: "This browser cannot pass a contact to an app. Automatic downloads are disabled.",
    saveImage: "Download card image",
    imageSaved: "Card image downloaded",
    imageError: "Could not download the card image.",
    close: "Close",
    orderNfc: "Order an NFC card",
    qrActions: "Business card QR code"
  }
} as const;

const specialistCopy = {
  ru: { professional: "Профессиональная визитка", verified: "Проверенный специалист", pro: "Специалист PRO", about: "О специалисте", category: "Категория", specialty: "Специальность", city: "Город", experience: "Опыт", serviceArea: "География работы", consultation: "Формат консультации", services: "Услуги и направления", portfolio: "Портфолио" },
  tj: { professional: "Варақаи касбӣ", verified: "Мутахассиси тасдиқшуда", pro: "Мутахассиси PRO", about: "Дар бораи мутахассис", category: "Категория", specialty: "Ихтисос", city: "Шаҳр", experience: "Таҷриба", serviceArea: "Минтақаи кор", consultation: "Намуди машварат", services: "Хизматҳо ва самтҳо", portfolio: "Портфолио" },
  en: { professional: "Professional business card", verified: "Verified specialist", pro: "Specialist PRO", about: "About the specialist", category: "Category", specialty: "Specialty", city: "City", experience: "Experience", serviceArea: "Service area", consultation: "Consultation format", services: "Services and expertise", portfolio: "Portfolio" }
} as const;

export default function CardPage() {
  const pageRef = useRef<HTMLElement>(null);
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const { t, language, setLanguage, theme, toggleTheme } = useApp();
  const { user } = useAuth();
  const [toast, setToast] = useState("");
  const navigate = useNavigate();
  const [group, setGroup] = useState<{ slug: string; card_position: string; full_name: string }[]>([]);
  useEffect(() => {
    let alive = true;
    if (!supabase || !slug) return;
    void supabase.rpc("get_card_group", { p_slug: slug }).then(({ data }) => {
      if (alive) setGroup(Array.isArray(data) && data.length > 1 ? (data as { slug: string; card_position: string; full_name: string }[]) : []);
    });
    return () => { alive = false; };
  }, [slug]);
  const [rawCard, setRawCard] = useState<DigitalCard | undefined>(() =>
    cardRepository.getBySlug(slug)
  );
  const card = useMemo(() => (rawCard ? localizeCard(rawCard, language) : undefined), [rawCard, language]);
  const [loading, setLoading] = useState(!card);
  const [leadSource, setLeadSource] = useState<Lead["source"] | null>(null);
  const [promo, setPromo] = useState<LaunchPromoStatus | null>(null);
  const [payGateClosed, setPayGateClosed] = useState(false);
  const [activating, setActivating] = useState(false);
  const [professionCategoryName, setProfessionCategoryName] = useState("");
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [contactSaveError, setContactSaveError] = useState("");
  const [savingImage, setSavingImage] = useState(false);
  const cardUrl = `${window.location.origin}/${slug}`;
  const labels = profileCopy[language];
  const professionalLabels = specialistCopy[language];

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      setRawCard(undefined);
      setLoading(false);
    }, 12000);
    setLoading(true);
    void cardRepository.getPublicBySlug(slug)
      .then((result) => {
        if (active) setRawCard(result);
      })
      .catch(() => {
        if (active) setRawCard(undefined);
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
    // A visitor's own language choice wins; the card's language is only the default.
    let chosen: Language | null = null;
    try {
      const stored = localStorage.getItem("vizora.cardLanguage");
      if (stored === "ru" || stored === "tj" || stored === "en") chosen = stored;
    } catch { /* storage can be unavailable */ }
    setLanguage(chosen ?? card.language);
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

  const isSpecialistView = searchParams.get("profile") === "specialist" && Boolean(card?.specialistTitle);

  useEffect(() => {
    if (!isSpecialistView || !card?.professionCategoryId) { setProfessionCategoryName(""); return; }
    let active = true;
    void verificationRepository.categories(language).then((categories) => {
      if (active) setProfessionCategoryName(categories.find((item) => item.id === card.professionCategoryId)?.name ?? "");
    }).catch(() => { if (active) setProfessionCategoryName(""); });
    return () => { active = false; };
  }, [card?.professionCategoryId, isSpecialistView, language]);

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
  const pendingClaim = Boolean(card.pendingClaim);
  const isLocked = card.reviewStatus !== "approved" || pendingClaim;
  const needsActivation = card.reviewStatus === "draft" && !pendingClaim;
  const claimCopy = card.language === "tj"
    ? { mark: "ФАЪОЛ НЕСТ", t: "Визитка ҳоло фаъол нест", d: "Агар ин визиткаи шумост — пайвандеро, ки ба WhatsApp фиристодем, кушоед ва номнавис шавед. Пас аз номнависӣ визитка ва QR-код барои ҳама кор мекунанд.", b: "Номнавис шудан", l: "Ворид шудан", qr: "QR-код пас аз номнависӣ кор мекунад" }
    : card.language === "en"
      ? { mark: "NOT ACTIVE", t: "This card is not active yet", d: "If this is your card, open the link we sent you on WhatsApp and sign up. After that the card and its QR code work for everyone.", b: "Sign up", l: "Log in", qr: "QR code works after sign-up" }
      : { mark: "НЕ АКТИВИРОВАНА", t: "Визитка ещё не активирована", d: "Если это ваша визитка — откройте ссылку, которую мы отправили вам в WhatsApp, и зарегистрируйтесь. После регистрации визитка и QR-код заработают для всех.", b: "Зарегистрироваться", l: "Войти", qr: "QR-код заработает после регистрации" };
  const payGateKey = `vizora-paygate-${card.id}`;
  const showPayGate = needsActivation && promo !== null && !promo.hasEntitlement && !(promo.eligible && promo.remaining > 0) && !payGateClosed && (() => { try { return !sessionStorage.getItem(payGateKey); } catch { return true; } })();
  const closePayGate = () => { try { sessionStorage.setItem(payGateKey, "1"); } catch { /* ignore */ } setPayGateClosed(true); };
  const needsCorrection = card.reviewStatus === "changes_requested" || card.reviewStatus === "rejected";
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
      setRawCard((current) => (current ? { ...current, reviewStatus: "pending", trialExpiresAt: null } : current));
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
      if (result.ok) setRawCard((current) => (current ? { ...current, reviewStatus: "pending", trialExpiresAt: null } : current));
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

  const phoneNumbers = Array.from(new Set([card.phone, card.secondPhone].map((phone) => phone.trim()).filter(Boolean)));
  const phoneAction = phoneNumbers.length === 1 ? `tel:${sanitizePhone(phoneNumbers[0])}` : undefined;

  const saveAsImage = async () => {
    setSavingImage(true);
    try {
      if (!pageRef.current) throw new Error("Card is not ready");
      await downloadCardImage(card, pageRef.current);
      setShowSaveDialog(false);
      showToast(labels.imageSaved);
    } catch {
      setContactSaveError(labels.imageError);
    } finally {
      setSavingImage(false);
    }
  };

  const renderCardLanguageSwitch = (className: string) => (
    <div className={className} role="group" aria-label={t("cardLanguage")}>
      {([
        ["ru", "🇷🇺", "Русский"],
        ["tj", "🇹🇯", "Тоҷикӣ"],
        ["en", "🇬🇧", "English"]
      ] as [Language, string, string][]).map(([code, flag, name]) => (
        <button
          key={code}
          type="button"
          className={language === code ? "is-active" : ""}
          aria-pressed={language === code}
          aria-label={name}
          title={name}
          onClick={() => chooseCardLanguage(code)}
        >
          <span aria-hidden="true">{flag}</span>
          <b>{code.toUpperCase()}</b>
        </button>
      ))}
    </div>
  );

  const chooseCardLanguage = (code: Language) => {
    setLanguage(code);
    try { localStorage.setItem("vizora.cardLanguage", code); } catch { /* keep the card usable */ }
  };

  return (
    <main ref={pageRef} className={`profile-page profile-${card.template} ${isLocked ? "profile-trial" : ""}`} style={style}>
      <div className="profile-background-shape" />
      {group.length > 1 && (
        <nav className="card-group-switch" aria-label="Visit cards">
          {group.map((g) => (
            <button key={g.slug} type="button" className={g.slug === card.slug ? "on" : ""} onClick={() => g.slug !== card.slug && navigate(`/${g.slug}`, { replace: true })}>
              {g.card_position || g.full_name}
            </button>
          ))}
        </nav>
      )}
      <header className="profile-toolbar">
        <Link to="/" className="profile-brand">
          <BrandLogo light />
        </Link>
        <div className="flex items-center gap-2">
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
          <div className="profile-ambient" aria-hidden="true"><i /><i /><i /><span /><span /><span /></div>
          {showPayGate && (
            <div className="paygate-back" onClick={closePayGate}>
              <div className="paygate" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="paygate-icon" aria-hidden="true">🔒</div>
                <h2>{labels.payGateTitle}</h2>
                <p>{labels.payGateText}</p>
                <div className="paygate-plans">
                  {(labels.payGatePlans as readonly (readonly [string, string, number])[]).map(([key, name, price]) => (
                    <Link key={key} to={`/payment?plan=${key}`} className={key === "specialist" ? "on" : ""}>
                      <b>{name}</b><span>{price} {labels.payGatePer}</span>
                    </Link>
                  ))}
                </div>
                <button type="button" className="paygate-later" onClick={closePayGate}>{labels.payGateLater}</button>
              </div>
            </div>
          )}
          {isLocked && (
            <>
              <div className="trial-watermark" aria-hidden="true">{pendingClaim ? claimCopy.mark : needsActivation ? labels.trial : labels.pending}</div>
              {pendingClaim ? (
                <div className="trial-countdown claim-countdown" role="status">
                  <strong>{claimCopy.t}</strong>
                  <span>{claimCopy.d}</span>
                  <Link to="/register" className="button button-primary">{claimCopy.b}</Link>
                  <Link to="/login" className="button button-secondary">{claimCopy.l}</Link>
                </div>
              ) : (
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
                {needsCorrection && <Link to={`/create?edit=${card.id}`} className="button button-primary">{labels.fixAndResubmit}</Link>}
              </div>
              )}
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
                <small>{isSpecialistView ? professionalLabels.professional : labels.digitalCard}</small>
                <strong>{card.organization || "Vizora.tj"}</strong>
              </div>
            </div>
            <div className="profile-cover-end">
              {renderCardLanguageSwitch("card-lang-switch card-lang-cover")}
              {isLocked ? (
                <span className="profile-status is-preview">
                  <LockKeyhole size={13} />
                  {pendingClaim ? claimCopy.mark : needsActivation ? labels.preview : labels.pending}
                </span>
              ) : (
                <span className="profile-verified-badge" role="img" aria-label={labels.verified} title={labels.verified}>
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </div>
          </div>
          <div className="profile-content">
            <div className="profile-hero">
              <div className="profile-hero-art" aria-hidden="true"><i /><i /><i /><span /><span /></div>
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
              <p className="profile-role">{isSpecialistView ? card.specialistTitle : card.position}</p>
              {card.organization && (
                <p className="profile-company">
                  <Building2 size={16} /> {card.organization}
                </p>
              )}
            </div>
            </div>

            {(isSpecialistView ? card.specialistSummary : card.description) && (
              <p className="profile-description">{isSpecialistView ? card.specialistSummary : card.description}</p>
            )}

            {isSpecialistView && <section className="profile-specialist-panel">
              <header><div><small>{professionalLabels.professional}</small><h2>{professionalLabels.about}</h2></div><span>{card.specialistPlan === "pro" ? "PRO" : "VERIFIED"}</span></header>
              <div className="profile-specialist-facts">
                {professionCategoryName && <div><span><BriefcaseBusiness size={18} /></span><small>{professionalLabels.category}</small><strong>{professionCategoryName}</strong></div>}
                {card.specialistTitle && <div><span><BriefcaseBusiness size={18} /></span><small>{professionalLabels.specialty}</small><strong>{card.specialistTitle}</strong></div>}
                {card.specialistCity && <div><span><MapPin size={18} /></span><small>{professionalLabels.city}</small><strong>{card.specialistCity}</strong></div>}
                {card.specialistExperience && <div><span><Check size={18} /></span><small>{professionalLabels.experience}</small><strong>{card.specialistExperience}</strong></div>}
                {card.specialistServiceArea && <div><span><Globe2 size={18} /></span><small>{professionalLabels.serviceArea}</small><strong>{card.specialistServiceArea}</strong></div>}
                {card.specialistConsultation && <div><span><MessageCircle size={18} /></span><small>{professionalLabels.consultation}</small><strong>{card.specialistConsultation}</strong></div>}
              </div>
              {!!card.specialistTags?.length && <div className="profile-specialist-tags"><small>{professionalLabels.services}</small><div>{card.specialistTags.map((tag) => <span key={tag}>{tag}</span>)}</div></div>}
            </section>}

            <div className="profile-social-row profile-social-primary">
              <a href={isLocked || !card.telegram ? undefined : socialUrl("telegram", card.telegram)} target={card.telegram ? "_blank" : undefined} rel="noreferrer" aria-label="Telegram" className={isLocked || !card.telegram ? "is-disabled" : undefined} onClick={!card.telegram ? (event) => { event.preventDefault(); showToast(labels.missingInfo); } : undefined}><Send size={26} /></a>
              <a href={isLocked || !card.whatsapp ? undefined : `https://wa.me/${sanitizePhone(card.whatsapp).replace("+", "")}`} target={card.whatsapp ? "_blank" : undefined} rel="noreferrer" aria-label="WhatsApp" className={isLocked || !card.whatsapp ? "is-disabled" : undefined} onClick={!card.whatsapp ? (event) => { event.preventDefault(); showToast(labels.missingInfo); } : undefined}><WhatsAppIcon size={26} /></a>
              <a href={isLocked || !card.instagram ? undefined : socialUrl("instagram", card.instagram)} target={card.instagram ? "_blank" : undefined} rel="noreferrer" aria-label="Instagram" className={isLocked || !card.instagram ? "is-disabled" : undefined} onClick={!card.instagram ? (event) => { event.preventDefault(); showToast(labels.missingInfo); } : undefined}><Instagram size={26} /></a>
              <a href={isLocked || !card.facebook ? undefined : socialUrl("facebook", card.facebook)} target={card.facebook ? "_blank" : undefined} rel="noreferrer" aria-label="Facebook" className={isLocked || !card.facebook ? "is-disabled" : undefined} onClick={!card.facebook ? (event) => { event.preventDefault(); showToast(labels.missingInfo); } : undefined}><Facebook size={26} /></a>
            </div>

            <div className="profile-contact-actions">
              {phoneNumbers.length > 0 && (phoneAction ? (
                <a href={isLocked ? undefined : phoneAction} aria-label={t("call")} className="profile-contact-action"><Phone size={24} /><span>{t("call")}</span></a>
              ) : (
                <button type="button" disabled={isLocked} onClick={() => setShowPhoneDialog(true)} className="profile-contact-action"><Phone size={24} /><span>{t("call")}</span><em>{phoneNumbers.length}</em></button>
              ))}
              {card.email && <a href={isLocked ? undefined : `mailto:${card.email}`} aria-label="E-mail" className="profile-contact-action"><Mail size={24} /><span>E-mail</span></a>}
              {card.website && <a href={isLocked ? undefined : normalizeUrl(card.website)} target="_blank" rel="noreferrer" aria-label={t("website")} className="profile-contact-action"><Globe2 size={24} /><span>{t("website")}</span></a>}
              {card.address && <a href={isLocked ? undefined : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.address)}`} target="_blank" rel="noreferrer" aria-label={t("address")} className="profile-contact-action"><MapPin size={24} /><span>{t("address")}</span></a>}
            </div>

            <button type="button" className="profile-save-button" disabled={isLocked} onClick={() => isLocked ? showToast(labels.pendingQrText) : setShowSaveDialog(true)}>
              <UserPlus size={20} />{t("saveContact")}
            </button>

            {pendingClaim && <section className="profile-mobile-tools claim-qr-locked" aria-label={labels.qrActions}>
              <div className="profile-mobile-qr"><QRCodeImage value={cardUrl} size={116} /><i aria-hidden="true">🔒</i></div>
              <div className="claim-qr-text"><strong>{claimCopy.qr}</strong><Link to="/register" className="button button-primary">{claimCopy.b}</Link></div>
            </section>}

            {!isLocked && <section className="profile-mobile-tools" aria-label={labels.qrActions}>
              <div className="profile-mobile-qr">
                <QRCodeImage value={cardUrl} size={116} />
              </div>
              <div className="profile-mobile-qr-actions">
                <button type="button" onClick={copyLink}><Share2 size={20} /><span>{t("copyLink")}</span></button>
                <button type="button" onClick={() => downloadQrCode(cardUrl, card.slug)}><Download size={20} /><span>{t("downloadQr")}</span></button>
              </div>
              <Link className="profile-nfc-button" to="/services/nfc-cards">
                <SmartphoneNfc size={22} /><span>{labels.orderNfc}</span>
              </Link>
            </section>}

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


            {isSpecialistView && !!card.specialistPortfolio?.length && <section className="profile-specialist-portfolio">
              <header><Images size={19} /><h2>{professionalLabels.portfolio}</h2><span>{card.specialistPortfolio.length}</span></header>
              <div>{card.specialistPortfolio.map((image, index) => <a href={image} target="_blank" rel="noreferrer" key={`${image}-${index}`}><img src={image} alt={`${professionalLabels.portfolio} ${index + 1}`} loading="lazy" /></a>)}</div>
            </section>}
          </div>
        </section>

        <aside className="profile-side">
          {isLocked ? (
            <div className="profile-qr-card profile-qr-card-locked">
              <div className="trial-qr-placeholder" aria-hidden="true">
                <LockKeyhole size={44} />
                <span>DEMO</span>
              </div>
              <h2>{pendingClaim ? claimCopy.t : needsActivation ? labels.trialQrTitle : labels.pendingQrTitle}</h2>
              <p>{pendingClaim ? claimCopy.d : needsActivation ? labels.trialQrText : labels.pendingQrText}</p>
              {pendingClaim && <Link to="/register" className="button button-primary mt-5 w-full">{claimCopy.b}</Link>}
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
              {needsCorrection && <Link to={`/create?edit=${card.id}`} className="button button-primary mt-3 w-full">{labels.fixAndResubmit}</Link>}
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
      {showPhoneDialog && (
        <div className="profile-dialog-backdrop" role="presentation" onMouseDown={() => setShowPhoneDialog(false)}>
          <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="phone-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="phone-dialog-title">{labels.phoneNumbers}</h2>
            <div className="profile-dialog-options">
              {phoneNumbers.map((phone, index) => (
                <a href={`tel:${sanitizePhone(phone)}`} key={phone} onClick={() => setShowPhoneDialog(false)}>
                  <span><Phone size={22} /></span><div><small>{index === 0 ? t("phone") : t("secondPhone")}</small><strong>{phone}</strong></div>
                </a>
              ))}
            </div>
            <button type="button" className="profile-dialog-cancel" onClick={() => setShowPhoneDialog(false)}>{labels.close}</button>
          </section>
        </div>
      )}
      {showSaveDialog && (
        <div className="profile-dialog-backdrop" role="presentation" onMouseDown={() => setShowSaveDialog(false)}>
          <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="save-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
            <h2 id="save-dialog-title">{labels.saveTitle}</h2>
            <div className="profile-dialog-options">
              <button type="button" onClick={() => { setContactSaveError(""); if (card.reviewStatus === "approved" && !pendingClaim) { window.location.href = `/vcard/${encodeURIComponent(card.slug)}.vcf`; return; } void openVCardSaveDialog(card).then((supported) => { if (!supported) setContactSaveError(labels.contactUnsupported); }).catch(() => setContactSaveError(labels.contactUnsupported)); }}>
                <span><UserPlus size={22} /></span><div><strong>{labels.savePhone}</strong><small>{labels.savePhoneHint}</small></div>
              </button>
              <button type="button" disabled={savingImage} onClick={() => void saveAsImage()}>
                <span><Images size={22} /></span><div><strong>{labels.saveImage}</strong><small>PNG · 9:16 · 1080 × 1920</small></div>
              </button>
            </div>
            {contactSaveError && <p role="status">{contactSaveError}</p>}
            <button type="button" className="profile-dialog-cancel" onClick={() => setShowSaveDialog(false)}>{labels.close}</button>
          </section>
        </div>
      )}
    </main>
  );
}

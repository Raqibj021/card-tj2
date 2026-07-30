import {
  ArrowLeft,
  ArrowRight,
  AtSign,
  BriefcaseBusiness,
  Building2,
  Camera,
  Check,
  Globe2,
  ImagePlus,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  Palette,
  Phone,
  Save,
  ShieldCheck,
  Trash2,
  UserRound
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import CardPreview from "../components/CardPreview";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { emptyCard } from "../data/demo";
import { cardRepository } from "../lib/cardRepository";
import { createSlug, themeColors } from "../lib/cardUtils";
import type {
  CardDraft,
  CardTemplate,
  CardTheme,
  DigitalCard,
  Language
} from "../types/card";
import WhatsAppIcon from "../components/icons/WhatsAppIcon";

type FormErrors = Partial<Record<keyof CardDraft, string>>;

const NAME_PATTERN = /^[\p{L}][\p{L}'’ʼ-]{1,}(?:\s+[\p{L}][\p{L}'’ʼ-]{1,})+$/u;
const PHONE_CHARACTERS = /^[+\d\s()-]+$/;
const SOCIAL_PATTERN = /^(?:https?:\/\/)?(?:www\.)?[\w.-]+(?:\/[\w.@+-]*)*\/?$|^@?[a-zA-Z0-9._-]{3,}$/;

const normalizePhoneInput = (value: string) =>
  value.replace(/[^\d+()\s-]/g, "").replace(/(?!^)\+/g, "");

const isValidTajikPhone = (value: string) => {
  if (!PHONE_CHARACTERS.test(value.trim())) return false;
  const digits = value.replace(/\D/g, "");
  return /^992\d{9}$/.test(digits) && !/^992(\d)\1{8}$/.test(digits);
};

const isValidWebsite = (value: string) => {
  try {
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(candidate);
    return Boolean(url.hostname.includes(".") && !/\s/.test(value));
  } catch {
    return false;
  }
};

interface FieldProps {
  label: string;
  icon: ReactNode;
  error?: string;
  children: ReactNode;
  hint?: string;
}

function Field({ label, icon, error, children, hint }: FieldProps) {
  return (
    <label className="form-field">
      <span className="form-label">
        {icon}
        {label}
      </span>
      {children}
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error && <span className="form-error">{error}</span>}
    </label>
  );
}

const compressImage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxSize = 720;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("Canvas unavailable"));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.84));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

export default function CreatePage() {
  const { t, language, setLanguage } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit") ?? "";
  const existing = useMemo(
    () => (editId ? cardRepository.getById(editId) : undefined),
    [editId]
  );
  const [form, setForm] = useState<CardDraft>(() =>
    existing
      ? {
          slug: existing.slug,
          photo: existing.photo,
          companyLogo: existing.companyLogo ?? "",
          fullName: existing.fullName,
          position: existing.position,
          organization: existing.organization,
          description: existing.description,
          phone: existing.phone,
          secondPhone: existing.secondPhone,
          whatsapp: existing.whatsapp,
          telegram: existing.telegram,
          instagram: existing.instagram,
          facebook: existing.facebook,
          email: existing.email,
          website: existing.website,
          address: existing.address,
          language: existing.language,
          theme: existing.theme,
          template: existing.template
        }
      : emptyCard
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [accountCard, setAccountCard] = useState<DigitalCard | null>(null);
  const [checkingCard, setCheckingCard] = useState(Boolean(user));
  const [slugTouched, setSlugTouched] = useState(Boolean(existing));
  const fileInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const builderCopy = {
    ru: {
      invalidImage: "Выберите файл изображения", imageFailed: "Не удалось обработать изображение",
      profileHint: "Основные данные вашего профиля", companyLogo: "Логотип компании", companyLogoHint: "Отдельный логотип для верхней части визитки", uploadLogo: "Загрузить логотип",
      namePlaceholder: "Фируз Саидов", positionPlaceholder: "Руководитель", companyPlaceholder: "Название компании",
      descriptionPlaceholder: "Расскажите коротко о своей работе и преимуществах...", contactsHint: "Добавьте удобные способы связи",
      addressPlaceholder: "Душанбе, проспект Рӯдакӣ, 1", socialHint: "Укажите ссылку или имя пользователя",
      designHint: "Подберите оформление под свой образ", saving: "Сохранение...",
      previewHint: "Предпросмотр обновляется автоматически. На телефоне визитка откроется на весь экран.",
      invalidName: "Введите имя и фамилию буквами, например: Фируз Саидов.",
      invalidPosition: "Укажите настоящую должность (минимум 2 буквы).",
      invalidOrganization: "Укажите место работы или название организации.",
      invalidPhone: "Введите полный номер: +992 и 9 цифр номера.",
      invalidWebsite: "Введите корректный сайт, например: example.tj.",
      invalidSocial: "Введите корректное имя пользователя или ссылку.",
      invalidAddress: "Введите корректный адрес (минимум 5 символов)."
    },
    tj: {
      invalidImage: "Файли тасвирро интихоб кунед", imageFailed: "Коркарди тасвир муяссар нашуд",
      profileHint: "Маълумоти асосии профили шумо", companyLogo: "Логотипи ширкат", companyLogoHint: "Логотипи алоҳида барои қисми болоии варақа", uploadLogo: "Бор кардани логотип",
      namePlaceholder: "Фирӯз Саидов", positionPlaceholder: "Роҳбар", companyPlaceholder: "Номи ширкат",
      descriptionPlaceholder: "Дар бораи фаъолият ва афзалиятҳои худ кӯтоҳ нависед...", contactsHint: "Роҳҳои муносиби тамосро илова кунед",
      addressPlaceholder: "Душанбе, хиёбони Рӯдакӣ, 1", socialHint: "Пайванд ё номи корбарро ворид кунед",
      designHint: "Ороишро мувофиқи симои худ интихоб кунед", saving: "Нигоҳдорӣ...",
      previewHint: "Пешнамоиш худкор нав мешавад. Дар телефон варақа дар тамоми экран кушода мешавад.",
      invalidName: "Ном ва насабро бо ҳарфҳо нависед, масалан: Фирӯз Саидов.",
      invalidPosition: "Вазифаи воқеиро нависед (на кам аз 2 ҳарф).",
      invalidOrganization: "Ҷойи кор ё номи ташкилотро нависед.",
      invalidPhone: "Рақами пурраро ворид кунед: +992 ва 9 рақами телефон.",
      invalidWebsite: "Суроғаи дурусти сомонаро нависед, масалан: example.tj.",
      invalidSocial: "Номи корбар ё пайванди дурустро ворид кунед.",
      invalidAddress: "Суроғаи дурустро ворид кунед (на кам аз 5 аломат)."
    },
    en: {
      invalidImage: "Choose an image file", imageFailed: "Could not process the image",
      profileHint: "Your main profile information", companyLogo: "Company logo", companyLogoHint: "A separate logo for the top of the card", uploadLogo: "Upload logo",
      namePlaceholder: "Firuz Saidov", positionPlaceholder: "Manager", companyPlaceholder: "Company name",
      descriptionPlaceholder: "Briefly describe your work and advantages...", contactsHint: "Add convenient ways to contact you",
      addressPlaceholder: "Dushanbe, Rudaki Avenue, 1", socialHint: "Enter a link or username",
      designHint: "Choose a design that matches your image", saving: "Saving...",
      previewHint: "The preview updates automatically. On a phone, the card opens full screen.",
      invalidName: "Enter first and last name using letters, for example: Firuz Saidov.",
      invalidPosition: "Enter a real job title (at least 2 letters).",
      invalidOrganization: "Enter your workplace or organization name.",
      invalidPhone: "Enter the complete number: +992 followed by 9 digits.",
      invalidWebsite: "Enter a valid website, for example: example.tj.",
      invalidSocial: "Enter a valid username or link.",
      invalidAddress: "Enter a valid address (at least 5 characters)."
    }
  }[language];

  useEffect(() => {
    if (existing) setLanguage(existing.language);
  }, [existing, setLanguage]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setCheckingCard(false);
      return () => { active = false; };
    }
    setCheckingCard(true);
    void cardRepository.listRemote()
      .then((cards) => {
        if (active) setAccountCard(cards.find((card) => !card.id.startsWith("demo-")) ?? null);
      })
      .finally(() => {
        if (active) setCheckingCard(false);
      });
    return () => { active = false; };
  }, [user]);

  const statusCard = accountCard ?? existing ?? null;
  const shouldShowStatus =
    Boolean(statusCard) &&
    (!editId || statusCard?.reviewStatus === "pending");

  const statusCopy = {
    ru: {
      checking: "Проверяем вашу визитку…",
      pendingTitle: "Ваша визитка находится на проверке",
      pendingText: "Данные сохранены. После решения администратора уведомление появится в личном кабинете.",
      approvedTitle: "У вас уже есть одобренная визитка",
      approvedText: "Повторно создавать визитку не нужно. Откройте готовую визитку или измените существующую.",
      rejectedTitle: "Визитка отклонена",
      rejectedText: "Откройте уведомления, посмотрите причину и исправьте существующую визитку.",
      changesTitle: "Требуются исправления",
      changesText: "Администратор оставил замечания. Исправьте существующую визитку и повторно отправьте её на проверку.",
      draftTitle: "У вас уже есть сохранённая визитка",
      draftText: "Продолжите оформление существующей визитки — повторная форма не создаётся.",
      suspendedTitle: "Визитка временно заблокирована",
      suspendedText: "Подробности доступны в уведомлениях личного кабинета.",
      notifications: "Открыть уведомления",
      dashboard: "В личный кабинет",
      open: "Открыть визитку",
      edit: "Изменить визитку"
    },
    tj: {
      checking: "Варақаи шуморо месанҷем…",
      pendingTitle: "Варақаи шумо дар санҷиш аст",
      pendingText: "Маълумот нигоҳ дошта шуд. Пас аз қарори маъмур огоҳинома дар ҳисоби шахсӣ пайдо мешавад.",
      approvedTitle: "Шумо аллакай варақаи тасдиқшуда доред",
      approvedText: "Варақаи нав сохтан лозим нест. Варақаи тайёрро кушоед ё онро таҳрир кунед.",
      rejectedTitle: "Варақа рад карда шуд",
      rejectedText: "Огоҳиномаро кушоед, сабабро бинед ва варақаи мавҷударо ислоҳ кунед.",
      changesTitle: "Ислоҳ талаб мешавад",
      changesText: "Маъмур шарҳ гузошт. Варақаро ислоҳ карда, дубора ба санҷиш фиристед.",
      draftTitle: "Шумо аллакай варақаи нигоҳдошташуда доред",
      draftText: "Ороиши варақаи мавҷударо идома диҳед — шакли нав сохта намешавад.",
      suspendedTitle: "Варақа муваққатан баста шудааст",
      suspendedText: "Тафсилот дар огоҳиномаҳои ҳисоби шахсӣ дастрас аст.",
      notifications: "Кушодани огоҳиномаҳо",
      dashboard: "Ба ҳисоби шахсӣ",
      open: "Кушодани варақа",
      edit: "Таҳрири варақа"
    },
    en: {
      checking: "Checking your card…",
      pendingTitle: "Your card is under review",
      pendingText: "Your data is saved. A notification will appear in your dashboard after the administrator decides.",
      approvedTitle: "You already have an approved card",
      approvedText: "There is no need to create another card. Open your existing card or edit it.",
      rejectedTitle: "Card rejected",
      rejectedText: "Open notifications, review the reason and correct your existing card.",
      changesTitle: "Changes are required",
      changesText: "The administrator left comments. Correct the existing card and submit it again.",
      draftTitle: "You already have a saved card",
      draftText: "Continue your existing card — a second form will not be created.",
      suspendedTitle: "Card temporarily suspended",
      suspendedText: "Details are available in your dashboard notifications.",
      notifications: "Open notifications",
      dashboard: "Go to dashboard",
      open: "Open card",
      edit: "Edit card"
    }
  }[language];

  if (checkingCard) {
    return (
      <main className="builder-page card-status-page">
        <section className="card-status-panel">
          <span className="card-status-icon"><ShieldCheck size={30} /></span>
          <h1>{statusCopy.checking}</h1>
        </section>
      </main>
    );
  }

  if (shouldShowStatus && statusCard) {
    const status = statusCard.reviewStatus;
    const title =
      status === "pending" ? statusCopy.pendingTitle :
      status === "approved" ? statusCopy.approvedTitle :
      status === "rejected" ? statusCopy.rejectedTitle :
      status === "changes_requested" ? statusCopy.changesTitle :
      status === "suspended" ? statusCopy.suspendedTitle :
      statusCopy.draftTitle;
    const text =
      status === "pending" ? statusCopy.pendingText :
      status === "approved" ? statusCopy.approvedText :
      status === "rejected" ? statusCopy.rejectedText :
      status === "changes_requested" ? statusCopy.changesText :
      status === "suspended" ? statusCopy.suspendedText :
      statusCopy.draftText;
    const canEdit = status !== "pending" && status !== "suspended";
    return (
      <main className="builder-page card-status-page">
        <section className={`card-status-panel card-status-${status}`}>
          <span className="card-status-icon"><ShieldCheck size={30} /></span>
          <span className="section-label">
            {status === "pending"
              ? (language === "ru" ? "НА ПРОВЕРКЕ" : language === "tj" ? "ДАР САНҶИШ" : "UNDER REVIEW")
              : "VIZORA.TJ"}
          </span>
          <h1>{title}</h1>
          <p>{text}</p>
          <div className="card-status-actions">
            {status === "approved" && (
              <Link to={`/card/${statusCard.slug}`} className="button button-primary">
                {statusCopy.open}
              </Link>
            )}
            {canEdit && (
              <Link to={`/create?edit=${statusCard.id}`} className="button button-secondary">
                {statusCopy.edit}
              </Link>
            )}
            {(status === "pending" || status === "rejected" || status === "changes_requested" || status === "suspended") && (
              <Link to="/notifications" className="button button-secondary">
                {statusCopy.notifications}
              </Link>
            )}
            <Link to="/dashboard" className="button button-ghost">
              {statusCopy.dashboard}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const update = <K extends keyof CardDraft>(key: K, value: CardDraft[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const updateName = (value: string) => {
    setForm((current) => ({
      ...current,
      fullName: value,
      slug: slugTouched ? current.slug : createSlug(value)
    }));
    setErrors((current) => ({
      ...current,
      fullName: undefined,
      slug: undefined
    }));
  };

  const handleImage = async (
    event: ChangeEvent<HTMLInputElement>,
    field: "photo" | "companyLogo"
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({ ...current, [field]: builderCopy.invalidImage }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((current) => ({ ...current, [field]: t("photoLarge") }));
      return;
    }
    try {
      update(field, await compressImage(file));
    } catch {
      setErrors((current) => ({
        ...current,
        [field]: builderCopy.imageFailed
      }));
    }
  };

  const validate = () => {
    const next: FormErrors = {};
    if (!form.fullName.trim()) next.fullName = t("required");
    else if (!NAME_PATTERN.test(form.fullName.trim())) next.fullName = builderCopy.invalidName;
    if (!form.position.trim()) next.position = t("required");
    else if ((form.position.match(/\p{L}/gu) ?? []).length < 2) next.position = builderCopy.invalidPosition;
    if (!form.organization.trim()) next.organization = t("required");
    else if ((form.organization.match(/[\p{L}\d]/gu) ?? []).length < 2) next.organization = builderCopy.invalidOrganization;
    if (!form.phone.trim()) next.phone = t("required");
    else if (!isValidTajikPhone(form.phone)) next.phone = builderCopy.invalidPhone;
    if (form.secondPhone && !isValidTajikPhone(form.secondPhone)) next.secondPhone = builderCopy.invalidPhone;
    if (form.whatsapp && !isValidTajikPhone(form.whatsapp)) next.whatsapp = builderCopy.invalidPhone;
    if (!form.slug.trim()) {
      next.slug = t("required");
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug)) {
      next.slug = t("slugHint");
    } else {
      const duplicate = cardRepository.getBySlug(form.slug);
      if (duplicate && duplicate.id !== existing?.id) next.slug = t("slugTaken");
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = t("invalidEmail");
    }
    if (form.website && !isValidWebsite(form.website)) next.website = builderCopy.invalidWebsite;
    if (form.address && form.address.trim().length < 5) next.address = builderCopy.invalidAddress;
    (["telegram", "instagram", "facebook"] as const).forEach((network) => {
      if (form[network] && !SOCIAL_PATTERN.test(form[network].trim())) {
        next[network] = builderCopy.invalidSocial;
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      requestAnimationFrame(() =>
        document
          .querySelector(".form-error")
          ?.closest("label")
          ?.scrollIntoView({ behavior: "smooth", block: "center" })
      );
      return;
    }
    setSaving(true);
    try {
      const card = cardRepository.save(form, existing?.id);
      navigate(`/card/${card.slug}`);
    } finally {
      setSaving(false);
    }
  };

  const templates: Array<{
    id: CardTemplate;
    title: string;
    detail: string;
  }> = language === "tj"
    ? [
        { id: "executive", title: "Расмӣ", detail: "Қисми болоии торик ва мавҷи нарм" },
        { id: "minimal", title: "Технологӣ", detail: "Услуби торик бо рангҳои неонӣ" },
        { id: "creative", title: "Меъморӣ", detail: "Услуби равшан бо хати фирмавӣ" }
      ]
    : language === "en"
      ? [
          { id: "executive", title: "Executive", detail: "Dark header with a smooth wave" },
          { id: "minimal", title: "Technology", detail: "Dark style with neon accents" },
          { id: "creative", title: "Architectural", detail: "Light style with a brand stripe" }
        ]
      : [
          { id: "executive", title: "Деловой", detail: "Тёмный верх и плавная волна" },
          { id: "minimal", title: "Технологичный", detail: "Тёмный неоновый стиль" },
          { id: "creative", title: "Архитектурный", detail: "Светлый стиль с фирменной полосой" }
        ];

  return (
    <main className="builder-page pb-20">
      <section className="builder-header">
        <div className="site-container py-10 md:py-14">
          <Link to="/dashboard" className="back-link">
            <ArrowLeft size={17} /> {t("dashboard")}
          </Link>
          <div className="mt-6 max-w-2xl">
            <span className="section-label">{t("builderEyebrow")}</span>
            <h1 className="page-title">
              {existing ? t("editTitle") : t("builderTitle")}
            </h1>
            <p className="page-copy">{t("builderText")}</p>
          </div>
        </div>
      </section>

      <div className="site-container mt-8 grid items-start gap-8 xl:grid-cols-[minmax(0,1.08fr)_minmax(400px,.92fr)]">
        <form onSubmit={submit} className="grid gap-6" noValidate>
          <section className="form-section">
            <div className="form-section-title">
              <span><UserRound size={19} /></span>
              <div><h2>{t("formProfile")}</h2><p>{builderCopy.profileHint}</p></div>
            </div>

            <div className="photo-upload">
              <div className="photo-upload-preview">
                {form.photo ? (
                  <img src={form.photo} alt="" />
                ) : (
                  <Camera size={25} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t("photo")}</p>
                <p className="form-hint mt-1">{t("imageHint")}</p>
                {errors.photo && <p className="form-error mt-1">{errors.photo}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="button button-secondary !min-h-9 !px-3 !text-xs"
                    onClick={() => fileInput.current?.click()}
                  >
                    <ImagePlus size={16} /> {t("uploadPhoto")}
                  </button>
                  {form.photo && (
                    <button
                      type="button"
                      className="button button-ghost !min-h-9 !px-3 !text-xs text-red-600"
                      onClick={() => update("photo", "")}
                    >
                      <Trash2 size={15} /> {t("delete")}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInput}
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => handleImage(event, "photo")}
                />
              </div>
            </div>

            <div className="photo-upload company-logo-upload">
              <div className="photo-upload-preview">
                {form.companyLogo ? (
                  <img src={form.companyLogo} alt="" />
                ) : (
                  <Building2 size={25} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{builderCopy.companyLogo}</p>
                <p className="form-hint mt-1">{builderCopy.companyLogoHint}</p>
                {errors.companyLogo && <p className="form-error mt-1">{errors.companyLogo}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="button button-secondary !min-h-9 !px-3 !text-xs"
                    onClick={() => logoInput.current?.click()}
                  >
                    <ImagePlus size={16} /> {builderCopy.uploadLogo}
                  </button>
                  {form.companyLogo && (
                    <button
                      type="button"
                      className="button button-ghost !min-h-9 !px-3 !text-xs text-red-600"
                      onClick={() => update("companyLogo", "")}
                    >
                      <Trash2 size={15} /> {t("delete")}
                    </button>
                  )}
                </div>
                <input
                  ref={logoInput}
                  className="sr-only"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => handleImage(event, "companyLogo")}
                />
              </div>
            </div>

            <div className="form-grid">
              <Field
                label={`${t("fullName")} *`}
                icon={<UserRound size={16} />}
                error={errors.fullName}
              >
                <input
                  className="form-input"
                  value={form.fullName}
                  onChange={(event) => updateName(event.target.value)}
                  placeholder={builderCopy.namePlaceholder}
                  autoComplete="name"
                />
              </Field>
              <Field
                label={`${t("position")} *`}
                icon={<BriefcaseBusiness size={16} />}
                error={errors.position}
              >
                <input
                  className="form-input"
                  value={form.position}
                  onChange={(event) => update("position", event.target.value)}
                  placeholder={builderCopy.positionPlaceholder}
                />
              </Field>
              <Field
                label={`${t("organization")} *`}
                icon={<Building2 size={16} />}
                error={errors.organization}
              >
                <input
                  className="form-input"
                  value={form.organization}
                  onChange={(event) => update("organization", event.target.value)}
                  placeholder={builderCopy.companyPlaceholder}
                />
              </Field>
              <Field
                label={t("slug")}
                icon={<Link2 size={16} />}
                error={errors.slug}
                hint={t("slugHint")}
              >
                <div className="slug-input">
                  <span>card.tj/</span>
                  <input
                    value={form.slug}
                    onChange={(event) => {
                      setSlugTouched(true);
                      update("slug", createSlug(event.target.value));
                    }}
                    placeholder="firuz"
                    autoCapitalize="none"
                  />
                </div>
              </Field>
            </div>
            <Field label={t("description")} icon={<AtSign size={16} />}>
              <textarea
                className="form-input min-h-28 resize-y"
                value={form.description}
                maxLength={240}
                onChange={(event) => update("description", event.target.value)}
                placeholder={builderCopy.descriptionPlaceholder}
              />
              <span className="form-counter">{form.description.length}/240</span>
            </Field>
          </section>

          <section className="form-section">
            <div className="form-section-title">
              <span><Phone size={19} /></span>
              <div><h2>{t("formContacts")}</h2><p>{builderCopy.contactsHint}</p></div>
            </div>
            <div className="form-grid">
              <Field
                label={`${t("phone")} *`}
                icon={<Phone size={16} />}
                error={errors.phone}
              >
                <input
                  className="form-input"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(event) => update("phone", normalizePhoneInput(event.target.value))}
                  placeholder="+992 00 000 00 00"
                  autoComplete="tel"
                />
              </Field>
              <Field label={t("secondPhone")} icon={<Phone size={16} />} error={errors.secondPhone}>
                <input
                  className="form-input"
                  type="tel"
                  inputMode="tel"
                  value={form.secondPhone}
                  onChange={(event) => update("secondPhone", normalizePhoneInput(event.target.value))}
                  placeholder="+992 00 000 00 00"
                />
              </Field>
              <Field label={t("whatsapp")} icon={<WhatsAppIcon size={16} />} error={errors.whatsapp}>
                <input
                  className="form-input"
                  type="tel"
                  inputMode="tel"
                  value={form.whatsapp}
                  onChange={(event) => update("whatsapp", normalizePhoneInput(event.target.value))}
                  placeholder="+992000000000"
                />
              </Field>
              <Field label={t("email")} icon={<Mail size={16} />} error={errors.email}>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="name@company.tj"
                  autoComplete="email"
                />
              </Field>
              <Field label={t("address")} icon={<MapPin size={16} />} error={errors.address}>
                <input
                  className="form-input"
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                  placeholder={builderCopy.addressPlaceholder}
                  autoComplete="street-address"
                />
              </Field>
              <Field label={t("website")} icon={<Globe2 size={16} />} error={errors.website}>
                <input
                  className="form-input"
                  type="url"
                  value={form.website}
                  onChange={(event) => update("website", event.target.value)}
                  placeholder="https://example.tj"
                  autoCapitalize="none"
                />
              </Field>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-title">
              <span><MessageCircle size={19} /></span>
              <div><h2>{t("formSocial")}</h2><p>{builderCopy.socialHint}</p></div>
            </div>
            <div className="form-grid">
              {(["telegram", "instagram", "facebook"] as const).map((network) => (
                <Field
                  key={network}
                  label={t(network)}
                  icon={<AtSign size={16} />}
                  error={errors[network]}
                >
                  <input
                    className="form-input"
                    value={form[network]}
                    onChange={(event) => update(network, event.target.value)}
                    placeholder={network === "telegram" ? "@username" : "@profile"}
                    autoCapitalize="none"
                  />
                </Field>
              ))}
            </div>
          </section>

          <section className="form-section">
            <div className="form-section-title">
              <span><Palette size={19} /></span>
              <div><h2>{t("formDesign")}</h2><p>{builderCopy.designHint}</p></div>
            </div>
            <div className="grid gap-7">
              <div>
                <p className="form-label mb-3"><Globe2 size={16} /> {t("cardLanguage")}</p>
                <div className="segmented-control">
                  {(["ru", "tj", "en"] as Language[]).map((language) => (
                    <button
                      type="button"
                      key={language}
                      className={form.language === language ? "active" : ""}
                      onClick={() => {
                        update("language", language);
                        setLanguage(language);
                      }}
                    >
                      {language === "ru" ? "Русский" : language === "tj" ? "Тоҷикӣ" : "English"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="form-label mb-3"><Palette size={16} /> {t("colorTheme")}</p>
                <div className="theme-picker">
                  {(Object.keys(themeColors) as CardTheme[]).map((theme) => (
                    <button
                      type="button"
                      key={theme}
                      onClick={() => update("theme", theme)}
                      className={form.theme === theme ? "active" : ""}
                      aria-label={themeColors[theme].label}
                      title={themeColors[theme].label}
                    >
                      <span style={{ backgroundColor: themeColors[theme].accent }} />
                      {form.theme === theme && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="form-label mb-3"><BriefcaseBusiness size={16} /> {t("template")}</p>
                <div className="template-picker">
                  {templates.map((template) => (
                    <button
                      type="button"
                      key={template.id}
                      onClick={() => update("template", template.id)}
                      className={form.template === template.id ? "active" : ""}
                    >
                      <span className={`template-thumbnail template-${template.id}`}>
                        <i /><b /><em />
                      </span>
                      <span><strong>{template.title}</strong><small>{template.detail}</small></span>
                      {form.template === template.id && <Check size={17} />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <button type="submit" className="button button-primary button-large w-full" disabled={saving}>
            <Save size={19} />
            {saving ? builderCopy.saving : existing ? t("updateCard") : t("saveCard")}
            <ArrowRight size={19} />
          </button>
        </form>

        <aside className="preview-column">
          <div className="preview-heading">
            <span className="live-dot" />
            {t("livePreview")}
          </div>
          <div className="preview-device">
            <div className="preview-device-bar"><i /><i /><i /></div>
            <CardPreview card={form} />
          </div>
          <p className="mt-4 text-center text-xs leading-5 text-[var(--muted)]">
            {builderCopy.previewHint}
          </p>
        </aside>
      </div>
    </main>
  );
}

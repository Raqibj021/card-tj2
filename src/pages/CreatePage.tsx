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
import { emptyCard } from "../data/demo";
import { cardRepository } from "../lib/cardRepository";
import { createSlug, themeColors } from "../lib/cardUtils";
import type {
  CardDraft,
  CardTemplate,
  CardTheme,
  Language
} from "../types/card";

type FormErrors = Partial<Record<keyof CardDraft, string>>;

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
  const { t, setLanguage } = useApp();
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
  const [slugTouched, setSlugTouched] = useState(Boolean(existing));
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existing) setLanguage(existing.language);
  }, [existing, setLanguage]);

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

  const handleImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({ ...current, photo: "Выберите файл изображения" }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors((current) => ({ ...current, photo: t("photoLarge") }));
      return;
    }
    try {
      update("photo", await compressImage(file));
    } catch {
      setErrors((current) => ({
        ...current,
        photo: "Не удалось обработать изображение"
      }));
    }
  };

  const validate = () => {
    const next: FormErrors = {};
    if (!form.fullName.trim()) next.fullName = t("required");
    if (!form.position.trim()) next.position = t("required");
    if (!form.phone.trim()) next.phone = t("required");
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
  }> = [
    { id: "executive", title: "Деловой", detail: "Тёмный верх и плавная волна" },
    { id: "minimal", title: "Технологичный", detail: "Тёмный неоновый стиль" },
    { id: "creative", title: "Архитектурный", detail: "Светлый стиль с фирменной полосой" }
  ];

  return (
    <main className="pb-20">
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
              <div><h2>{t("formProfile")}</h2><p>Основные данные вашего профиля</p></div>
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
                  onChange={handleImage}
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
                  placeholder="Фируз Саидов"
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
                  placeholder="Руководитель"
                />
              </Field>
              <Field
                label={t("organization")}
                icon={<Building2 size={16} />}
              >
                <input
                  className="form-input"
                  value={form.organization}
                  onChange={(event) => update("organization", event.target.value)}
                  placeholder="Название компании"
                />
              </Field>
              <Field
                label={`${t("slug")} *`}
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
                placeholder="Расскажите коротко о своей работе и преимуществах..."
              />
              <span className="form-counter">{form.description.length}/240</span>
            </Field>
          </section>

          <section className="form-section">
            <div className="form-section-title">
              <span><Phone size={19} /></span>
              <div><h2>{t("formContacts")}</h2><p>Добавьте удобные способы связи</p></div>
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
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="+992 00 000 00 00"
                  autoComplete="tel"
                />
              </Field>
              <Field label={t("secondPhone")} icon={<Phone size={16} />}>
                <input
                  className="form-input"
                  type="tel"
                  value={form.secondPhone}
                  onChange={(event) => update("secondPhone", event.target.value)}
                  placeholder="+992 00 000 00 00"
                />
              </Field>
              <Field label={t("whatsapp")} icon={<MessageCircle size={16} />}>
                <input
                  className="form-input"
                  type="tel"
                  value={form.whatsapp}
                  onChange={(event) => update("whatsapp", event.target.value)}
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
              <Field label={t("address")} icon={<MapPin size={16} />}>
                <input
                  className="form-input"
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                  placeholder="Душанбе, проспект Рӯдакӣ, 1"
                  autoComplete="street-address"
                />
              </Field>
              <Field label={t("website")} icon={<Globe2 size={16} />}>
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
              <div><h2>{t("formSocial")}</h2><p>Укажите ссылку или имя пользователя</p></div>
            </div>
            <div className="form-grid">
              {(["telegram", "instagram", "facebook"] as const).map((network) => (
                <Field
                  key={network}
                  label={t(network)}
                  icon={<AtSign size={16} />}
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
              <div><h2>{t("formDesign")}</h2><p>Подберите оформление под свой образ</p></div>
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
            {saving ? "Сохранение..." : existing ? t("updateCard") : t("saveCard")}
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
            Предпросмотр обновляется автоматически. На телефоне визитка откроется на весь экран.
          </p>
        </aside>
      </div>
    </main>
  );
}

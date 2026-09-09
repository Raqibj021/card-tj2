import {
  Activity, CheckCircle2, Eye, EyeOff, FileCheck2, Globe2, Mail, MapPin, Pencil, Phone, RefreshCw,
  RotateCcw, Save, Search, ShieldCheck, Trash2, UserRound, WalletCards, X, XCircle
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import {
  adminCardsRepository, type AdminCardDetails, type AdminCardSummary, type AdminCardUpdate, type AdminCardWorkspace
} from "../lib/adminCardsRepository";
import "./AdminCardsPage.css";

const visibilityLabels: Record<string, string> = {
  private: "Закрытая", public: "Открытая", organization: "Организация",
  public_organization: "Открытая организация"
};
const statusLabels: Record<string, string> = {
  draft: "Черновик", pending: "На проверке", approved: "Одобрена",
  changes_requested: "Нужны изменения", rejected: "Отклонена", suspended: "Приостановлена"
};
const contactLabels: Record<string, string> = {
  phone: "Телефон", secondPhone: "Второй телефон", whatsapp: "WhatsApp",
  telegram: "Telegram", instagram: "Instagram", facebook: "Facebook",
  email: "Электронная почта", website: "Сайт"
};

export default function AdminCardsPage() {
  const [workspace, setWorkspace] = useState<AdminCardWorkspace | null>(null);
  const [details, setDetails] = useState<AdminCardDetails | null>(null);
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try { setWorkspace(await adminCardsRepository.workspace()); setNotice(""); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось загрузить визитки."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const cards = useMemo(() => (workspace?.cards ?? []).filter((card) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [card.fullName, card.organization, card.ownerEmail, card.slug]
      .some((value) => value.toLowerCase().includes(query));
    const matchesVisibility = visibility === "all" ||
      (visibility === "public" ? ["public", "public_organization"].includes(card.visibility) :
        !["public", "public_organization"].includes(card.visibility));
    return matchesSearch && matchesVisibility && (status === "all" || card.reviewStatus === status);
  }), [workspace, search, visibility, status]);

  const openDetails = async (card: AdminCardSummary) => {
    setEditing(false);
    setNotice("");
    try {
      setDetails(await adminCardsRepository.details(card.id,
        ["public", "public_organization"].includes(card.visibility) ? "administrative_review" : "private_card_administration"));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось открыть данные визитки.");
    }
  };

  const saveCard = async (changes: AdminCardUpdate) => {
    if (!details) return;
    try {
      const saved = await adminCardsRepository.update(details.id, changes);
      setDetails(saved);
      setEditing(false);
      await refresh();
      setNotice("Изменения визитки сохранены. Владелец и статус публикации не изменены.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось сохранить изменения визитки.");
    }
  };

  const deleteForever = async (card: AdminCardDetails) => {
    const confirmed = window.confirm(
      `Удалить визитку «${card.fullName || card.slug}» навсегда? Будут удалены QR-ссылка, данные визитки и загруженные изображения. Восстановить их будет невозможно.`
    );
    if (!confirmed) return;
    const repeated = window.prompt(`Для подтверждения введите адрес визитки: ${card.slug}`);
    if (repeated?.trim().toLowerCase() !== card.slug.toLowerCase()) {
      setNotice("Удаление отменено: адрес визитки введён неверно.");
      return;
    }
    try {
      await adminCardsRepository.deleteForever(card.id);
      setDetails(null);
      await refresh();
      setNotice("Визитка и связанные файлы удалены навсегда.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось удалить визитку.");
    }
  };

  const review = async (card: AdminCardDetails, decision: "approved" | "changes_requested" | "rejected") => {
    const prompts = { changes_requested: "Напишите, что нужно исправить", rejected: "Укажите причину отклонения" };
    const defaults = {
      changes_requested: "Исправьте указанные данные визитки и отправьте её на повторную проверку.",
      rejected: "Данные визитки не прошли проверку. Уточните информацию и отправьте заявку повторно."
    };
    if (decision === "approved" && !window.confirm(`Одобрить визитку «${card.fullName || card.slug}» и активировать QR-код?`)) return;
    const note = decision === "approved" ? "" : window.prompt(prompts[decision], defaults[decision])?.trim() ?? "";
    if (decision !== "approved" && note.length < 3) {
      setNotice("Для исправления или отклонения обязательно укажите причину.");
      return;
    }
    try {
      await adminCardsRepository.review(card.id, decision, note);
      setDetails(null);
      await refresh();
      setNotice(decision === "approved" ? "Визитка одобрена. QR-код активирован." : "Решение сохранено и отправлено пользователю.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось сохранить решение.");
    }
  };

  const stats = workspace?.stats ?? { total: 0, public: 0, private: 0, pending: 0, approved: 0, views: 0 };
  return (
    <AdminShell title="Все визитки" description="Единый реестр открытых и закрытых визиток. Просмотр полных данных автоматически фиксируется в защищённом журнале."
      actions={<button className="admin-toolbar-button" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={16} /> Обновить</button>}>
      {notice && <div className="admin-workspace-notice">{notice}</div>}
      <section className="admin-card-kpis">
        <Kpi icon={WalletCards} label="Все визитки" value={stats.total} />
        <Kpi icon={Globe2} label="Открытые" value={stats.public} />
        <Kpi icon={EyeOff} label="Закрытые" value={stats.private} />
        <Kpi icon={Activity} label="Просмотры" value={stats.views} />
      </section>

      <section className="admin-card-console">
        <header>
          <label><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Имя, организация, e-mail или адрес визитки" /></label>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <option value="all">Любая видимость</option><option value="public">Только открытые</option><option value="private">Только закрытые</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Любой статус</option><option value="draft">Черновики</option><option value="pending">На проверке</option>
            <option value="approved">Одобренные</option><option value="suspended">Приостановленные</option>
          </select>
        </header>
        <div className="admin-card-list">
          {cards.map((card) => <article key={card.id}>
            <span className="admin-card-photo">{card.photo ? <img src={card.photo} alt="" /> : <UserRound size={20} />}</span>
            <div className="admin-card-identity"><strong>{card.fullName || "Без имени"}</strong><small>{card.position || card.organization || card.ownerEmail}</small></div>
            <div><small>Адрес</small><b>/card/{card.slug}</b></div>
            <div><small>Контакты</small><b>{card.contactsCount}</b></div>
            <div><small>Просмотры</small><b>{card.views}</b></div>
            <span className={`admin-card-visibility ${["public","public_organization"].includes(card.visibility) ? "public" : "private"}`}>
              {["public","public_organization"].includes(card.visibility) ? <Eye size={14} /> : <EyeOff size={14} />}
              {visibilityLabels[card.visibility] ?? card.visibility}
            </span>
            <span className={`admin-card-review ${card.reviewStatus}`}>{statusLabels[card.reviewStatus] ?? card.reviewStatus}</span>
            <button onClick={() => void openDetails(card)}>Открыть данные</button>
          </article>)}
          {!loading && !cards.length && <div className="table-empty">По выбранным условиям визитки не найдены.</div>}
        </div>
      </section>

      <section className="admin-access-log">
        <header><div><ShieldCheck size={19} /><span><strong>Журнал доступа</strong><small>Кто и когда открывал полные данные визиток</small></span></div></header>
        {(workspace?.accessHistory ?? []).slice(0, 20).map((item) => <div key={item.id}>
          <span><strong>{item.cardName}</strong><small>/card/{item.cardSlug}</small></span>
          <span><strong>{item.adminName || item.adminEmail}</strong><small>{item.reason}</small></span>
          <time>{new Date(item.accessedAt).toLocaleString("ru-RU")}</time>
        </div>)}
        {!workspace?.accessHistory.length && <p>Журнал пока пуст.</p>}
      </section>

      {details && <CardDrawer card={details} editing={editing} onEdit={() => setEditing(true)} onCancelEdit={() => setEditing(false)} onSave={saveCard} onClose={() => setDetails(null)} onDelete={() => void deleteForever(details)} onReview={(decision) => void review(details, decision)} />}
      {details && <button aria-label="Закрыть" className="admin-drawer-backdrop" onClick={() => setDetails(null)} />}
    </AdminShell>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: typeof WalletCards; label: string; value: number }) {
  return <article><span><Icon size={19} /></span><div><strong>{value.toLocaleString("ru-RU")}</strong><small>{label}</small></div></article>;
}

function CardDrawer({ card, editing, onEdit, onCancelEdit, onSave, onClose, onDelete, onReview }: {
  card: AdminCardDetails;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (changes: AdminCardUpdate) => Promise<void>;
  onClose: () => void;
  onDelete: () => void;
  onReview: (decision: "approved" | "changes_requested" | "rejected") => void;
}) {
  if (editing) return <CardEditForm card={card} onCancel={onCancelEdit} onSave={onSave} />;
  const contacts = Object.entries(card.contacts ?? {}).filter(([key, value]) => key !== "companyLogo" && String(value).trim());
  return <aside className="admin-card-drawer">
    <button className="admin-drawer-close" onClick={onClose}><X size={18} /></button>
    <div className="admin-card-drawer-head">
      {card.photo ? <img src={card.photo} alt="" /> : <span><UserRound size={25} /></span>}
      <div><small>ПОЛНЫЕ ДАННЫЕ ВИЗИТКИ</small><h2>{card.fullName}</h2><p>{card.position}{card.organization ? ` · ${card.organization}` : ""}</p></div>
    </div>
    {!["public","public_organization"].includes(card.visibility) && <div className="admin-private-warning"><ShieldCheck size={18} /><span><strong>Закрытая визитка</strong><small>Этот просмотр записан в журнал доступа.</small></span></div>}
    <div className="admin-drawer-grid">
      <span><small>Владелец</small><strong>{card.ownerName}</strong></span>
      <span><small>E-mail аккаунта</small><strong>{card.ownerEmail || "—"}</strong></span>
      <span><small>Видимость</small><strong>{visibilityLabels[card.visibility] ?? card.visibility}</strong></span>
      <span><small>Статус</small><strong>{statusLabels[card.reviewStatus] ?? card.reviewStatus}</strong></span>
    </div>
    {card.description && <div className="admin-card-description">{card.description}</div>}
    <h3>Контакты и социальные сети</h3>
    <div className="admin-full-contacts">
      {contacts.map(([key, value]) => <div key={key}>
        <span>{key === "email" ? <Mail size={17} /> : key === "website" ? <Globe2 size={17} /> : <Phone size={17} />}</span>
        <div><small>{contactLabels[key] ?? key}</small><strong>{String(value)}</strong></div>
      </div>)}
      {card.address && <div><span><MapPin size={17} /></span><div><small>Адрес</small><strong>{card.address}</strong></div></div>}
      {!contacts.length && !card.address && <p>Контактные данные не заполнены.</p>}
    </div>
    <h3>Технические данные</h3>
    <div className="admin-drawer-grid">
      <span><small>Шаблон</small><strong>{card.template}</strong></span>
      <span><small>Тема</small><strong>{card.theme}</strong></span>
      <span><small>Язык</small><strong>{card.language.toUpperCase()}</strong></span>
      <span><small>Просмотры</small><strong>{card.views}</strong></span>
    </div>
    <div className="admin-card-drawer-foot"><FileCheck2 size={17} /> Данные доступны только главному администратору</div>
    <button type="button" className="admin-card-edit-button" onClick={onEdit}>
      <Pencil size={17} /> Редактировать визитку
    </button>
    {card.reviewStatus !== "approved" && (
      <div className="admin-card-review-actions">
        <button type="button" className="button button-primary" onClick={() => onReview("approved")}>
          <CheckCircle2 size={17} /> Одобрить и активировать QR
        </button>
        <button type="button" className="button button-secondary" onClick={() => onReview("changes_requested")}>
          <RotateCcw size={17} /> Вернуть на исправление
        </button>
        <button type="button" className="button button-secondary text-red-600" onClick={() => onReview("rejected")}>
          <XCircle size={17} /> Отклонить
        </button>
      </div>
    )}
    <button type="button" className="admin-card-delete-forever" onClick={onDelete}>
      <Trash2 size={17} /> Удалить визитку навсегда
    </button>
  </aside>;
}

const contactKeys = ["phone", "secondPhone", "whatsapp", "telegram", "instagram", "facebook", "email", "website"] as const;

function CardEditForm({ card, onCancel, onSave }: {
  card: AdminCardDetails;
  onCancel: () => void;
  onSave: (changes: AdminCardUpdate) => Promise<void>;
}) {
  const [form, setForm] = useState<AdminCardUpdate>(() => ({
    slug: card.slug, fullName: card.fullName, position: card.position,
    organization: card.organization, description: card.description, photo: card.photo,
    companyLogo: card.companyLogo, contacts: { ...card.contacts }, address: card.address,
    language: card.language, theme: card.theme, template: card.template,
    specialistTitle: card.specialistTitle ?? "", specialistCity: card.specialistCity ?? "",
    specialistTags: card.specialistTags ?? [], specialistExperience: card.specialistExperience ?? "",
    specialistSummary: card.specialistSummary ?? "", specialistServiceArea: card.specialistServiceArea ?? "",
    specialistConsultation: card.specialistConsultation ?? "", specialistPortfolio: card.specialistPortfolio ?? []
  }));
  const [saving, setSaving] = useState(false);
  const field = (key: keyof AdminCardUpdate, value: string | string[]) => setForm((current) => ({ ...current, [key]: value }));
  const contact = (key: string, value: string) => setForm((current) => ({ ...current, contacts: { ...current.contacts, [key]: value } }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };
  const isSpecialist = Boolean(card.professionCategoryId || card.specialistTitle);

  return <aside className="admin-card-drawer admin-card-editor">
    <button className="admin-drawer-close" onClick={onCancel}><X size={18} /></button>
    <header><small>РЕДАКТИРОВАНИЕ АДМИНИСТРАТОРОМ</small><h2>{card.fullName}</h2><p>Владелец: {card.ownerName || card.ownerEmail}</p></header>
    <div className="admin-edit-warning"><ShieldCheck size={18} /><span>Владелец, тариф, оплата и текущий статус одобрения не изменятся.</span></div>
    <form onSubmit={(event) => void submit(event)}>
      <h3>Основные данные</h3>
      <EditField label="Адрес визитки"><input required value={form.slug} onChange={(e) => field("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} /></EditField>
      <EditField label="Имя и фамилия"><input required value={form.fullName} onChange={(e) => field("fullName", e.target.value)} /></EditField>
      <div className="admin-edit-row"><EditField label="Должность"><input required value={form.position} onChange={(e) => field("position", e.target.value)} /></EditField><EditField label="Организация"><input required value={form.organization} onChange={(e) => field("organization", e.target.value)} /></EditField></div>
      <EditField label="Описание"><textarea rows={4} value={form.description} onChange={(e) => field("description", e.target.value)} /></EditField>
      <EditField label="Адрес"><input value={form.address} onChange={(e) => field("address", e.target.value)} /></EditField>
      <div className="admin-edit-row"><EditField label="Фото (URL)"><input value={form.photo} onChange={(e) => field("photo", e.target.value)} /></EditField><EditField label="Логотип (URL)"><input value={form.companyLogo} onChange={(e) => field("companyLogo", e.target.value)} /></EditField></div>

      <h3>Контакты</h3>
      <div className="admin-edit-row">{contactKeys.map((key) => <EditField key={key} label={contactLabels[key]}><input value={form.contacts[key] ?? ""} onChange={(e) => contact(key, e.target.value)} /></EditField>)}</div>

      <h3>Оформление</h3>
      <div className="admin-edit-row">
        <EditField label="Язык"><select value={form.language} onChange={(e) => field("language", e.target.value)}><option value="ru">Русский</option><option value="tj">Тоҷикӣ</option><option value="en">English</option></select></EditField>
        <EditField label="Шаблон"><select value={form.template} onChange={(e) => field("template", e.target.value)}><option value="executive">Executive</option><option value="minimal">Minimal</option><option value="creative">Creative</option></select></EditField>
        <EditField label="Тема"><select value={form.theme} onChange={(e) => field("theme", e.target.value)}>{["teal","blue","plum","amber","graphite","navy","violet","burgundy"].map((value) => <option key={value} value={value}>{value}</option>)}</select></EditField>
      </div>

      {isSpecialist && <><h3>Профиль специалиста</h3>
        <div className="admin-edit-row"><EditField label="Название профессии"><input value={form.specialistTitle} onChange={(e) => field("specialistTitle", e.target.value)} /></EditField><EditField label="Город"><input value={form.specialistCity} onChange={(e) => field("specialistCity", e.target.value)} /></EditField></div>
        <EditField label="Навыки (через запятую)"><input value={form.specialistTags.join(", ")} onChange={(e) => field("specialistTags", e.target.value.split(",").map((v) => v.trim()).filter(Boolean).slice(0, 12))} /></EditField>
        <EditField label="Опыт"><input value={form.specialistExperience} onChange={(e) => field("specialistExperience", e.target.value)} /></EditField>
        <EditField label="Описание специалиста"><textarea rows={4} value={form.specialistSummary} onChange={(e) => field("specialistSummary", e.target.value)} /></EditField>
        {card.specialistPlan === "pro" && <><EditField label="Регион работы"><input value={form.specialistServiceArea} onChange={(e) => field("specialistServiceArea", e.target.value)} /></EditField><EditField label="Формат консультации"><input value={form.specialistConsultation} onChange={(e) => field("specialistConsultation", e.target.value)} /></EditField><EditField label="Портфолио (одна ссылка в строке)"><textarea rows={4} value={form.specialistPortfolio.join("\n")} onChange={(e) => field("specialistPortfolio", e.target.value.split("\n").map((v) => v.trim()).filter(Boolean).slice(0, 20))} /></EditField></>}
      </>}
      <div className="admin-edit-actions"><button type="button" className="button button-secondary" onClick={onCancel}>Отмена</button><button type="submit" className="button button-primary" disabled={saving}><Save size={17} /> {saving ? "Сохранение…" : "Сохранить изменения"}</button></div>
    </form>
  </aside>;
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="admin-edit-field"><span>{label}</span>{children}</label>;
}

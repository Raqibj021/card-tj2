import { CheckCircle2, Copy, ExternalLink, RefreshCw, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import { createSlug } from "../lib/cardUtils";
import { inviteRepository, type CardInvite } from "../lib/inviteRepository";
import "./AdminInvitesPage.css";

const SITE = "https://vizora.tj";
const statusNames: Record<CardInvite["status"], string> = { new: "Новая", approved: "Визитка создана", rejected: "Отклонена", claimed: "Забрал в кабинет" };

const message = (inv: CardInvite, slug: string, token: string) => {
  const card = `${SITE}/${slug}`;
  const claim = `${SITE}/claim/${token}`;
  return inv.language === "ru"
    ? `Здравствуйте, ${inv.full_name.split(" ")[0]}! 🎉\n\nВаша бесплатная электронная визитка Vizora готова:\n${card}\n\nЧтобы управлять ею (менять данные, добавить фото), зарегистрируйтесь по ссылке — визитка сразу появится в вашем кабинете:\n${claim}\n\nКоманда Vizora`
    : `Ассалому алайкум, ${inv.full_name.split(" ")[0]}! 🎉\n\nВизиткаи электронии ройгони шумо дар Vizora омода шуд:\n${card}\n\nБарои идора кардан (тағйири маълумот, илова кардани акс) бо ин пайванд номнавис шавед — визитка дарҳол ба кабинети шумо мегузарад:\n${claim}\n\nДастаи Vizora`;
};

export default function AdminInvitesPage() {
  const [rows, setRows] = useState<CardInvite[]>([]);
  const [filter, setFilter] = useState<"new" | "approved" | "claimed" | "rejected" | "all">("new");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    setBusy("refresh");
    try { setRows(await inviteRepository.list()); setNotice(""); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Не удалось загрузить заявки"); }
    finally { setBusy(""); }
  };
  useEffect(() => { void refresh(); }, []);

  const counts = useMemo(() => rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {}), [rows]);
  const list = rows.filter((r) => filter === "all" || r.status === filter);

  const approve = async (inv: CardInvite) => {
    setBusy(inv.id);
    try {
      const res = await inviteRepository.approve(inv.id, createSlug(inv.full_name));
      setRows((all) => all.map((r) => (r.id === inv.id ? { ...r, status: "approved", card_id: res.card_id, cards: { slug: res.slug } } : r)));
      setNotice(`Визитка создана: ${SITE}/${res.slug}`);
    } catch (e) {
      setNotice(`Ошибка: ${e instanceof Error ? e.message : "не удалось создать визитку"}`);
    } finally { setBusy(""); }
  };

  const reject = async (inv: CardInvite) => {
    if (!window.confirm(`Отклонить заявку ${inv.full_name}?`)) return;
    setBusy(inv.id);
    try { await inviteRepository.reject(inv.id); setRows((all) => all.map((r) => (r.id === inv.id ? { ...r, status: "rejected" } : r))); }
    finally { setBusy(""); }
  };

  const waLink = (inv: CardInvite) => `https://wa.me/${inv.whatsapp || inv.phone}?text=${encodeURIComponent(message(inv, inv.cards?.slug ?? "", inv.claim_token))}`;
  const copyText = async (inv: CardInvite) => {
    await navigator.clipboard.writeText(message(inv, inv.cards?.slug ?? "", inv.claim_token));
    setNotice("Сообщение скопировано — вставьте его в Instagram или Telegram");
  };

  return (
    <AdminShell
      title="Бесплатные визитки"
      description={`Заявки с формы ${SITE}/free. Одобрите — визитка создастся, затем отправьте ссылку в WhatsApp.`}
      actions={<button className="admin-toolbar-button" disabled={busy === "refresh"} onClick={() => void refresh()}><RefreshCw className={busy === "refresh" ? "spin" : ""} size={16} /> Обновить</button>}
    >
      <div className="admin-subpage invites-page">
        <div className="invites-tabs">
          {(["new", "approved", "claimed", "rejected", "all"] as const).map((k) => (
            <button key={k} className={filter === k ? "active" : ""} onClick={() => setFilter(k)}>
              {k === "all" ? "Все" : statusNames[k]} <b>{k === "all" ? rows.length : counts[k] ?? 0}</b>
            </button>
          ))}
        </div>
        {notice && <div className="invites-notice">{notice}</div>}
        {list.length === 0 && <div className="invites-empty">Заявок нет. Ссылка для рассылки: <b>{SITE}/free</b></div>}
        <div className="invites-grid">
          {list.map((inv) => (
            <article key={inv.id} className={`invite-card st-${inv.status}`}>
              <header>
                <div className="invite-ava">{inv.full_name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</div>
                <div>
                  <strong>{inv.full_name}</strong>
                  <span>{inv.profession}{inv.city ? ` · ${inv.city}` : ""}</span>
                </div>
                <em>{statusNames[inv.status]}</em>
              </header>
              <dl>
                <dt>Телефон</dt><dd>+{inv.phone}</dd>
                {inv.whatsapp && inv.whatsapp !== inv.phone && (<><dt>WhatsApp</dt><dd>+{inv.whatsapp}</dd></>)}
                {inv.telegram && (<><dt>Telegram</dt><dd>{inv.telegram}</dd></>)}
                {inv.instagram && (<><dt>Instagram</dt><dd>@{inv.instagram}</dd></>)}
                {inv.about && (<><dt>О себе</dt><dd>{inv.about}</dd></>)}
                <dt>Дата</dt><dd>{new Date(inv.created_at).toLocaleString("ru-RU")}{inv.source ? ` · ${inv.source}` : ""}</dd>
              </dl>
              <footer>
                {(inv.status === "new" || inv.status === "rejected") && (
                  <>
                    <button className="primary" disabled={busy === inv.id} onClick={() => void approve(inv)}><CheckCircle2 size={16} /> Создать визитку</button>
                    {inv.status === "new" && <button disabled={busy === inv.id} onClick={() => void reject(inv)}><X size={16} /> Отклонить</button>}
                  </>
                )}
                {inv.status === "approved" && inv.cards?.slug && (
                  <>
                    <a className="primary wa" href={waLink(inv)} target="_blank" rel="noreferrer"><Send size={16} /> Отправить в WhatsApp</a>
                    <button onClick={() => void copyText(inv)}><Copy size={16} /> Копировать</button>
                    <a href={`/${inv.cards.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Визитка</a>
                  </>
                )}
                {inv.status === "claimed" && inv.cards?.slug && (
                  <a href={`/${inv.cards.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Открыть визитку</a>
                )}
              </footer>
            </article>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

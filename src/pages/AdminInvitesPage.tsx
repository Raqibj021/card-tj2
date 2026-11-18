import { CheckCircle2, Copy, Download, ExternalLink, Gift, ImageUp, RefreshCw, Send, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import { createSlug } from "../lib/cardUtils";
import { findFreeCardDesign } from "../lib/freeCardDesigns";
import { inviteRepository, type CardInvite } from "../lib/inviteRepository";
import { renderInviteCardImage } from "../lib/inviteCardImage";
import "./AdminInvitesPage.css";

const SITE = "https://vizora.tj";
const statusNames: Record<CardInvite["status"], string> = { new: "Новая", approved: "Визитка создана", rejected: "Отклонена", claimed: "Забрал в кабинет" };

const message = (inv: CardInvite, slug: string, token: string, left: number | null) => {
  const nfc = left !== null && left > 0;
  const name = inv.full_name.trim().split(/\s+/)[0];
  const card = `${SITE}/${slug}`;
  const claim = `${SITE}/claim/${token}`;
  if (inv.language === "ru") return [
    `${name}, здравствуйте! 🎉`,
    `Ваша бесплатная электронная визитка Vizora готова 👇`,
    card,
    ``,
    nfc ? `🎁 Зарегистрируйтесь сейчас — получите 1 год бесплатно и NFC-карту в подарок (осталось ${left} мест из 50)!` : ``,
    `✅ Чтобы управлять визиткой (фото, контакты, статистика), зарегистрируйтесь — она сразу появится в вашем кабинете:`,
    claim,
    ``,
    `Команда Vizora 💙`
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "").join("\n");
  if (inv.language === "en") return [
    `Hi ${name}! 🎉`,
    `Your free Vizora digital card is ready 👇`,
    card,
    ``,
    nfc ? `🎁 Sign up now to get 1 year free and an NFC card as a gift (${left} of 50 places left)!` : ``,
    `✅ To manage your card (photo, contacts, stats), sign up — it will appear in your account right away:`,
    claim,
    ``,
    `Team Vizora 💙`
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "").join("\n");
  return [
    `${name}, ассалому алайкум! 🎉`,
    `Визиткаи электронии ройгони шумо дар Vizora омода шуд 👇`,
    card,
    ``,
    nfc ? `🎁 Ҳозир номнавис шавед — 1 сол ройгон ва корти NFC тӯҳфа мегиред (аз 50 ҷой ${left} монд)!` : ``,
    `✅ Барои идора кардани визитка (акс, тамосҳо, омор) номнавис шавед — он дарҳол ба кабинети шумо мегузарад:`,
    claim,
    ``,
    `Дастаи Vizora 💙`
  ].filter((l, i, arr) => l !== "" || arr[i - 1] !== "").join("\n");
};

export default function AdminInvitesPage() {
  const [rows, setRows] = useState<CardInvite[]>([]);
  const [filter, setFilter] = useState<"new" | "approved" | "claimed" | "rejected" | "all">("new");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [promo, setPromo] = useState<{ limit: number; used: number; places: Record<string, number> }>({ limit: 50, used: 0, places: {} });

  const refresh = async () => {
    setBusy("refresh");
    try { const [list, p] = await Promise.all([inviteRepository.list(), inviteRepository.promo()]); setRows(list); setPromo(p); setNotice(""); }
    catch (e) { setNotice(e instanceof Error ? e.message : "Не удалось загрузить заявки"); }
    finally { setBusy(""); }
  };
  useEffect(() => { void refresh(); }, []);

  const counts = useMemo(() => rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {}), [rows]);
  const list = rows.filter((r) => filter === "all" || r.status === filter);
  const made = rows.filter((r) => r.status === "approved" || r.status === "claimed");
  const left = Math.max(0, promo.limit - promo.used);
  const placeOf = (id: string) => promo.places[id] ?? null;
  const freeWithGift = Object.keys(promo.places).length;

  const approve = async (inv: CardInvite) => {
    setBusy(inv.id);
    try {
      const res = await inviteRepository.approve(inv.id, createSlug(inv.full_name), inv.photo_data);
      setRows((all) => all.map((r) => (r.id === inv.id ? { ...r, status: "approved" as const, card_id: res.card_id, cards: { slug: res.slug } } : r)));
      setNotice(`Визитка создана: ${SITE}/${res.slug}`);
    } catch (e) {
      setNotice(`Ошибка: ${e instanceof Error ? e.message : "не удалось создать визитку"}`);
    } finally { setBusy(""); }
  };

  const reject = async (inv: CardInvite) => {
    if (!window.confirm(`Отклонить заявку ${inv.full_name}?`)) return;
    setBusy(inv.id);
    try { await inviteRepository.reject(inv.id); setRows((all) => all.map((r) => (r.id === inv.id ? { ...r, status: "rejected" as const } : r))); }
    finally { setBusy(""); }
  };

  const waLink = (inv: CardInvite) => `https://wa.me/${inv.whatsapp || inv.phone}?text=${encodeURIComponent(message(inv, inv.cards?.slug ?? "", inv.claim_token, left))}`;
  const cardImage = async (inv: CardInvite) => {
    const blob = await renderInviteCardImage(inv, inv.cards?.slug ?? "", left > 0 ? left : null);
    return new File([blob], `vizora-${inv.cards?.slug ?? "card"}.jpg`, { type: "image/jpeg" });
  };
  const download = (file: File) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file); a.download = file.name; a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const sendWithPhoto = async (inv: CardInvite) => {
    setBusy(inv.id);
    try {
      const file = await cardImage(inv);
      const text = message(inv, inv.cards?.slug ?? "", inv.claim_token, left);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text });
      } else {
        download(file);
        await navigator.clipboard.writeText(text).catch(() => undefined);
        window.open(waLink(inv), "_blank");
        setNotice("Фото визитки скачано, текст скопирован. В WhatsApp прикрепите фото и вставьте текст в подпись.");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setNotice("Не удалось подготовить фото визитки");
    } finally { setBusy(""); }
  };
  const downloadPhoto = async (inv: CardInvite) => { setBusy(inv.id); try { download(await cardImage(inv)); } finally { setBusy(""); } };
  const copyText = async (inv: CardInvite) => {
    await navigator.clipboard.writeText(message(inv, inv.cards?.slug ?? "", inv.claim_token, left));
    setNotice("Сообщение скопировано — вставьте его в Instagram или Telegram");
  };

  return (
    <AdminShell
      title="Бесплатные визитки"
      description={`Заявки с формы ${SITE}/free. Счётчик акции общий: бесплатные визитки продолжают те же «первые ${promo.limit}».`}
      actions={<button className="admin-toolbar-button" disabled={busy === "refresh"} onClick={() => void refresh()}><RefreshCw className={busy === "refresh" ? "spin" : ""} size={16} /> Обновить</button>}
    >
      <div className="admin-subpage invites-page">
        <div className="invites-stats">
          <div><span>Создано визиток</span><b>{made.length}</b></div>
          <div className="gift"><span><Gift size={15} /> Акция «первые {promo.limit}»: занято</span><b>{promo.used} / {promo.limit}</b><i style={{ width: `${(promo.used / promo.limit) * 100}%` }} /></div>
          <div><span>Осталось мест (общий счётчик)</span><b>{left}</b></div>
          <div><span>Из них по бесплатным визиткам</span><b>{freeWithGift}</b></div>
          <div><span>Забрали в кабинет</span><b>{counts.claimed ?? 0}</b></div>
          <div><span>Новые заявки</span><b>{counts.new ?? 0}</b></div>
        </div>
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
                <div className="invite-ava">{inv.photo_data ? <img src={inv.photo_data} alt="" /> : inv.full_name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</div>
                <div>
                  <strong>{inv.full_name}</strong>
                  <span>{inv.profession}{inv.city ? ` · ${inv.city}` : ""}</span>
                </div>
                <em>{statusNames[inv.status]}</em>
                {placeOf(inv.id) ? <span className="invite-nfc">🎁 Акция: место №{placeOf(inv.id)} · NFC-карта</span> : inv.status === "approved" && left > 0 ? <span className="invite-nfc muted">🎁 Получит место в акции после регистрации</span> : null}
              </header>
              <dl>
                <dt>Телефон</dt><dd>+{inv.phone}</dd>
                {inv.whatsapp && inv.whatsapp !== inv.phone && (<><dt>WhatsApp</dt><dd>+{inv.whatsapp}</dd></>)}
                {inv.telegram && (<><dt>Telegram</dt><dd>{inv.telegram}</dd></>)}
                {inv.instagram && (<><dt>Instagram</dt><dd>@{inv.instagram}</dd></>)}
                {inv.about && (<><dt>О себе</dt><dd>{inv.about}</dd></>)}
                {inv.design && (<><dt>Дизайн</dt><dd>{findFreeCardDesign(inv.design).name.ru}</dd></>)}
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
                    <button className="primary wa" disabled={busy === inv.id} onClick={() => void sendWithPhoto(inv)}><ImageUp size={16} /> Отправить с фото</button>
                    <a href={waLink(inv)} target="_blank" rel="noreferrer"><Send size={16} /> Только текст</a>
                    <button disabled={busy === inv.id} onClick={() => void downloadPhoto(inv)}><Download size={16} /> Фото визитки</button>
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

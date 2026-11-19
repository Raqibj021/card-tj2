import { Ban, CheckCircle2, Copy, Download, ExternalLink, Gift, ImageUp, RefreshCw, Send, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import { signalAdminCountsChanged } from "../lib/adminNotificationRepository";
import { createSlug } from "../lib/cardUtils";
import { findFreeCardDesign } from "../lib/freeCardDesigns";
import { renderInviteCardImage } from "../lib/inviteCardImage";
import { inviteRepository, type CardInvite } from "../lib/inviteRepository";
import "./AdminInvitesPage.css";

const SITE = "https://vizora.tj";
const statusNames: Record<CardInvite["status"], string> = { new: "Новая", approved: "Создана", rejected: "Отклонена", claimed: "Зарегистрирован", expired: "Удалена (3 дня)" };
type Channel = "whatsapp" | "telegram" | "instagram";

const message = (inv: CardInvite, token: string, left: number) => {
  const name = inv.full_name.trim().split(/\s+/)[0];
  const claim = `${SITE}/claim/${token}`;
  const lines =
    inv.language === "ru"
      ? [`${name}, здравствуйте! 🎉`, "", `Ваша бесплатная электронная визитка Vizora готова 👇`, claim, "", left > 0 ? `🎁 Зарегистрируйтесь сейчас — получите 1 год бесплатно и NFC-карту в подарок!` : "", `✅ Откройте ссылку и зарегистрируйтесь — визитка сразу появится в вашем кабинете, и вы сможете менять фото, контакты и смотреть статистику.`, `❗❗❗ ВИЗИТКА ХРАНИТСЯ 3 ДНЯ. Если за это время не зарегистрироваться, она удалится автоматически.`, `Команда Vizora 💙`]
      : inv.language === "en"
        ? [`Hi ${name}! 🎉`, "", `Your free Vizora digital card is ready 👇`, claim, "", left > 0 ? `🎁 Sign up now to get 1 year free and an NFC card as a gift!` : "", `✅ Open the link and sign up — the card will appear in your account right away, and you can change the photo, contacts and see stats.`, `❗❗❗ THE CARD IS KEPT FOR 3 DAYS. If you don't sign up by then, it is deleted automatically.`, `Team Vizora 💙`]
        : [`${name}, ассалому алайкум! 🎉`, "", `Визиткаи электронии ройгони шумо дар Vizora омода шуд 👇`, claim, "", left > 0 ? `🎁 Ҳозир номнавис шавед — 1 сол ройгон ва корти NFC тӯҳфа мегиред!` : "", `✅ Пайвандро кушоед ва номнавис шавед — визитка дарҳол ба кабинети шумо мегузарад ва шумо метавонед акс, тамосҳоро иваз кунед ва оморро бинед.`, `❗❗❗ ВИЗИТКА 3 РӮЗ НИГОҲ ДОШТА МЕШАВАД. Агар дар ин муддат номнавис нашавед, он худкор нест мешавад.`, `Дастаи Vizora 💙`];
  return lines.filter((l, i, arr) => l !== "" || (arr[i - 1] !== "" && i > 0)).join("\n");
};

const initials = (name: string) => name.split(/\s+/).slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
const Avatar = ({ inv, size = 40 }: { inv: CardInvite; size?: number }) => (
  <span className="inv-ava" style={{ width: size, height: size, fontSize: size * 0.36 }}>
    {inv.photo_data ? <img src={inv.photo_data} alt="" /> : initials(inv.full_name)}
  </span>
);

export default function AdminInvitesPage() {
  const [rows, setRows] = useState<CardInvite[]>([]);
  const [filter, setFilter] = useState<"new" | "approved" | "claimed" | "rejected" | "expired" | "all">("new");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [promo, setPromo] = useState<{ limit: number; used: number; places: Record<string, number> }>({ limit: 50, used: 0, places: {} });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [channel, setChannel] = useState<Channel>("whatsapp");

  const refresh = async () => {
    setBusy("refresh");
    try {
      const [list, p, cats] = await Promise.all([inviteRepository.list(), inviteRepository.promo(), inviteRepository.categories()]);
      setRows(list); setPromo(p); setCategories(cats); setNotice("");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Не удалось загрузить заявки"); }
    finally { setBusy(""); signalAdminCountsChanged(); }
  };
  useEffect(() => { void refresh(); }, []);

  const counts = useMemo(() => rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {}), [rows]);
  const list = rows.filter((r) => filter === "all" || r.status === filter);
  const made = rows.filter((r) => r.status === "approved" || r.status === "claimed").length;
  const left = Math.max(0, promo.limit - promo.used);
  const open = rows.find((r) => r.id === openId) ?? null;
  const slugOf = (inv: CardInvite) => inv.cards?.slug ?? "";

  const openInvite = (inv: CardInvite) => {
    setOpenId(inv.id);
    setCategory(categories.find((c) => /друг/i.test(c.name))?.id ?? "");
    setChannel("whatsapp");
  };

  const approve = async (inv: CardInvite) => {
    setBusy(inv.id);
    try {
      const res = await inviteRepository.approve(inv.id, createSlug(inv.full_name), inv.photo_data, category || null);
      setRows((all) => all.map((r) => (r.id === inv.id ? { ...r, status: "approved" as const, card_id: res.card_id, cards: { slug: res.slug } } : r)));
      setNotice(`Визитка создана: ${SITE}/${res.slug}`);
    } catch (e) {
      setNotice(`Ошибка: ${e instanceof Error ? e.message : "не удалось создать визитку"}`);
    } finally { setBusy(""); signalAdminCountsChanged(); }
  };

  const reject = async (inv: CardInvite) => {
    if (!window.confirm(`Отклонить заявку ${inv.full_name}?`)) return;
    setBusy(inv.id);
    try { await inviteRepository.reject(inv.id); setRows((all) => all.map((r) => (r.id === inv.id ? { ...r, status: "rejected" as const } : r))); setOpenId(null); }
    finally { setBusy(""); signalAdminCountsChanged(); }
  };

  const remove = async (inv: CardInvite, mode: "reject" | "delete") => {
    const q = mode === "delete"
      ? `Удалить заявку ${inv.full_name}${inv.status === "claimed" ? "? Визитка останется у владельца в кабинете." : " вместе с визиткой?"}`
      : `Отклонить ${inv.full_name}? Созданная визитка будет удалена.`;
    if (!window.confirm(q)) return;
    setBusy(inv.id);
    try {
      await inviteRepository.remove(inv.id, mode);
      setRows((all) => mode === "delete" ? all.filter((r) => r.id !== inv.id) : all.map((r) => (r.id === inv.id ? { ...r, status: "rejected" as const, card_id: null, cards: null } : r)));
      setOpenId(null);
      setNotice(mode === "delete" ? "Заявка удалена" : "Заявка отклонена, визитка удалена");
    } catch (e) {
      setNotice(`Ошибка: ${e instanceof Error ? e.message : "не удалось"}`);
    } finally { setBusy(""); signalAdminCountsChanged(); }
  };

  const text = (inv: CardInvite) => message(inv, inv.claim_token, left);
  const cardFile = async (inv: CardInvite) => {
    const blob = await renderInviteCardImage(inv, `${SITE}/claim/${inv.claim_token}`, left > 0 ? left : null);
    return new File([blob], `vizora-${slugOf(inv) || "card"}.jpg`, { type: "image/jpeg" });
  };
  const download = (file: File) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(file); a.download = file.name; a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const tgLink = (inv: CardInvite) => {
    const v = inv.telegram.trim();
    if (!v) return "";
    if (v.startsWith("+") || /^\d+$/.test(v)) return `https://t.me/+${v.replace(/\D/g, "")}`;
    return `https://t.me/${v.replace(/^@/, "").replace(/^https?:\/\/t\.me\//, "")}`;
  };
  const channelLink = (inv: CardInvite, ch: Channel) =>
    ch === "whatsapp" ? `https://wa.me/${inv.whatsapp || inv.phone}?text=${encodeURIComponent(text(inv))}`
      : ch === "telegram" ? tgLink(inv)
        : `https://www.instagram.com/${inv.instagram.replace(/^@/, "")}/`;

  // Copy the card image to the clipboard as PNG (what chat apps accept on paste).
  // The card photo is prepared as soon as the window opens, so the click can
  // put it on the clipboard right away (browsers only allow that inside the tap).
  const [shot, setShot] = useState<{ id: string; file: File; png: Blob; url: string } | null>(null);
  const [shotErr, setShotErr] = useState("");
  const toPng = async (file: File) => {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bmp.width; canvas.height = bmp.height;
    canvas.getContext("2d")?.drawImage(bmp, 0, 0);
    return await new Promise<Blob>((r, j) => canvas.toBlob((b) => (b ? r(b) : j(new Error("png"))), "image/png"));
  };
  const openSlug = open ? slugOf(open) : "";
  useEffect(() => {
    if (!open || !openSlug || !(open.status === "approved" || open.status === "claimed")) return;
    if (shot?.id === open.id) return;
    let alive = true;
    setShotErr("");
    (async () => {
      try {
        const file = await cardFile(open);
        const png = await toPng(file);
        if (alive) setShot({ id: open.id, file, png, url: URL.createObjectURL(file) });
      } catch (e) {
        if (alive) setShotErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open?.id, openSlug, open?.status]);

  // Opens the chat of this exact person (no contact picker). WhatsApp gets the
  // text pre-filled; the card photo is put on the clipboard (or downloaded)
  // so it can be pasted into the same chat.
  const send = async (inv: CardInvite, withPhoto: boolean) => {
    const link = channelLink(inv, channel);
    const msg = text(inv);
    let photoNote = "";
    if (withPhoto) {
      const ready = shot?.id === inv.id ? shot : null;
      if (!ready) { setNotice("Фото визитки ещё готовится — подождите секунду и нажмите снова."); return; }
      let copied = false;
      try {
        if ("ClipboardItem" in window && navigator.clipboard?.write) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": ready.png })]);
          copied = true;
        }
      } catch { copied = false; }
      if (copied) photoNote = "Фото визитки скопировано — в чате нажмите и удерживайте поле ввода → «Вставить», затем отправьте.";
      else { download(ready.file); photoNote = "Фото визитки скачано — прикрепите его в чат через 📎."; }
    } else if (channel !== "whatsapp") {
      await navigator.clipboard.writeText(msg).catch(() => undefined);
    }
    window.open(link, "_blank");
    setNotice([channel === "whatsapp" ? "Открыт чат WhatsApp с текстом." : "Текст скопирован — вставьте его в чат.", photoNote].filter(Boolean).join(" "));
  };

  const sharePhoto = async (inv: CardInvite) => {
    const ready = shot?.id === inv.id ? shot : null;
    if (!ready) return;
    try {
      if (navigator.canShare?.({ files: [ready.file] })) await navigator.share({ files: [ready.file], text: text(inv) });
      else download(ready.file);
    } catch { /* cancelled */ }
  };

  const channels: { key: Channel; label: string; ok: boolean }[] = open
    ? [{ key: "whatsapp", label: "WhatsApp", ok: true }, { key: "telegram", label: "Telegram", ok: Boolean(open.telegram) }, { key: "instagram", label: "Instagram", ok: Boolean(open.instagram) }]
    : [];
  const canApprove = open && open.status !== "claimed" && (open.status === "new" || open.status === "rejected" || open.status === "expired" || !slugOf(open));
  const canSend = open && (open.status === "approved" || open.status === "claimed") && slugOf(open);

  return (
    <AdminShell
      title="Бесплатные визитки"
      description={`Заявки с ${SITE}/free. Нажмите на имя, чтобы одобрить и отправить сообщение.`}
      actions={<button className="admin-toolbar-button" disabled={busy === "refresh"} onClick={() => void refresh()}><RefreshCw className={busy === "refresh" ? "spin" : ""} size={16} /> Обновить</button>}
    >
      <div className="admin-subpage inv-page">
        <div className="inv-kpis">
          <span className="gift"><Gift size={14} /> Акция: <b>{promo.used}/{promo.limit}</b> · осталось <b>{left}</b></span>
          <span>Создано: <b>{made}</b></span>
          <span>Зарегистрировались: <b>{counts.claimed ?? 0}</b></span>
          <span>По акции из free: <b>{Object.keys(promo.places).length}</b></span>
        </div>

        <div className="inv-tabs">
          {(["new", "approved", "claimed", "rejected", "expired", "all"] as const).map((k) => (
            <button key={k} className={filter === k ? "active" : ""} onClick={() => setFilter(k)}>
              {k === "all" ? "Все" : k === "new" ? "Новые" : statusNames[k]} <b>{k === "all" ? rows.length : counts[k] ?? 0}</b>
            </button>
          ))}
        </div>

        {notice && <div className="inv-notice"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Скрыть"><X size={14} /></button></div>}

        <ul className="inv-list">
          {list.length === 0 && <li className="inv-empty">Пусто. Ссылка для рассылки: <b>{SITE}/free</b></li>}
          {list.map((inv) => (
            <li key={inv.id}>
              <button type="button" onClick={() => openInvite(inv)}>
                <Avatar inv={inv} />
                <span className="inv-name"><b>{inv.full_name}</b><small>{inv.profession}{inv.city ? ` · ${inv.city}` : ""}</small></span>
                {promo.places[inv.id] ? <span className="inv-place">🎁 №{promo.places[inv.id]}</span> : null}
                <span className={`inv-pill st-${inv.status}`}>{statusNames[inv.status]}</span>
                {inv.needs_payment && <span className="inv-pill st-new">Ждёт оплаты</span>}
                <time>{new Date(inv.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}</time>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {open && (
        <div className="inv-modal-back" onClick={() => setOpenId(null)}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <button className="inv-close" onClick={() => setOpenId(null)} aria-label="Закрыть"><X size={18} /></button>
            <header>
              <Avatar inv={open} size={56} />
              <div><b>{open.full_name}</b><small>{open.profession}{open.city ? ` · ${open.city}` : ""}</small></div>
            </header>
            <div className="inv-tags">
              <span className={`inv-pill st-${open.status}`}>{statusNames[open.status]}</span>
              {open.status === "approved" && open.approved_at && <span className="inv-pill">⏳ удалится {new Date(new Date(open.approved_at).getTime() + 3 * 864e5).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
              {open.needs_payment && <span className="inv-pill st-new">Ждёт выбора тарифа и оплаты</span>}
              {promo.places[open.id] ? <span className="inv-place">🎁 Место №{promo.places[open.id]} · NFC-карта</span> : null}
            </div>

            <dl>
              <dt>Телефон</dt><dd>+{open.phone}</dd>
              {open.whatsapp && open.whatsapp !== open.phone && (<><dt>WhatsApp</dt><dd>+{open.whatsapp}</dd></>)}
              {open.telegram && (<><dt>Telegram</dt><dd>{open.telegram}</dd></>)}
              {open.instagram && (<><dt>Instagram</dt><dd>@{open.instagram.replace(/^@/, "")}</dd></>)}
              {open.about && (<><dt>О себе</dt><dd>{open.about}</dd></>)}
              {open.design && (<><dt>Обложка</dt><dd>{findFreeCardDesign(open.design).name.ru}</dd></>)}
              <dt>Язык</dt><dd>{open.language === "tj" ? "Тоҷикӣ" : open.language === "ru" ? "Русский" : "English"}</dd>
            </dl>

            {canApprove && (
              <div className="inv-block">
                <label className="inv-label">Раздел в каталоге
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">— не показывать в каталоге —</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <div className="inv-row">
                  <button className="inv-btn primary" disabled={busy === open.id} onClick={() => void approve(open)}><CheckCircle2 size={16} /> Одобрить и создать</button>
                  {open.status === "new" && <button className="inv-btn danger" disabled={busy === open.id} onClick={() => void reject(open)}><X size={16} /> Отклонить</button>}
                </div>
              </div>
            )}

            {canSend && (
              <div className="inv-block">
                {shot?.id === open.id
                  ? <img className="inv-shot" src={shot.url} alt="Фото визитки" />
                  : <div className="inv-shot inv-shot-wait">{shotErr ? `Не удалось сделать фото: ${shotErr}` : "Готовим фото визитки…"}</div>}
                <div className="inv-label">Куда отправить</div>
                <div className="inv-channels">
                  {channels.map((c) => (
                    <button key={c.key} disabled={!c.ok} className={`ch-${c.key}${channel === c.key ? " on" : ""}`} onClick={() => setChannel(c.key)}>{c.label}</button>
                  ))}
                </div>
                <div className="inv-row">
                  <button className="inv-btn primary" disabled={shot?.id !== open.id} onClick={() => void send(open, true)}><ImageUp size={16} /> С фото визитки</button>
                  <button className="inv-btn" disabled={busy === open.id} onClick={() => void send(open, false)}><Send size={16} /> Только текст</button>
                </div>
                <div className="inv-row small">
                  <button className="inv-btn" onClick={() => void navigator.clipboard.writeText(text(open)).then(() => setNotice("Текст скопирован"))}><Copy size={15} /> Текст</button>
                  <button className="inv-btn" disabled={shot?.id !== open.id} onClick={() => shot && download(shot.file)}><Download size={15} /> Фото</button>
                  <button className="inv-btn" disabled={shot?.id !== open.id} onClick={() => void sharePhoto(open)}><Send size={15} /> Поделиться</button>
                  <a className="inv-btn" href={`/${slugOf(open)}`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Визитка</a>
                </div>
                <p className="inv-hint">Удалить визитку можно в разделе «Визитки» — она там вместе со всеми.</p>
              </div>
            )}
            <div className="inv-row small inv-danger-row">
              {(open.status === "approved" || open.status === "expired") && <button className="inv-btn danger" disabled={busy === open.id} onClick={() => void remove(open, "reject")}><Ban size={15} /> Отклонить</button>}
              <button className="inv-btn danger" disabled={busy === open.id} onClick={() => void remove(open, "delete")}><Trash2 size={15} /> Удалить</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import BrandLogo from "../components/BrandLogo";
import WhatsAppIcon from "../components/icons/WhatsAppIcon";
import { useApp } from "../context/AppContext";
import { promoRepository } from "../lib/promoRepository";
import { Flag, InstagramIcon, TelegramIcon } from "./FreeCardPage";
import "./FreeCardPage.css";
import "./InviteFriendsPage.css";

type Lang = "tj" | "ru" | "en";
const URL_FREE = "https://vizora.tj/free";


const copy = {
  tj: {
    title: "Дӯстонатонро даъват кунед 🎁",
    textAfter: "Бигзор онҳо ҳам визиткаи электронии худро созанд. Шабакаро интихоб кунед — паём ва акс тайёранд.",
    text: "Бигзор онҳо ҳам визиткаи электронии ройгон гиранд. Шабакаро интихоб кунед — паём ва акс тайёранд.",
    msgAfter: `✨ Салом! Визиткаи электронии худро дар Vizora созед — телефон, WhatsApp, Telegram ва Instagram дар як пайванд. Ҳамагӣ 1 дақиқа!\n\nБо QR-код ва корти NFC мизоҷон шуморо осон меёбанд 🔥\n\nБарои худ созед 👇\n${URL_FREE}`,
    msg: `🎁 Салом! Визиткаи электронии РОЙГОН дар Vizora — телефон, WhatsApp, Telegram ва Instagram дар як пайванд. Ҳамагӣ 1 дақиқа!\n\n50 нафари аввал корти NFC тӯҳфа мегиранд 🔥\n\nБарои худ созед 👇\n${URL_FREE}`,
    withPhoto: "Фиристодан бо акс", withPhotoSub: "Барномаро интихоб кунед", copy: "Нусхабардории матн", copied: "Нусхабардорӣ шуд!", igHint: "Матн нусхабардорӣ шуд — дар Instagram ба Direct ё Stories гузоред.", back: "Визиткаи худро созед", preview: "Паём"
  },
  ru: {
    title: "Пригласите друзей 🎁",
    textAfter: "Пусть тоже сделают свою электронную визитку. Выберите соцсеть — сообщение и фото уже готовы.",
    text: "Пусть тоже получат бесплатную электронную визитку. Выберите соцсеть — сообщение и фото уже готовы.",
    msgAfter: `✨ Привет! Сделай свою электронную визитку на Vizora — телефон, WhatsApp, Telegram и Instagram в одной ссылке. Всего 1 минута!\n\nС QR-кодом и NFC-картой клиенты легко тебя находят 🔥\n\nСделай себе 👇\n${URL_FREE}`,
    msg: `🎁 Привет! БЕСПЛАТНАЯ электронная визитка на Vizora — телефон, WhatsApp, Telegram и Instagram в одной ссылке. Всего 1 минута!\n\nПервым 50 — NFC-карта в подарок 🔥\n\nСделай себе 👇\n${URL_FREE}`,
    withPhoto: "Отправить с фото", withPhotoSub: "Выберите приложение", copy: "Скопировать текст", copied: "Скопировано!", igHint: "Текст скопирован — вставьте его в Direct или Stories в Instagram.", back: "Создать свою визитку", preview: "Сообщение"
  },
  en: {
    title: "Invite your friends 🎁",
    textAfter: "Let them make their own digital card too. Pick a network — the message and photo are ready.",
    text: "Let them get a free digital business card too. Pick a network — the message and photo are ready.",
    msgAfter: `✨ Hi! Make your digital business card on Vizora — phone, WhatsApp, Telegram and Instagram in one link. Takes 1 minute!\n\nWith a QR code and an NFC card clients find you easily 🔥\n\nMake yours 👇\n${URL_FREE}`,
    msg: `🎁 Hi! A FREE digital business card on Vizora — phone, WhatsApp, Telegram and Instagram in one link. Takes 1 minute!\n\nThe first 50 get an NFC card as a gift 🔥\n\nMake yours 👇\n${URL_FREE}`,
    withPhoto: "Send with photo", withPhotoSub: "Choose an app", copy: "Copy text", copied: "Copied!", igHint: "Text copied — paste it into Instagram Direct or Stories.", back: "Create your own card", preview: "Message"
  }
} as const;

const FbIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="12" fill="#1877f2" /><path d="M13.4 19v-6h2l.3-2.4h-2.3V9.1c0-.7.2-1.1 1.2-1.1h1.2V5.9c-.2 0-1-.1-1.8-.1-1.8 0-3 1.1-3 3.1v1.7H9v2.4h2v6h2.4z" fill="#fff" /></svg>);
const ViberIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="12" fill="#7360f2" /><path d="M8.6 6.6c.3-.2.7-.2.9.1l1.2 1.6c.2.3.2.7-.1 1l-.6.6c.4 1.2 1.7 2.6 3 3.1l.6-.6c.3-.3.7-.3 1-.1l1.6 1.2c.3.2.3.6.1.9-.7 1-1.6 1.4-2.6 1-2.7-1-4.9-3.2-5.8-5.9-.3-1 .1-2.1.7-2.9z" fill="#fff" /></svg>);
const OkIcon = () => (<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="12" fill="#ee8208" /><circle cx="12" cy="8.6" r="2.4" fill="none" stroke="#fff" strokeWidth="1.8" /><path d="M8.8 12.8c2 1.3 4.4 1.3 6.4 0M12 14.6l-2.8 3M12 14.6l2.8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" /></svg>);

export default function InviteFriendsPage() {
  const { language } = useApp();
  const [params] = useSearchParams();
  const initial = (params.get("lang") ?? language) as string;
  const [lang, setLang] = useState<Lang>(initial === "ru" ? "ru" : initial === "en" ? "en" : "tj");
  const [notice, setNotice] = useState("");
  const [promoOn, setPromoOn] = useState(true);
  useEffect(() => { promoRepository.status().then((p) => setPromoOn(p.remaining > 0)).catch(() => undefined); }, []);
  const IMAGE = promoOn ? "/og-free.jpg" : "/og-after.jpg";
  const t = copy[lang];
  const msg = promoOn ? t.msg : t.msgAfter;
  const enc = encodeURIComponent(msg);

  const flash = (text: string) => { setNotice(text); window.setTimeout(() => setNotice(""), 3500); };
  const copyText = async () => { await navigator.clipboard.writeText(msg).catch(() => undefined); flash(t.copied); };

  const shareWithPhoto = async () => {
    try {
      const blob = await (await fetch(IMAGE)).blob();
      const file = new File([blob], "vizora-free.jpg", { type: blob.type || "image/jpeg" });
      if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text: msg }); return; }
      if (navigator.share) { await navigator.share({ text: msg, url: URL_FREE }); return; }
      await copyText();
    } catch (e) {
      if ((e as Error).name !== "AbortError") await copyText();
    }
  };

  const nets: { key: string; label: string; icon: ReactNode; href?: string; onClick?: () => void }[] = [
    { key: "wa", label: "WhatsApp", icon: <WhatsAppIcon size={24} />, href: `https://wa.me/?text=${enc}` },
    { key: "tg", label: "Telegram", icon: <TelegramIcon size={24} />, href: `https://t.me/share/url?url=${encodeURIComponent(URL_FREE)}&text=${encodeURIComponent(msg.replace(URL_FREE, "").trim())}` },
    { key: "ig", label: "Instagram", icon: <InstagramIcon size={24} />, onClick: async () => { await navigator.clipboard.writeText(msg).catch(() => undefined); flash(t.igHint); window.open("https://www.instagram.com/direct/inbox/", "_blank"); } },
    { key: "fb", label: "Facebook", icon: <FbIcon />, href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(URL_FREE)}` },
    { key: "vb", label: "Viber", icon: <ViberIcon />, href: `viber://forward?text=${enc}` },
    { key: "ok", label: "Одноклассники", icon: <OkIcon />, href: `https://connect.ok.ru/offer?url=${encodeURIComponent(URL_FREE)}` }
  ];

  const style = { "--c1": "#06142e", "--c2": "#123f86", "--acc": "#60a5fa" } as CSSProperties;
  return (
    <main className="free-page invite-page" style={style}>
      <div className="free-bg" aria-hidden><i /><i /><i /></div>
      <header className="free-top">
        <BrandLogo light />
        <span className="invite-langs">{(["tj", "ru", "en"] as const).map((l) => <button key={l} type="button" className={lang === l ? "on" : ""} onClick={() => setLang(l)} aria-label={l}><Flag code={l} /></button>)}</span>
      </header>
      <section className="invite-wrap">
        <div className="free-panel invite-panel">
          <h1>{t.title}</h1>
          <p>{promoOn ? t.text : t.textAfter}</p>

          <div className="invite-preview">
            <img src={IMAGE} alt="" />
            <div><small>{t.preview}</small><pre>{msg}</pre></div>
          </div>

          <button type="button" className="free-btn invite-main" onClick={() => void shareWithPhoto()}>
            <Share2 size={20} /> <span><b>{t.withPhoto}</b><small>{t.withPhotoSub}</small></span>
          </button>

          <div className="invite-grid">
            {nets.map((n) => n.href
              ? <a key={n.key} className={`invite-net n-${n.key}`} href={n.href} target="_blank" rel="noreferrer">{n.icon}<span>{n.label}</span></a>
              : <button key={n.key} type="button" className={`invite-net n-${n.key}`} onClick={n.onClick}>{n.icon}<span>{n.label}</span></button>)}
          </div>

          <button type="button" className="invite-copy" onClick={() => void copyText()}>{notice === t.copied ? <Check size={16} /> : <Copy size={16} />} {t.copy}</button>
          {notice && <div className="invite-notice">{notice}</div>}

          <Link className="invite-back" to="/free">{t.back} →</Link>
        </div>
      </section>
    </main>
  );
}

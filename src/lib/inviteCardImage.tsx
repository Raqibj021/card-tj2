import { toJpeg } from "html-to-image";
import { MapPin, Phone, UserPlus } from "lucide-react";
import QRCode from "qrcode";
import type { CSSProperties } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import FreeCover from "../components/FreeCover";
import WhatsAppIcon from "../components/icons/WhatsAppIcon";
import { copy, Flag, InstagramIcon, initials, TelegramIcon } from "../pages/FreeCardPage";
import { findFreeCardDesign } from "./freeCardDesigns";
import type { CardInvite } from "./inviteRepository";
import "../pages/FreeCardPage.css";

type Lang = "tj" | "ru" | "en";
const extra = {
  tj: { ready: "Визиткаи шумо омода шуд", demo: "ФАЪОЛ НЕСТ", scan: "Барои гирифтан скан кунед", gift: "🎁 + корти NFC тӯҳфа", days: "3 рӯз нигоҳ дошта мешавад" },
  ru: { ready: "Ваша визитка готова", demo: "НЕ АКТИВИРОВАНА", scan: "Сканируйте, чтобы забрать", gift: "🎁 + NFC-карта в подарок", days: "Хранится 3 дня" },
  en: { ready: "Your card is ready", demo: "NOT ACTIVATED", scan: "Scan to claim it", gift: "🎁 + free NFC card", days: "Kept for 3 days" }
};

function Shot({ inv, qr, placesLeft }: { inv: CardInvite; qr: string; placesLeft: number | null }) {
  const lang = (["tj", "ru", "en"].includes(inv.language) ? inv.language : "tj") as Lang;
  const t = copy[lang];
  const x = extra[lang];
  const design = findFreeCardDesign(inv.design);
  const style = { "--c1": design.c1, "--c2": design.c2, "--acc": design.accent } as CSSProperties;
  return (
    <div className="free-page invite-shot" style={style}>
      <div className="invite-shot-top">
        <b>VIZORA.TJ</b>
        {placesLeft ? <span className="invite-shot-gift">{x.gift}</span> : null}
      </div>
      <h2 className="invite-shot-title">{x.ready}</h2>
      <article className="free-window done">
        <div className="free-window-head">
          <span><small>{t.kicker}</small><strong>{inv.full_name}</strong></span>
          <span className="free-window-flags"><Flag code="tj" /><Flag code="ru" /><Flag code="en" /></span>
        </div>
        <div className="free-cover">
          <div className="free-cover-img" style={{ transform: "scale(1.06)" }}><FreeCover design={design.key} /></div>
          <div className="free-photo">{inv.photo_data ? <img src={inv.photo_data} alt="" /> : <span>{initials(inv.full_name)}</span>}</div>
        </div>
        <div className="free-window-body">
          <h3>{inv.full_name}</h3>
          <p>{inv.profession}</p>
          {inv.city && <small><MapPin size={13} /> {inv.city}</small>}
          <div className="free-socials">
            <em className={inv.telegram ? "on" : ""}><TelegramIcon size={22} /></em>
            <em className="on wa"><WhatsAppIcon size={22} /></em>
            <em className={inv.instagram ? "on" : ""}><InstagramIcon size={22} /></em>
          </div>
          <div className="free-acts">
            <span className="on"><Phone size={16} />{t.call}</span>
            <span className={inv.city ? "on" : ""}><MapPin size={16} />{inv.city || "—"}</span>
          </div>
          <div className="free-save"><UserPlus size={17} /> {t.save}</div>
          <div className="invite-shot-qr">
            <div className="invite-shot-qr-box">
              <img src={qr} alt="" />
              <span>{x.demo}</span>
            </div>
            <div><b>{x.scan}</b><small>{x.days}</small></div>
          </div>
        </div>
      </article>
    </div>
  );
}

/** Picture of the specialist's card exactly as on /free, with a not-yet-active QR that opens the claim page. */
export async function renderInviteCardImage(inv: CardInvite, claimUrl: string, placesLeft: number | null) {
  const qr = await QRCode.toDataURL(claimUrl, { margin: 1, width: 360, errorCorrectionLevel: "H", color: { dark: "#0b1220", light: "#ffffff" } });
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:420px;pointer-events:none";
  document.body.appendChild(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<Shot inv={inv} qr={qr} placesLeft={placesLeft} />));
    await document.fonts.ready;
    await Promise.all(Array.from(host.querySelectorAll("img")).map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
    const node = host.firstElementChild as HTMLElement;
    const url = await toJpeg(node, { quality: 0.93, pixelRatio: 1080 / 420, skipFonts: true, backgroundColor: "#06142e" });
    return await (await fetch(url)).blob();
  } finally {
    root.unmount();
    host.remove();
  }
}

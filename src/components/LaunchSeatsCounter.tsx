import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { promoRepository, type LaunchPromoStatus } from "../lib/promoRepository";

const copy = {
  ru: { label: "Стартовая акция Vizora", title: "Бесплатных личных визиток на 1 год", left: "мест осталось", taken: "занято", hint: "Первые 50 пользователей получают визитку бесплатно и NFC-карту в подарок" },
  tj: { label: "Иқдоми оғози Vizora", title: "Варақаҳои шахсии ройгон барои 1 сол", left: "ҷой монд", taken: "band", hint: "50 корбари аввал варақаи ройгон ва корти NFC-ро тӯҳфа мегиранд" },
  en: { label: "Vizora launch offer", title: "Free personal cards for 1 year", left: "places left", taken: "taken", hint: "The first 50 users get a free card and an NFC card as a gift" }
};

export default function LaunchSeatsCounter() {
  const { language } = useApp();
  const [promo, setPromo] = useState<LaunchPromoStatus | null>(null);
  useEffect(() => {
    let active = true;
    void promoRepository.status().then((data) => { if (active) setPromo(data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  if (!promo || promo.limit <= 0) return null;
  const c = copy[language];
  const taken = Math.min(promo.limit, promo.limit - promo.remaining);
  return (
    <aside className="launch-seats" aria-label={c.label}>
      <div className="launch-seats-main">
        <span className="launch-seats-badge"><Users size={15} />{c.label}</span>
        <h2>{c.title}</h2>
        <p>{c.hint}</p>
      </div>
      <div className="launch-seats-count">
        <strong>{promo.remaining}<small>/{promo.limit}</small></strong>
        <span>{c.left}</span>
        <div className="launch-seats-bar" role="progressbar" aria-valuemin={0} aria-valuemax={promo.limit} aria-valuenow={taken}>
          {Array.from({ length: promo.limit }, (_, index) => (
            <i key={index} className={index < taken ? "is-taken" : ""} />
          ))}
        </div>
        <small className="launch-seats-taken">{taken}/{promo.limit} {c.taken}</small>
      </div>
    </aside>
  );
}

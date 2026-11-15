import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { promoRepository, type LaunchPromoStatus } from "../lib/promoRepository";

const copy = {
  ru: { label: "Стартовая акция", left: "мест осталось" },
  tj: { label: "Иқдоми оғоз", left: "ҷой монд" },
  en: { label: "Launch offer", left: "places left" }
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
  const percent = Math.round((taken / promo.limit) * 100);
  return (
    <div className="launch-seats" aria-label={c.label}>
      <span className="launch-seats-label">{c.label}</span>
      <strong className="launch-seats-count">{promo.remaining}/{promo.limit} <small>{c.left}</small></strong>
      <div className="launch-seats-bar" role="progressbar" aria-valuemin={0} aria-valuemax={promo.limit} aria-valuenow={taken}>
        <i style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

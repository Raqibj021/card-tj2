import { Link } from "react-router";
import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { promoRepository, type LaunchPromoStatus } from "../lib/promoRepository";

const copy = {
  ru: { label: "Акция 🎁", left: "мест осталось", more: "Подробнее" },
  tj: { label: "Иқдом 🎁", left: "ҷой монд", more: "Бештар" },
  en: { label: "Offer 🎁", left: "places left", more: "Learn more" }
};

export default function LaunchSeatsCounter() {
  const { language } = useApp();
  const [promo, setPromo] = useState<LaunchPromoStatus | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let active = true;
    void promoRepository.status().then((data) => { if (active) setPromo(data); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!promo) return;
    const target = promo.remaining;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(target); return; }
    let frame = 0;
    const start = performance.now();
    const duration = 1300;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setShown(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [promo]);

  if (!promo || promo.limit <= 0) return null;
  const c = copy[language];
  const taken = Math.min(promo.limit, promo.limit - promo.remaining);
  const percent = Math.round((taken / promo.limit) * 100);
  return (
    <div className="launch-seats" aria-label={c.label}>
      <span className="launch-seats-label">{c.label}</span>
      <strong className="launch-seats-count"><span>{shown}</span>/{promo.limit} <small>{c.left}</small></strong>
      <div className="launch-seats-bar" role="progressbar" aria-valuemin={0} aria-valuemax={promo.limit} aria-valuenow={taken}>
        <i style={{ ["--fill" as string]: `${percent}%` }} />
      </div>
      <Link to="/akciya" className="launch-seats-more">{c.more} →</Link>
    </div>
  );
}

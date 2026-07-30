import { Gift, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";
import { promoRepository, type LaunchPromoStatus } from "../lib/promoRepository";

export default function LaunchPromo({ compact = false }: { compact?: boolean }) {
  const { language } = useApp();
  const [promo, setPromo] = useState<LaunchPromoStatus | null>(null);
  useEffect(() => {
    void promoRepository.status().then(setPromo).catch(() => setPromo(null));
  }, []);
  const copy = {
    ru: { label: "В честь запуска Vizora", title: "Первые 50 пользователей получают личную визитку бесплатно на 1 год", detail: "Акция применяется только после создания личной визитки и нажатия отдельной кнопки. Для организаций она недоступна.", limit: "Свободных мест", action: "Создать визитку" },
    tj: { label: "Ба муносибати оғози Vizora", title: "50 корбари аввал варақаи шахсиро барои 1 сол ройгон мегиранд", detail: "Аксия танҳо пас аз сохтани варақаи шахсӣ ва пахши тугмаи махсус истифода мешавад. Барои ташкилотҳо дастрас нест.", limit: "Ҷойҳои озод", action: "Сохтани варақа" },
    en: { label: "Vizora launch offer", title: "The first 50 users receive a personal card free for 1 year", detail: "The offer is claimed with a separate button after creating a personal card. Organizations are not eligible.", limit: "Places remaining", action: "Create a card" }
  }[language];
  if (promo && promo.remaining <= 0) return null;
  return (
    <div className={compact ? "launch-promo launch-promo-compact" : "launch-promo"}>
      <div className="launch-promo-icon"><Gift size={compact ? 18 : 24} /></div>
      <div>
        <span>{copy.label}</span>
        <strong>{copy.title}</strong>
        {!compact && <p>{copy.detail}</p>}
      </div>
      <div className="launch-promo-limit">
        <Users size={16} />
        <span>{copy.limit}{promo ? `: ${promo.remaining}/${promo.limit}` : ""}</span>
      </div>
      <Link to="/create" className="button button-light">{copy.action}</Link>
    </div>
  );
}

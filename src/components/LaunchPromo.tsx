import { Gift, Users } from "lucide-react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";

export default function LaunchPromo({ compact = false }: { compact?: boolean }) {
  const { language } = useApp();
  const copy = {
    ru: { label: "В честь запуска Vizora", title: "Первые 50 пользователей получают личную визитку бесплатно на 1 год", detail: "Одно место на одного подтверждённого пользователя. После акции — 20 сомони в год.", limit: "Всего 50 мест", action: "Получить бесплатно" },
    tj: { label: "Ба муносибати оғози Vizora", title: "50 корбари аввал варақаи шахсиро барои 1 сол ройгон мегиранд", detail: "Як ҷой барои як корбари тасдиқшуда. Пас аз иқдом — 20 сомонӣ дар як сол.", limit: "Ҳамагӣ 50 ҷой", action: "Ройгон гирифтан" },
    en: { label: "Vizora launch offer", title: "The first 50 users receive a personal card free for 1 year", detail: "One place per verified user. After the offer — 20 somoni per year.", limit: "Only 50 places", action: "Get it free" }
  }[language];
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
        <span>{copy.limit}</span>
      </div>
      <Link to="/register" className="button button-light">{copy.action}</Link>
    </div>
  );
}

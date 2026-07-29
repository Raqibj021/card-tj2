import { Gift, Users } from "lucide-react";
import { Link } from "react-router";

export default function LaunchPromo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "launch-promo launch-promo-compact" : "launch-promo"}>
      <div className="launch-promo-icon"><Gift size={compact ? 18 : 24} /></div>
      <div>
        <span>В честь запуска Vizora</span>
        <strong>Первые 50 пользователей получают личную визитку бесплатно на 1 год</strong>
        {!compact && <p>Одно место на одного подтверждённого пользователя. После акции — 20 сомони в год.</p>}
      </div>
      <div className="launch-promo-limit">
        <Users size={16} />
        <span>Всего 50 мест</span>
      </div>
      <Link to="/register" className="button button-light">Получить бесплатно</Link>
    </div>
  );
}

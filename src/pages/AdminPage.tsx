import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CreditCard,
  Eye,
  Info,
  MoreHorizontal,
  TrendingUp,
  Users
  ,ShoppingBag
} from "lucide-react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";
import { cardRepository } from "../lib/cardRepository";
import { formatDate, themeColors } from "../lib/cardUtils";

const chart = [38, 48, 44, 63, 58, 74, 69, 82, 77, 91, 86, 96];

export default function AdminPage() {
  const { t, language } = useApp();
  const cards = cardRepository.list();
  const localViews = cards.reduce((sum, card) => sum + card.views, 0);
  const stats = [
    { label: t("users"), value: "126", trend: "+12.4%", icon: Users, up: true },
    {
      label: t("cards"),
      value: (384 + cards.length).toLocaleString(),
      trend: "+8.7%",
      icon: CreditCard,
      up: true
    },
    {
      label: t("views"),
      value: (18420 + localViews).toLocaleString(),
      trend: "+21.6%",
      icon: Eye,
      up: true
    },
    {
      label: t("growth"),
      value: "18.2%",
      trend: "-1.3%",
      icon: TrendingUp,
      up: false
    }
  ];

  return (
    <main className="admin-page">
      <div className="site-container py-10 md:py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="section-label">{t("adminEyebrow")}</span>
            <h1 className="page-title">{t("adminTitle")}</h1>
            <p className="page-copy">{t("adminText")}</p>
          </div>
          <div className="admin-period">
            <span className="live-dot" />
            Июль 2026
          </div>
          <Link to="/admin/payments" className="button button-primary">
            <CreditCard size={17} /> Проверить оплаты
          </Link>
          <Link to="/admin/moderation" className="button button-secondary">
            <Info size={17} /> Модерация
          </Link>
          <Link to="/admin/commerce" className="button button-secondary">
            <ShoppingBag size={17} /> Заказы
          </Link>
        </div>

        <div className="admin-notice mt-8">
          <Info size={18} />
          <span>{t("demoNotice")}</span>
        </div>

        <div className="admin-stats">
          {stats.map(({ label, value, trend, icon: Icon, up }) => (
            <article key={label}>
              <div className="admin-stat-icon"><Icon size={21} /></div>
              <p>{label}</p>
              <div className="flex items-end justify-between gap-4">
                <strong>{value}</strong>
                <span className={up ? "trend-up" : "trend-down"}>
                  {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {trend}
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Динамика просмотров</h2>
                <p>Последние 12 месяцев · демонстрация</p>
              </div>
              <BarChart3 size={20} />
            </div>
            <div className="admin-chart" aria-label="График просмотров">
              <div className="chart-grid-lines"><i /><i /><i /><i /></div>
              <div className="chart-bars">
                {chart.map((height, index) => (
                  <div key={index} className="chart-column">
                    <span style={{ height: `${height}%` }} />
                    <small>
                      {["Авг", "Сен", "Окт", "Ноя", "Дек", "Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл"][index]}
                    </small>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div>
                <h2>Популярные шаблоны</h2>
                <p>Распределение визиток</p>
              </div>
            </div>
            <div className="template-stats">
              {[
                ["Деловой", 54, "#0f766e"],
                ["Минималистичный", 29, "#1d4ed8"],
                ["Акцентный", 17, "#7e22ce"]
              ].map(([name, value, color]) => (
                <div key={String(name)}>
                  <div><span>{name}</span><strong>{value}%</strong></div>
                  <i><b style={{ width: `${value}%`, backgroundColor: String(color) }} /></i>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="admin-panel mt-6">
          <div className="admin-panel-heading">
            <div>
              <h2>{t("recentCards")}</h2>
              <p>Последние изменения в платформе</p>
            </div>
            <Link to="/dashboard" className="text-link">
              {t("dashboard")} <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("cards")}</th>
                  <th>{t("template")}</th>
                  <th>{t("views")}</th>
                  <th>{t("date")}</th>
                  <th>{t("status")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cards.slice(0, 6).map((card) => {
                  const palette = themeColors[card.theme];
                  return (
                    <tr key={card.id}>
                      <td>
                        <Link to={`/card/${card.slug}`} className="table-person">
                          {card.photo ? (
                            <img src={card.photo} alt="" />
                          ) : (
                            <span style={{ backgroundColor: palette.soft, color: palette.accent }}>
                              {card.fullName.slice(0, 1)}
                            </span>
                          )}
                          <div><strong>{card.fullName}</strong><small>/{card.slug}</small></div>
                        </Link>
                      </td>
                      <td>{card.template}</td>
                      <td>{card.views.toLocaleString()}</td>
                      <td>{formatDate(card.updatedAt, language)}</td>
                      <td><span className="status-pill">{t("active")}</span></td>
                      <td><MoreHorizontal size={18} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

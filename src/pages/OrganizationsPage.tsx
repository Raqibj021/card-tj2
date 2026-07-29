import { ArrowRight, BadgeCheck, Building2, Check, Network, QrCode, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router";
import Footer from "../components/layout/Footer";

const plans = [
  { name: "Start", staff: "до 20 сотрудников", price: "200" },
  { name: "Business", staff: "до 50 сотрудников", price: "300", featured: true },
  { name: "Pro", staff: "до 100 сотрудников", price: "500" }
];

export default function OrganizationsPage() {
  return (
    <>
      <main>
        <section className="org-hero">
          <div className="site-container grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="section-label">Vizora для организаций</span>
              <h1>Вся структура организации — в одном QR-коде</h1>
              <p>Создавайте подразделения, управляйте визитками сотрудников и предоставляйте удобный доступ к проверенным контактам.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/organization/apply" className="button button-primary button-large">Зарегистрировать организацию <ArrowRight size={18} /></Link>
                <Link to="/support" className="button button-secondary button-large">Заказать под ключ</Link>
                <Link to="/organization/dashboard" className="button button-secondary button-large">Демо кабинета</Link>
              </div>
            </div>
            <div className="org-visual">
              <div className="org-card org-card-main">
                <span className="org-logo"><Building2 size={24} /></span>
                <div><small>Организация</small><strong>Университет «Сомон»</strong></div>
                <BadgeCheck size={21} />
              </div>
              <div className="org-tree">
                <div><Network size={18} /><span>Ректорат</span><b>8</b></div>
                <div><Users size={18} /><span>Факультеты</span><b>46</b></div>
                <div><ShieldCheck size={18} /><span>Администрация</span><b>12</b></div>
              </div>
              <div className="org-qr"><QrCode size={72} /><span>Общий QR организации</span></div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="site-container">
            <div className="section-heading">
              <span className="section-label">Годовые тарифы</span>
              <h2>Выберите размер организации</h2>
              <p>Стартовые цены для первых организаций Vizora</p>
            </div>
            <div className="org-pricing-grid">
              {plans.map((plan) => (
                <article className={`org-plan ${plan.featured ? "org-plan-featured" : ""}`} key={plan.name}>
                  {plan.featured && <span className="org-plan-label">Популярный</span>}
                  <h3>{plan.name}</h3>
                  <p>{plan.staff}</p>
                  <div><strong>{plan.price}</strong><span>сомони / год</span></div>
                  <ul>
                    <li><Check size={16} /> Общий QR-код</li>
                    <li><Check size={16} /> Структура и подразделения</li>
                    <li><Check size={16} /> Визитки сотрудников</li>
                    <li><Check size={16} /> Управление и статистика</li>
                  </ul>
                  <Link to="/organization/apply" className="button button-primary w-full">Выбрать тариф</Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

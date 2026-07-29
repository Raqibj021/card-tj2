import { ArrowRight, BadgeCheck, Building2, Check, Network, QrCode, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router";
import Footer from "../components/layout/Footer";
import { useApp } from "../context/AppContext";

export default function OrganizationsPage() {
  const { language } = useApp();
  const copy = {
    ru: { label: "Vizora для организаций", title: "Вся структура организации — в одном QR-коде", text: "Создавайте подразделения, управляйте визитками сотрудников и предоставляйте удобный доступ к проверенным контактам.", register: "Зарегистрировать организацию", turnkey: "Заказать под ключ", demo: "Демо кабинета", organization: "Организация", rectorate: "Ректорат", faculties: "Факультеты", administration: "Администрация", commonQr: "Общий QR организации", annual: "Годовые тарифы", chooseSize: "Выберите размер организации", startPrices: "Стартовые цены для первых организаций Vizora", popular: "Популярный", perYear: "сомони / год", features: ["Общий QR-код", "Структура и подразделения", "Визитки сотрудников", "Управление и статистика"], choose: "Выбрать тариф", staff: ["до 20 сотрудников", "до 50 сотрудников", "до 100 сотрудников"] },
    tj: { label: "Vizora барои ташкилотҳо", title: "Тамоми сохтори ташкилот — дар як QR-код", text: "Шуъбаҳо созед, варақаҳои кормандонро идора кунед ва ба тамосҳои тасдиқшуда дастрасии осон диҳед.", register: "Сабти ташкилот", turnkey: "Фармоиши пурра", demo: "Намоиши кабинет", organization: "Ташкилот", rectorate: "Ректорат", faculties: "Факултетҳо", administration: "Маъмурият", commonQr: "QR-и умумии ташкилот", annual: "Тарофаҳои солона", chooseSize: "Андозаи ташкилотро интихоб кунед", startPrices: "Нархҳои оғозӣ барои ташкилотҳои аввалини Vizora", popular: "Маъмул", perYear: "сомонӣ / сол", features: ["QR-коди умумӣ", "Сохтор ва шуъбаҳо", "Варақаҳои кормандон", "Идоракунӣ ва омор"], choose: "Интихоби тарофа", staff: ["то 20 корманд", "то 50 корманд", "то 100 корманд"] },
    en: { label: "Vizora for organizations", title: "Your entire organization in one QR code", text: "Create departments, manage employee business cards and provide easy access to verified contacts.", register: "Register organization", turnkey: "Order turnkey service", demo: "Dashboard demo", organization: "Organization", rectorate: "Rectorate", faculties: "Faculties", administration: "Administration", commonQr: "Organization QR code", annual: "Annual plans", chooseSize: "Choose your organization size", startPrices: "Launch pricing for the first Vizora organizations", popular: "Popular", perYear: "somoni / year", features: ["Shared QR code", "Structure and departments", "Employee business cards", "Management and analytics"], choose: "Choose plan", staff: ["up to 20 employees", "up to 50 employees", "up to 100 employees"] }
  }[language];
  const plans = [
    { name: "Start", staff: copy.staff[0], price: "200" },
    { name: "Business", staff: copy.staff[1], price: "300", featured: true },
    { name: "Pro", staff: copy.staff[2], price: "500" }
  ];
  return (
    <>
      <main>
        <section className="org-hero">
          <div className="site-container grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <span className="section-label">{copy.label}</span>
              <h1>{copy.title}</h1>
              <p>{copy.text}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/organization/apply" className="button button-primary button-large">{copy.register} <ArrowRight size={18} /></Link>
                <Link to="/support" className="button button-secondary button-large">{copy.turnkey}</Link>
                <Link to="/organization/dashboard" className="button button-secondary button-large">{copy.demo}</Link>
              </div>
            </div>
            <div className="org-visual">
              <div className="org-card org-card-main">
                <span className="org-logo"><Building2 size={24} /></span>
                <div><small>{copy.organization}</small><strong>Somon University</strong></div>
                <BadgeCheck size={21} />
              </div>
              <div className="org-tree">
                <div><Network size={18} /><span>{copy.rectorate}</span><b>8</b></div>
                <div><Users size={18} /><span>{copy.faculties}</span><b>46</b></div>
                <div><ShieldCheck size={18} /><span>{copy.administration}</span><b>12</b></div>
              </div>
              <div className="org-qr"><QrCode size={72} /><span>{copy.commonQr}</span></div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="site-container">
            <div className="section-heading">
              <span className="section-label">{copy.annual}</span>
              <h2>{copy.chooseSize}</h2>
              <p>{copy.startPrices}</p>
            </div>
            <div className="org-pricing-grid">
              {plans.map((plan) => (
                <article className={`org-plan ${plan.featured ? "org-plan-featured" : ""}`} key={plan.name}>
                  {plan.featured && <span className="org-plan-label">{copy.popular}</span>}
                  <h3>{plan.name}</h3>
                  <p>{plan.staff}</p>
                  <div><strong>{plan.price}</strong><span>{copy.perYear}</span></div>
                  <ul>
                    {copy.features.map((feature) => <li key={feature}><Check size={16} /> {feature}</li>)}
                  </ul>
                  <Link to="/organization/apply" className="button button-primary w-full">{copy.choose}</Link>
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

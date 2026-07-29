import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  Check,
  ContactRound,
  LayoutGrid,
  Layers3,
  Link2,
  Palette,
  QrCode,
  RefreshCw,
  Share2,
  Sparkles,
  Zap
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import CardPreview from "../components/CardPreview";
import Footer from "../components/layout/Footer";
import { useApp } from "../context/AppContext";
import { demoCards } from "../data/demo";
import LaunchPromo from "../components/LaunchPromo";
import type { DigitalCard } from "../types/card";

export default function HomePage() {
  const { t } = useApp();
  const [selectedDesign, setSelectedDesign] = useState<DigitalCard | null>(null);
  const showcaseDesigns = demoCards.slice(0, 8);

  useEffect(() => {
    if (!selectedDesign) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedDesign(null);
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedDesign]);

  const benefits = [
    {
      icon: RefreshCw,
      title: t("benefitOne"),
      text: t("benefitOneText")
    },
    { icon: Share2, title: t("benefitTwo"), text: t("benefitTwoText") },
    { icon: Palette, title: t("benefitThree"), text: t("benefitThreeText") },
    { icon: Layers3, title: t("benefitFour"), text: t("benefitFourText") }
  ];

  const steps = [
    { number: "01", icon: ContactRound, title: t("howOne"), text: t("howOneText") },
    { number: "02", icon: Palette, title: t("howTwo"), text: t("howTwoText") },
    { number: "03", icon: QrCode, title: t("howThree"), text: t("howThreeText") }
  ];

  const plans = [
    {
      name: "Личная визитка",
      price: "20",
      features: ["Персональный QR-код", "vCard и готовые шаблоны", "Доступ по ссылке и QR"]
    },
    {
      name: "Проверенный специалист",
      price: "50",
      featured: true,
      features: ["Публикация в каталоге", "Проверка документов", "Портфолио и статистика"]
    },
    {
      name: "Специалист PRO",
      price: "100",
      features: ["Приоритет в каталоге", "До 20 фотографий", "Индивидуальное оформление"]
    }
  ];

  const faqs = [
    [t("faqOne"), t("faqOneText")],
    [t("faqTwo"), t("faqTwoText")],
    [t("faqThree"), t("faqThreeText")],
    [t("faqFour"), t("faqFourText")]
  ];

  return (
    <>
      <main>
        <div className="site-container pt-4">
          <LaunchPromo compact />
        </div>
        <section className="hero-section overflow-hidden">
          <div className="hero-grid-pattern" />
          <div className="site-container hero-layout relative grid min-h-[760px] items-center gap-16 py-14 lg:grid-cols-[1.08fr_.92fr] xl:min-h-[800px]">
            <div className="hero-content">
              <div className="eyebrow">
                <Sparkles size={15} />
                {t("heroEyebrow")}
              </div>
              <h1 className="hero-title">{t("heroTitle")}</h1>
              <p className="hero-copy">{t("heroText")}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/create" className="button button-primary button-large">
                  {t("create")}
                  <ArrowRight size={19} />
                </Link>
                <Link to="/card/firuz" className="button button-secondary button-large">
                  {t("example")}
                </Link>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-7 gap-y-3 text-sm text-[var(--muted)]">
                <span className="inline-flex items-center gap-2">
                  <BadgeCheck size={18} className="text-teal-600" />
                  {t("freeStart")}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Zap size={18} className="text-teal-600" />
                  {t("noInstall")}
                </span>
                <span className="inline-flex items-center gap-2">
                  <Link2 size={18} className="text-teal-600" />
                  1 240+ {t("cardsCreated")}
                </span>
              </div>
            </div>

            <div className="hero-showcase" aria-label="Пример электронной визитки">
              <div className="hero-orbit hero-orbit-one" />
              <div className="hero-orbit hero-orbit-two" />
              <div className="phone-shell">
                <div className="phone-speaker" />
                <CardPreview card={demoCards[0]} />
              </div>
              <div className="floating-chip floating-chip-top">
                <QrCode size={19} />
                <span>QR готов</span>
              </div>
              <div className="floating-chip floating-chip-bottom">
                <BadgeCheck size={19} />
                <span>Контакт сохранён</span>
              </div>
            </div>
          </div>
        </section>

        <section className="design-showcase-section" aria-label={t("examplesTitle")}>
          <div className="site-container">
            <div className="design-showcase-head">
              <div>
                <span className="section-label">{t("designCount")}</span>
                <h2>{t("examplesTitle")}</h2>
                <p>{t("examplesText")}</p>
              </div>
              <Link to="/create">{t("create")} <ArrowRight size={15} /></Link>
            </div>
          </div>
          <div className="design-showcase-marquee">
            <div className="design-showcase-track">
              {[...showcaseDesigns, ...showcaseDesigns].map((card, index) => (
                <button
                  key={`${card.id}-${index}`}
                  type="button"
                  className="design-showcase-item"
                  onClick={() => setSelectedDesign(card)}
                  aria-label={`${t("openCard")}: ${card.fullName}`}
                >
                  <div className="design-showcase-canvas">
                    <CardPreview card={card} />
                  </div>
                  <div className="design-showcase-caption">
                    <span>
                      <strong>{card.template === "minimal" ? "Neon" : card.template === "creative" ? "Atelier" : "Premium"}</strong>
                      <small>{card.organization}</small>
                    </span>
                    <ArrowRight size={15} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="section home-benefits">
          <div className="site-container">
            <div className="section-heading">
              <span className="section-label">Vizora.tj</span>
              <h2>{t("benefitTitle")}</h2>
              <p>{t("benefitText")}</p>
            </div>
            <div className="home-benefits-grid mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map(({ icon: Icon, title, text }) => (
                <article key={title} className="feature-card">
                  <div className="feature-icon"><Icon size={22} /></div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
            <div className="mobile-benefits-marquee" aria-label={t("benefitTitle")}>
              <div className="mobile-benefits-track">
                {[...benefits, ...benefits].map(({ icon: Icon, title, text }, index) => (
                  <article key={`${title}-${index}`} className="mobile-benefit-pill">
                    <div className="feature-icon"><Icon size={17} /></div>
                    <span>
                      <strong>{title}</strong>
                      <small>{text}</small>
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section section-muted home-desktop-detail">
          <div className="site-container">
            <div className="section-heading">
              <span className="section-label">01 — 03</span>
              <h2>{t("howTitle")}</h2>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {steps.map(({ number, icon: Icon, title, text }) => (
                <article key={number} className="step-card">
                  <span className="step-number">{number}</span>
                  <div className="feature-icon"><Icon size={22} /></div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section overflow-hidden home-desktop-detail">
          <div className="site-container">
            <div className="section-heading">
              <span className="section-label">Templates</span>
              <h2>{t("examplesTitle")}</h2>
              <p>{t("examplesText")}</p>
            </div>
            <div className="example-grid mt-12">
              {demoCards.map((card) => (
                <div key={card.id} className="example-card-wrap">
                  <CardPreview card={card} />
                  <Link to={`/card/${card.slug}`} className="text-link mt-5">
                    {t("openCard")} <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
              <div className="example-create-card">
                <div className="example-plus">+</div>
                <h3>{t("builderTitle")}</h3>
                <p>{t("builderText")}</p>
                <Link to="/create" className="button button-primary mt-6">
                  {t("create")} <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-dark home-desktop-detail">
          <div className="site-container">
            <div className="section-heading section-heading-light">
              <span className="section-label">Pricing</span>
              <h2>{t("pricingTitle")}</h2>
              <p>{t("pricingText")}</p>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <article
                  key={plan.name}
                  className={`pricing-card ${plan.featured ? "pricing-card-featured" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="pricing-badge">{t("testTariff")}</span>
                      <h3>{plan.name}</h3>
                    </div>
                    {plan.featured && <Sparkles size={22} className="text-teal-300" />}
                  </div>
                  <div className="pricing-price">
                    <strong>{plan.price}</strong>
                    <span>сомони / год</span>
                  </div>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}><Check size={17} /> {feature}</li>
                    ))}
                  </ul>
                  <Link
                    to="/create"
                    className={`button w-full ${
                      plan.featured ? "button-primary" : "button-dark-outline"
                    }`}
                  >
                    {t("choose")} <ArrowRight size={18} />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section home-desktop-detail">
          <div className="site-container grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div className="section-heading !text-left">
              <span className="section-label">FAQ</span>
              <h2>{t("faqTitle")}</h2>
            </div>
            <div className="faq-list">
              {faqs.map(([question, answer], index) => (
                <details key={question} open={index === 0}>
                  <summary>{question}<span>+</span></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-20 home-desktop-detail">
          <div className="site-container">
            <div className="cta-panel">
              <div>
                <span className="section-label">Vizora.tj</span>
                <h2>{t("heroTitle")}</h2>
                <p>{t("heroText")}</p>
              </div>
              <Link to="/create" className="button button-light button-large shrink-0">
                {t("create")} <ArrowRight size={19} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mobile-home-hub">
          <div className="site-container">
            <div className="mobile-home-hub-head">
              <span className="section-label">Возможности Vizora</span>
              <h2>Всё нужное — в одном месте</h2>
              <p>Выберите нужный раздел без долгой прокрутки страницы.</p>
            </div>
            <div className="mobile-home-links">
              <Link to="/card/firuz">
                <QrCode size={21} />
                <span><strong>{t("example")}</strong><small>Готовая цифровая визитка</small></span>
                <ArrowRight size={17} />
              </Link>
              <Link to="/directory">
                <LayoutGrid size={21} />
                <span><strong>Каталог специалистов</strong><small>Найдите проверенного исполнителя</small></span>
                <ArrowRight size={17} />
              </Link>
              <Link to="/organizations">
                <Building2 size={21} />
                <span><strong>Для организаций</strong><small>Тарифы и управление сотрудниками</small></span>
                <ArrowRight size={17} />
              </Link>
            </div>
            <Link to="/create" className="button button-primary button-large w-full">
              {t("create")} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>
      {selectedDesign && (
        <div
          className="design-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={selectedDesign.fullName}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelectedDesign(null);
          }}
        >
          <div className="design-viewer-panel">
            <button
              type="button"
              className="design-viewer-back"
              onClick={() => setSelectedDesign(null)}
            >
              <ArrowLeft size={18} /> {t("back")}
            </button>
            <div className="design-viewer-card">
              <CardPreview card={selectedDesign} />
            </div>
            <Link to="/create" className="button button-primary" onClick={() => setSelectedDesign(null)}>
              {t("chooseDesign")} <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      )}
      <Footer />
    </>
  );
}

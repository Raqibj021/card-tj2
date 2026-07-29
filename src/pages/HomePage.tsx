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
  const { t, language } = useApp();
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

  const homeCopy = {
    ru: {
      cardExample: "Пример электронной визитки", qrReady: "QR готов", saved: "Контакт сохранён", perYear: "сомони / год", pricing: "Тарифы", faq: "Вопросы и ответы",
      mobileLabel: "Возможности Vizora", mobileTitle: "Всё нужное — в одном месте", mobileText: "Выберите нужный раздел без долгой прокрутки страницы.",
      impactLabel: "Возможности в действии", impactStat: "визиток уже работают",
      journeyLabel: "От идеи до готового профиля", journeyText: "Заполните данные один раз — Vizora превратит их в красивую визитку, которой удобно делиться.",
      liveCard: "Живая визитка", linkReady: "Ссылка готова",
      readyCard: "Готовая цифровая визитка", directory: "Каталог специалистов", directoryText: "Найдите проверенного исполнителя",
      forOrganizations: "Для организаций", organizationText: "Тарифы и управление сотрудниками",
      plans: [
        ["Личная визитка", ["Персональный QR-код", "vCard и готовые шаблоны", "Доступ по ссылке и QR"]],
        ["Проверенный специалист", ["Публикация в каталоге", "Проверка документов", "Портфолио и статистика"]],
        ["Специалист PRO", ["Приоритет в каталоге", "До 20 фотографий", "Индивидуальное оформление"]]
      ]
    },
    tj: {
      cardExample: "Намунаи варақаи рақамӣ", qrReady: "QR омода аст", saved: "Тамос нигоҳ дошта шуд", perYear: "сомонӣ / сол", pricing: "Тарофаҳо", faq: "Саволу ҷавоб",
      mobileLabel: "Имкониятҳои Vizora", mobileTitle: "Ҳама чизи зарурӣ — дар як ҷой", mobileText: "Бахши лозимиро бе паймоиши тӯлонӣ интихоб кунед.",
      impactLabel: "Имкониятҳо дар амал", impactStat: "варақа аллакай фаъоланд",
      journeyLabel: "Аз ғоя то профили омода", journeyText: "Маълумотро як бор пур кунед — Vizora онро ба варақаи зебо ва омода барои мубодила табдил медиҳад.",
      liveCard: "Варақаи зинда", linkReady: "Пайванд омода аст",
      readyCard: "Варақаи рақамии омода", directory: "Феҳристи мутахассисон", directoryText: "Иҷрокунандаи тасдиқшударо ёбед",
      forOrganizations: "Барои ташкилотҳо", organizationText: "Тарофаҳо ва идоракунии кормандон",
      plans: [
        ["Варақаи шахсӣ", ["QR-коди шахсӣ", "vCard ва қолабҳои омода", "Дастрасӣ тавассути пайванд ва QR"]],
        ["Мутахассиси тасдиқшуда", ["Нашр дар феҳрист", "Санҷиши ҳуҷҷатҳо", "Портфолио ва омор"]],
        ["Мутахассиси PRO", ["Афзалият дар феҳрист", "То 20 акс", "Ороиши инфиродӣ"]]
      ]
    },
    en: {
      cardExample: "Digital business card example", qrReady: "QR ready", saved: "Contact saved", perYear: "somoni / year", pricing: "Pricing", faq: "FAQ",
      mobileLabel: "Vizora features", mobileTitle: "Everything you need in one place", mobileText: "Choose the section you need without a long scroll.",
      impactLabel: "Features in action", impactStat: "cards already live",
      journeyLabel: "From idea to a ready profile", journeyText: "Enter your details once — Vizora turns them into a beautiful card that is easy to share.",
      liveCard: "Live business card", linkReady: "Link is ready",
      readyCard: "Ready digital business card", directory: "Specialist directory", directoryText: "Find a verified professional",
      forOrganizations: "For organizations", organizationText: "Plans and employee management",
      plans: [
        ["Personal card", ["Personal QR code", "vCard and ready templates", "Access by link and QR"]],
        ["Verified specialist", ["Directory listing", "Document verification", "Portfolio and analytics"]],
        ["Specialist PRO", ["Priority in the directory", "Up to 20 photos", "Custom appearance"]]
      ]
    }
  }[language];
  const plans = homeCopy.plans.map(([name, features], index) => ({
    name: name as string,
    price: ["20", "50", "100"][index],
    featured: index === 1,
    features: features as string[]
  }));

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

            <div className="hero-showcase" aria-label={homeCopy.cardExample}>
              <div className="hero-orbit hero-orbit-one" />
              <div className="hero-orbit hero-orbit-two" />
              <div className="phone-shell">
                <div className="phone-speaker" />
                <CardPreview card={demoCards[0]} />
              </div>
              <div className="floating-chip floating-chip-top">
                <QrCode size={19} />
                <span>{homeCopy.qrReady}</span>
              </div>
              <div className="floating-chip floating-chip-bottom">
                <BadgeCheck size={19} />
                <span>{homeCopy.saved}</span>
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

        <section className="section home-benefits impact-section">
          <div className="site-container">
            <div className="impact-heading">
              <div>
                <span className="section-label">{homeCopy.impactLabel}</span>
                <h2>{t("benefitTitle")}</h2>
              </div>
              <p>{t("benefitText")}</p>
            </div>

            <div className="impact-bento">
              <article className="impact-card impact-photo-card">
                <img
                  src={`${import.meta.env.BASE_URL}images/home/professional-connection.webp`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <div className="impact-photo-shade" />
                <div className="impact-photo-content">
                  <div className="impact-avatars" aria-hidden="true">
                    {[demoCards[3], demoCards[2], demoCards[5]].map((card) => (
                      <img key={card.id} src={card.photo} alt="" />
                    ))}
                    <span>+</span>
                  </div>
                  <div className="impact-stat">
                    <strong>1 240+</strong>
                    <span>{homeCopy.impactStat}</span>
                  </div>
                </div>
              </article>

              {benefits.map(({ icon: Icon, title, text }, index) => (
                <article key={title} className={`impact-card impact-benefit impact-benefit-${index + 1}`}>
                  <div className="impact-benefit-top">
                    <div className="feature-icon"><Icon size={21} /></div>
                    <span className="impact-index">0{index + 1}</span>
                  </div>
                  <div className={`impact-visual impact-visual-${index + 1}`} aria-hidden="true">
                    {index === 0 && (
                      <>
                        <span /><span /><span />
                      </>
                    )}
                    {index === 1 && (
                      <>
                        <i /><i /><i />
                      </>
                    )}
                    {index === 2 && (
                      <>
                        <b /><b /><b /><b />
                      </>
                    )}
                    {index === 3 && (
                      <>
                        <em>RU</em><em>TJ</em><em>EN</em>
                      </>
                    )}
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section journey-section">
          <div className="site-container">
            <div className="journey-heading">
              <span className="section-label">{homeCopy.journeyLabel}</span>
              <h2>{t("howTitle")}</h2>
              <p>{homeCopy.journeyText}</p>
            </div>

            <div className="journey-layout">
              <figure className="journey-visual">
                <img
                  src={`${import.meta.env.BASE_URL}images/home/share-profile.webp`}
                  alt=""
                  loading="lazy"
                  decoding="async"
                />
                <div className="journey-photo-shade" />
                <figcaption className="journey-profile-chip">
                  <span><Sparkles size={16} /></span>
                  <div>
                    <strong>{homeCopy.liveCard}</strong>
                    <small>QR · vCard · Vizora.tj</small>
                  </div>
                </figcaption>
                <div className="journey-ready-chip">
                  <QrCode size={18} />
                  {homeCopy.linkReady}
                </div>
              </figure>

              <div className="journey-timeline">
                {steps.map(({ number, icon: Icon, title, text }) => (
                  <article key={number} className="journey-step">
                    <span className="journey-step-number">{number}</span>
                    <div className="journey-step-icon"><Icon size={20} /></div>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </article>
                ))}
                <Link to="/create" className="button button-primary button-large journey-cta">
                  {t("create")} <ArrowRight size={19} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="section section-dark home-desktop-detail">
          <div className="site-container">
            <div className="section-heading section-heading-light">
              <span className="section-label">{homeCopy.pricing}</span>
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
                    <span>{homeCopy.perYear}</span>
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
              <span className="section-label">{homeCopy.faq}</span>
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
              <span className="section-label">{homeCopy.mobileLabel}</span>
              <h2>{homeCopy.mobileTitle}</h2>
              <p>{homeCopy.mobileText}</p>
            </div>
            <div className="mobile-home-links">
              <Link to="/card/firuz">
                <QrCode size={21} />
                <span><strong>{t("example")}</strong><small>{homeCopy.readyCard}</small></span>
                <ArrowRight size={17} />
              </Link>
              <Link to="/directory">
                <LayoutGrid size={21} />
                <span><strong>{homeCopy.directory}</strong><small>{homeCopy.directoryText}</small></span>
                <ArrowRight size={17} />
              </Link>
              <Link to="/organizations">
                <Building2 size={21} />
                <span><strong>{homeCopy.forOrganizations}</strong><small>{homeCopy.organizationText}</small></span>
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

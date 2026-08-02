import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ContactRound,
  ExternalLink,
  Facebook,
  FileText,
  Globe2,
  HeartHandshake,
  Instagram,
  Languages,
  Lightbulb,
  Mail,
  Megaphone,
  MessageCircle,
  Palette,
  QrCode,
  Rocket,
  Send,
  ShieldCheck,
  Smartphone,
  SmartphoneNfc,
  Sparkles,
  Target,
  UsersRound,
  Workflow,
  type LucideIcon
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import BrandLogo from "../components/BrandLogo";
import QRCodeImage from "../components/QRCode";
import Footer from "../components/layout/Footer";
import { useApp } from "../context/AppContext";
import { publicSiteUrl } from "../lib/siteUrl";
import { supabase } from "../lib/supabase";
import "./AboutPage.css";

interface PlatformStats {
  users: number | null;
  organizations: number | null;
  cards: number | null;
}

const pageCopy = {
  ru: {
    seoTitle: "О Vizora.tj — история создания платформы цифровых визиток",
    seoDescription: "История основателя Vizora.tj Ракибджона Муродкулова, миссия платформы и поддержка Бюро «Тезаурус».",
    heroLabel: "История Vizora.tj",
    heroTitle: "Меня зовут Ракибджон!",
    heroRole: "Основатель платформы Vizora.tj",
    heroText: "Я создал Vizora.tj, чтобы сделать обмен контактами, цифровые визитки и профессиональные связи современными, удобными и доступными каждому.",
    heroAction: "Почему появилась Vizora",
    verified: "Профиль основателя",
    digitalIdentity: "Цифровая идентичность",
    qrReady: "QR готов к обмену",
    nfcReady: "NFC-ready",
    languagesShort: "RU · TJ · EN",
    storyLabel: "Как появилась идея",
    storyTitle: "Что привело меня к созданию Vizora.tj",
    storyLead: "Работая много лет в сфере полиграфии, дизайна и цифровых технологий, я ежедневно видел одну и ту же проблему.",
    storyText: "Люди теряли бумажные визитки, контакты быстро устаревали, а компаниям и учреждениям было неудобно управлять визитками сотрудников. Бумажный формат больше не соответствовал скорости современного мира.",
    storyResult: "Так появилась идея платформы нового поколения — живого цифрового профиля, который всегда актуален, открывается по ссылке, QR или NFC и помогает выстраивать профессиональные связи. Так появился Vizora.tj.",
    storyQuote: "Нужна была не ещё одна визитка, а единая живая система контактов.",
    storyPoints: ["Визитки терялись", "Контакты устаревали", "Структурой было сложно управлять"],
    supportLabel: "Опыт, ставший основой",
    supportTitle: "Создано при поддержке Бюро «Тезаурус»",
    supportText: "Платформа Vizora.tj разработана при поддержке Бюро «Тезаурус». Многолетний опыт в сфере переводов, полиграфии, дизайна, наружной рекламы, брендинга и цифровых технологий помог создать продукт, отвечающий реальным потребностям бизнеса, государственных учреждений и частных специалистов.",
    services: ["Переводы", "Полиграфия", "Дизайн", "Наружная реклама", "Брендинг", "Цифровые решения", "Документооборот"],
    missionLabel: "Наша миссия",
    missionTitle: "Сделать профессиональное общение проще",
    missionText: "Чтобы каждый человек, предприниматель, компания и государственная организация могли представить себя современно, красиво и профессионально — без технических сложностей.",
    valuesLabel: "Наши принципы",
    valuesTitle: "Ценности, на которых строится Vizora",
    values: [
      ["Надёжность", "Контакты и цифровая репутация должны быть доступны тогда, когда они нужны."],
      ["Инновации", "Используем QR, NFC и современные веб-технологии с практической пользой."],
      ["Простота", "Сложные возможности превращаем в понятные действия для каждого пользователя."],
      ["Современный дизайн", "Профессиональное первое впечатление начинается с сильной визуальной подачи."],
      ["Развитие", "Платформа растёт вместе с потребностями людей и организаций."],
      ["Польза людям", "Каждая функция должна экономить время и помогать создавать новые связи."]
    ],
    trustLabel: "Vizora в цифрах",
    trustTitle: "Технология, которой удобно пользоваться",
    statUsers: "публичных пользователей",
    statOrganizations: "организаций",
    statCards: "активных визиток",
    statLanguages: "языка интерфейса",
    statQrNfc: "QR и NFC",
    statDevices: "на всех устройствах",
    contactsLabel: "Прямой контакт",
    contactsTitle: "Будем на связи",
    contactsText: "Открыт к сотрудничеству, партнёрским проектам и предложениям по развитию Vizora.tj.",
    vizoraContacts: "Контакты Vizora.tj",
    vizoraContactsNote: "Платформа цифровых визиток",
    buroContacts: "Контакты Бюро «Тезаурус»",
    buroContactsNote: "Переводы, полиграфия и дизайн",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    instagramVizora: "Instagram Vizora",
    instagramBuro: "Instagram Бюро",
    facebook: "Facebook Бюро",
    emailVizora: "Почта Vizora",
    emailBuro: "Почта Бюро",
    ctaLabel: "Ваш профиль может работать уже сегодня",
    ctaTitle: "Создайте свою цифровую визитку",
    ctaText: "Одна ссылка, персональный QR-код и все необходимые контакты — в профессиональном оформлении Vizora.",
    ctaButton: "Создать бесплатно",
    ctaGift: "Первые 50 пользователей получают фирменную NFC-карту Vizora в подарок."
  },
  tj: {
    seoTitle: "Дар бораи Vizora.tj — таърихи таъсиси платформа",
    seoDescription: "Таърихи муассиси Vizora.tj Ракибҷон Муродқулов, рисолати платформа ва дастгирии Бюрои «Тезаурус».",
    heroLabel: "Таърихи Vizora.tj",
    heroTitle: "Номи ман Ракибҷон аст!",
    heroRole: "Муассиси платформаи Vizora.tj",
    heroText: "Ман Vizora.tj-ро таъсис додам, то мубодилаи тамос, варақаҳои рақамӣ ва робитаҳои касбӣ барои ҳама муосир, қулай ва дастрас бошанд.",
    heroAction: "Чаро Vizora пайдо шуд",
    verified: "Профили муассис",
    digitalIdentity: "Ҳувияти рақамӣ",
    qrReady: "QR барои мубодила омода аст",
    nfcReady: "NFC омода",
    languagesShort: "RU · TJ · EN",
    storyLabel: "Ғоя чӣ гуна пайдо шуд",
    storyTitle: "Чӣ маро ба таъсиси Vizora.tj овард",
    storyLead: "Солҳои зиёд дар соҳаи полиграфия, дизайн ва технологияҳои рақамӣ фаъолият карда, ман ҳар рӯз як мушкили такрориро медидам.",
    storyText: "Одамон варақаҳои коғазиро гум мекарданд, маълумоти тамос зуд кӯҳна мешуд ва барои ширкату муассисаҳо идора кардани варақаҳои кормандон душвор буд. Формати коғазӣ дигар ба суръати ҷаҳони муосир мувофиқ набуд.",
    storyResult: "Аз ҳамин ҷо ғояи платформаи насли нав — профили зиндаи рақамӣ пайдо шуд. Он ҳамеша нав аст, тавассути пайванд, QR ё NFC кушода мешавад ва ба рушди робитаҳои касбӣ мусоидат мекунад. Ҳамин тавр Vizora.tj ба вуҷуд омад.",
    storyQuote: "Ба мо на як варақаи дигар, балки низоми ягонаи зиндаи тамосҳо лозим буд.",
    storyPoints: ["Варақаҳо гум мешуданд", "Тамосҳо кӯҳна мешуданд", "Идоракунии сохтор душвор буд"],
    supportLabel: "Таҷриба — пояи платформа",
    supportTitle: "Бо дастгирии Бюрои «Тезаурус» сохта шудааст",
    supportText: "Платформаи Vizora.tj бо дастгирии Бюрои «Тезаурус» таҳия шудааст. Таҷрибаи бисёрсола дар соҳаи тарҷума, полиграфия, дизайн, рекламаи берунӣ, брендинг ва технологияҳои рақамӣ имкон дод, ки маҳсулоти ҷавобгӯ ба ниёзҳои воқеии соҳибкорон, муассисаҳои давлатӣ ва мутахассисон сохта шавад.",
    services: ["Тарҷума", "Полиграфия", "Дизайн", "Рекламаи берунӣ", "Брендинг", "Қарорҳои рақамӣ", "Ҳуҷҷатгузорӣ"],
    missionLabel: "Рисолати мо",
    missionTitle: "Муоширати касбиро осонтар гардонем",
    missionText: "То ҳар шахс, соҳибкор, ширкат ва ташкилоти давлатӣ тавонад худро муосир, зебо ва касбӣ — бе мушкилоти техникӣ муаррифӣ намояд.",
    valuesLabel: "Принсипҳои мо",
    valuesTitle: "Арзишҳое, ки Vizora бар онҳо сохта мешавад",
    values: [
      ["Эътимоднокӣ", "Тамос ва эътибори рақамӣ бояд ҳамеша дастрас бошанд."],
      ["Навоварӣ", "QR, NFC ва технологияҳои муосирро барои манфиати амалӣ истифода мебарем."],
      ["Содагӣ", "Имкониятҳои мураккабро ба амалҳои фаҳмо табдил медиҳем."],
      ["Дизайни муосир", "Таассуроти касбии аввал аз муаррифии босифат оғоз мешавад."],
      ["Рушд", "Платформа бо ниёзҳои одамон ва ташкилотҳо рушд мекунад."],
      ["Манфиат ба мардум", "Ҳар як имконият бояд вақтро сарфа ва робитаҳои нав эҷод кунад."]
    ],
    trustLabel: "Vizora дар рақамҳо",
    trustTitle: "Технологияе, ки истифодааш қулай аст",
    statUsers: "корбари оммавӣ",
    statOrganizations: "ташкилот",
    statCards: "варақаи фаъол",
    statLanguages: "забони интерфейс",
    statQrNfc: "QR ва NFC",
    statDevices: "дар ҳама дастгоҳҳо",
    contactsLabel: "Тамоси мустақим",
    contactsTitle: "Дар тамос бошем",
    contactsText: "Барои ҳамкорӣ, лоиҳаҳои шарикӣ ва пешниҳодҳо оид ба рушди Vizora.tj омодаам.",
    vizoraContacts: "Тамосҳои Vizora.tj",
    vizoraContactsNote: "Платформаи варақаҳои рақамӣ",
    buroContacts: "Тамосҳои Бюрои «Тезаурус»",
    buroContactsNote: "Тарҷума, полиграфия ва дизайн",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    instagramVizora: "Instagram-и Vizora",
    instagramBuro: "Instagram-и Бюро",
    facebook: "Facebook-и Бюро",
    emailVizora: "Почтаи Vizora",
    emailBuro: "Почтаи Бюро",
    ctaLabel: "Профили шумо имрӯз ба кор оғоз карда метавонад",
    ctaTitle: "Варақаи рақамии худро созед",
    ctaText: "Як пайванд, QR-коди шахсӣ ва ҳамаи тамосҳои зарурӣ — бо ороиши касбии Vizora.",
    ctaButton: "Ройгон сохтан",
    ctaGift: "50 корбари аввал корти фирмавии NFC-и Vizora-ро тӯҳфа мегиранд."
  },
  en: {
    seoTitle: "About Vizora.tj — the story behind the digital identity platform",
    seoDescription: "The story of Vizora.tj founder Raqibjon Murodqulov, the platform mission and support from Buro Tezaurus.",
    heroLabel: "The Vizora.tj story",
    heroTitle: "My name is Raqibjon!",
    heroRole: "Founder of Vizora.tj",
    heroText: "I created Vizora.tj to make contact sharing, digital business cards and professional connections modern, convenient and accessible to everyone.",
    heroAction: "Why Vizora was created",
    verified: "Founder profile",
    digitalIdentity: "Digital identity",
    qrReady: "QR ready to share",
    nfcReady: "NFC-ready",
    languagesShort: "RU · TJ · EN",
    storyLabel: "How the idea began",
    storyTitle: "What led me to create Vizora.tj",
    storyLead: "After many years working in printing, design and digital technology, I kept seeing the same problem every day.",
    storyText: "People lost paper business cards, contact details quickly became outdated, and companies and institutions struggled to manage employee cards. Paper no longer matched the pace of the modern world.",
    storyResult: "That sparked the idea for a new-generation platform: a living digital profile that stays current, opens by link, QR or NFC, and helps people build professional connections. That is how Vizora.tj was born.",
    storyQuote: "We did not need one more card. We needed one living contact system.",
    storyPoints: ["Cards were lost", "Contacts became outdated", "Structures were hard to manage"],
    supportLabel: "Experience behind the platform",
    supportTitle: "Created with the support of Buro Tezaurus",
    supportText: "Vizora.tj was developed with the support of Buro Tezaurus. Years of experience in translation, printing, design, outdoor advertising, branding and digital technologies made it possible to create a platform built around the real needs of businesses, public institutions and independent professionals.",
    services: ["Translation", "Printing", "Design", "Outdoor advertising", "Branding", "Digital solutions", "Document workflow"],
    missionLabel: "Our mission",
    missionTitle: "Make professional communication simpler",
    missionText: "So every person, entrepreneur, company and public organization can present themselves in a modern, beautiful and professional way — without technical complexity.",
    valuesLabel: "Our principles",
    valuesTitle: "The values Vizora is built on",
    values: [
      ["Reliability", "Contacts and digital reputation should be available exactly when they are needed."],
      ["Innovation", "We use QR, NFC and modern web technology to deliver practical value."],
      ["Simplicity", "We turn powerful capabilities into clear actions for every user."],
      ["Modern design", "A professional first impression starts with confident visual presentation."],
      ["Growth", "The platform evolves with the needs of people and organizations."],
      ["Value to people", "Every feature should save time and help create meaningful connections."]
    ],
    trustLabel: "Vizora by the numbers",
    trustTitle: "Technology designed to feel effortless",
    statUsers: "public users",
    statOrganizations: "organizations",
    statCards: "active cards",
    statLanguages: "interface languages",
    statQrNfc: "QR and NFC",
    statDevices: "on every device",
    contactsLabel: "Direct contact",
    contactsTitle: "Let’s stay connected",
    contactsText: "I am open to collaboration, partnership projects and ideas that can help Vizora.tj grow.",
    vizoraContacts: "Vizora.tj contacts",
    vizoraContactsNote: "Digital business card platform",
    buroContacts: "Buro Tezaurus contacts",
    buroContactsNote: "Translation, printing and design",
    whatsapp: "WhatsApp",
    telegram: "Telegram",
    instagramVizora: "Vizora Instagram",
    instagramBuro: "Buro Instagram",
    facebook: "Buro Facebook",
    emailVizora: "Vizora email",
    emailBuro: "Buro email",
    ctaLabel: "Your profile can start working today",
    ctaTitle: "Create your digital business card",
    ctaText: "One link, a personal QR code and every important contact — presented professionally by Vizora.",
    ctaButton: "Create for free",
    ctaGift: "The first 50 users receive a branded Vizora NFC card as a gift."
  }
} as const;

const serviceIcons: LucideIcon[] = [Languages, FileText, Palette, Megaphone, BadgeCheck, Workflow, ContactRound];
const valueIcons: LucideIcon[] = [ShieldCheck, Lightbulb, CheckCircle2, Palette, Rocket, HeartHandshake];

const revealVariants = {
  hidden: { opacity: 0, y: 46 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.46, ease: [0.22, 1, 0.36, 1] as const } }
};

export default function AboutPage() {
  const { language } = useApp();
  const text = pageCopy[language];
  const reduceMotion = useReducedMotion();
  const [stats, setStats] = useState<PlatformStats>({ users: null, organizations: null, cards: null });

  useEffect(() => {
    const previousTitle = document.title;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = meta?.content ?? "";
    const description = meta ?? document.head.appendChild(document.createElement("meta"));
    description.name = "description";
    description.content = text.seoDescription;
    document.title = text.seoTitle;

    return () => {
      document.title = previousTitle;
      if (meta) meta.content = previousDescription;
      else description.remove();
    };
  }, [text.seoDescription, text.seoTitle]);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let active = true;
    const load = async () => {
      const [cardsResult, organizationsResult] = await Promise.all([
        client
          .from("cards")
          .select("owner_id", { count: "exact" })
          .eq("review_status", "approved")
          .in("visibility", ["public", "public_organization"]),
        client
          .from("organizations")
          .select("id", { count: "exact", head: true })
          .eq("review_status", "approved")
      ]);
      if (!active) return;
      const owners = cardsResult.error
        ? null
        : new Set((cardsResult.data ?? []).map((item) => String(item.owner_id))).size;
      setStats({
        users: owners,
        cards: cardsResult.error ? null : cardsResult.count ?? cardsResult.data?.length ?? 0,
        organizations: organizationsResult.error ? null : organizationsResult.count ?? 0
      });
    };
    void load();
    return () => { active = false; };
  }, []);

  const numberFormatter = new Intl.NumberFormat(language === "tj" ? "tg-TJ" : language === "en" ? "en" : "ru");
  const formatStat = (value: number | null) => value === null ? "—" : numberFormatter.format(value).padStart(2, "0");
  const statItems = [
    [formatStat(stats.users), text.statUsers, UsersRound],
    [formatStat(stats.organizations), text.statOrganizations, Building2],
    [formatStat(stats.cards), text.statCards, ContactRound],
    ["03", text.statLanguages, Languages],
    ["QR + NFC", text.statQrNfc, SmartphoneNfc],
    ["100%", text.statDevices, Smartphone]
  ] as const;

  const vizoraContacts = [
    [text.whatsapp, "+992 084 785 555", "https://wa.me/992084785555", MessageCircle],
    [text.telegram, "@Mert_mert", "https://t.me/Mert_mert", Send],
    [text.instagramVizora, "@vizora.tj", "https://instagram.com/vizora.tj", Instagram],
    [text.emailVizora, "vizora.platform.tj@gmail.com", "mailto:vizora.platform.tj@gmail.com", Mail]
  ] as const;
  const buroContacts = [
    [text.instagramBuro, "@buro_tezaurus", "https://instagram.com/buro_tezaurus", Instagram],
    [text.facebook, "buro_tezaurus", "https://facebook.com/buro_tezaurus", Facebook],
    [text.emailBuro, "tezaurus_01@inbox.ru", "mailto:tezaurus_01@inbox.ru", Mail]
  ] as const;

  return (
    <>
      <main className="about-page">
        <section className="about-hero" aria-labelledby="about-founder-title">
          <div className="about-ambient about-ambient-one" />
          <div className="about-ambient about-ambient-two" />
          <div className="about-grid" aria-hidden="true" />
          <div className="site-container about-hero-layout">
            <motion.div
              className="about-hero-copy"
              initial={reduceMotion ? false : "hidden"}
              animate="visible"
              variants={revealVariants}
            >
              <span className="about-kicker"><Sparkles size={15} />{text.heroLabel}</span>
              <h1 id="about-founder-title">{text.heroTitle}</h1>
              <p className="about-founder-role"><BadgeCheck size={19} />{text.heroRole}</p>
              <p className="about-hero-lead">{text.heroText}</p>
              <a href="#about-story" className="button button-primary button-large about-hero-action">
                {text.heroAction}<ArrowDown size={18} />
              </a>
              <div className="about-hero-signals" aria-label={text.digitalIdentity}>
                <span><QrCode size={16} />QR</span>
                <span><SmartphoneNfc size={16} />NFC</span>
                <span><Languages size={16} />{text.languagesShort}</span>
              </div>
            </motion.div>

            <motion.div
              className="about-founder-visual"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96, x: 26 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="about-founder-glow" aria-hidden="true" />
              <img
                className="about-founder-portrait"
                src={`${import.meta.env.BASE_URL}images/team/raqibjon-murodqulov-founder-light-v2.webp`}
                alt={`${text.heroTitle}. ${text.heroRole}`}
                width="780"
                height="1150"
                loading="eager"
                fetchPriority="high"
              />
              <motion.div className="about-float about-float-qr" animate={reduceMotion ? undefined : { y: [0, -8, 0] }} transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}>
                <QRCodeImage value={publicSiteUrl("/about")} size={72} />
                <div><strong>{text.digitalIdentity}</strong><span>{text.qrReady}</span></div>
              </motion.div>
              <motion.div className="about-float about-float-nfc" animate={reduceMotion ? undefined : { y: [0, 7, 0], rotate: [0, 1.5, 0] }} transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}>
                <SmartphoneNfc size={24} /><span>{text.nfcReady}</span>
              </motion.div>
              <motion.div className="about-float about-float-language" animate={reduceMotion ? undefined : { x: [0, 5, 0] }} transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut" }}>
                <Globe2 size={19} /><span>{text.languagesShort}</span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <section id="about-story" className="about-section about-story-section">
          <div className="site-container about-story-layout">
            <Reveal className="about-story-copy">
              <SectionHeading label={text.storyLabel} title={text.storyTitle} />
              <p className="about-story-lead">{text.storyLead}</p>
              <p>{text.storyText}</p>
              <p>{text.storyResult}</p>
              <blockquote>{text.storyQuote}</blockquote>
              <div className="about-story-points">
                {text.storyPoints.map((point) => <span key={point}><CheckCircle2 size={16} />{point}</span>)}
              </div>
            </Reveal>
            <Reveal className="about-network-card" delay={0.12}>
              <ContactNetwork />
              <div className="about-network-meta">
                <span><QrCode size={17} />QR</span><span><SmartphoneNfc size={17} />NFC</span><span><Globe2 size={17} />WEB</span>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="about-section about-support-section">
          <div className="site-container">
            <Reveal className="about-support-card">
              <div className="about-support-glow" />
              <div className="about-support-head">
                <img className="about-support-logo" src={`${import.meta.env.BASE_URL}brand/buro-tezaurus-logo.webp`} alt="Бюро Тезаурус" width="2048" height="494" loading="lazy" />
                <div><span className="about-dark-kicker">{text.supportLabel}</span><h2>{text.supportTitle}</h2><p>{text.supportText}</p></div>
              </div>
              <div className="about-marquee about-service-marquee">
                <div className="about-service-grid about-marquee-track">
                  {[...text.services, ...text.services].map((service, index) => {
                    const Icon = serviceIcons[index % serviceIcons.length];
                    const duplicate = index >= text.services.length;
                    return (
                      <motion.div
                        key={`${service}-${index}`}
                        className={`about-service-chip ${duplicate ? "about-marquee-copy" : ""}`}
                        aria-hidden={duplicate || undefined}
                        whileHover={reduceMotion ? undefined : { y: -5 }}
                      >
                        <Icon size={20} /><span>{service}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="about-section about-mission-section">
          <div className="site-container">
            <Reveal className="about-mission-card">
              <span className="about-mission-icon"><Target size={26} /></span>
              <span className="about-kicker">{text.missionLabel}</span>
              <h2>{text.missionTitle}</h2>
              <p>{text.missionText}</p>
            </Reveal>
          </div>
        </section>

        <section className="about-section about-values-section">
          <div className="site-container">
            <Reveal><SectionHeading label={text.valuesLabel} title={text.valuesTitle} centered /></Reveal>
            <div className="about-marquee about-values-marquee">
              <div className="about-values-grid about-marquee-track">
                {[...text.values, ...text.values].map(([title, description], index) => {
                  const Icon = valueIcons[index % valueIcons.length];
                  const duplicate = index >= text.values.length;
                  return (
                    <Reveal key={`${title}-${index}`} className={duplicate ? "about-marquee-copy" : ""} delay={duplicate ? 0 : (index % text.values.length) * 0.04}>
                      <motion.article aria-hidden={duplicate || undefined} className="about-value-card" whileHover={reduceMotion ? undefined : { y: -7, scale: 1.01 }}>
                        <span><Icon size={24} /></span><h3>{title}</h3><p>{description}</p>
                      </motion.article>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="about-section about-stats-section">
          <div className="site-container">
            <Reveal><SectionHeading label={text.trustLabel} title={text.trustTitle} centered /></Reveal>
            <div className="about-marquee about-stats-marquee">
              <div className="about-stats-grid about-marquee-track">
                {[...statItems, ...statItems].map(([value, label, Icon], index) => {
                  const duplicate = index >= statItems.length;
                  return (
                    <Reveal key={`${label}-${index}`} className={duplicate ? "about-marquee-copy" : ""} delay={duplicate ? 0 : (index % statItems.length) * 0.04}>
                      <motion.article aria-hidden={duplicate || undefined} className="about-stat-card" whileHover={reduceMotion ? undefined : { y: -5 }}>
                        <Icon size={22} /><strong>{value}</strong><span>{label}</span>
                      </motion.article>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="about-section about-contact-section">
          <div className="site-container about-contact-layout">
            <Reveal className="about-contact-intro">
              <SectionHeading label={text.contactsLabel} title={text.contactsTitle} centered />
              <p>{text.contactsText}</p>
            </Reveal>
            <div className="about-contact-columns">
              <ContactGroup title={text.vizoraContacts} note={text.vizoraContactsNote} contacts={vizoraContacts} brand="vizora" />
              <ContactGroup title={text.buroContacts} note={text.buroContactsNote} contacts={buroContacts} brand="buro" />
            </div>
          </div>
        </section>

        <section className="about-section about-cta-section">
          <div className="site-container">
            <Reveal className="about-cta-card">
              <div className="about-cta-orb about-cta-orb-one" /><div className="about-cta-orb about-cta-orb-two" />
              <div className="about-cta-content">
                <span><Sparkles size={16} />{text.ctaLabel}</span>
                <h2>{text.ctaTitle}</h2><p>{text.ctaText}</p>
                <Link to="/create" className="button about-cta-button">{text.ctaButton}<ArrowRight size={18} /></Link>
                <small><SmartphoneNfc size={15} />{text.ctaGift}</small>
              </div>
              <div className="about-cta-brand"><BrandLogo light /><QRCodeImage value={publicSiteUrl("/create")} size={116} /></div>
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div className={className} initial={reduceMotion ? false : "hidden"} whileInView="visible" viewport={{ once: true, margin: "-35px" }} variants={{ ...revealVariants, visible: { ...revealVariants.visible, transition: { ...revealVariants.visible.transition, delay } } }}>
      {children}
    </motion.div>
  );
}

function SectionHeading({ label, title, centered = false }: { label: string; title: string; centered?: boolean }) {
  return <div className={`about-section-heading ${centered ? "is-centered" : ""}`}><span className="about-kicker">{label}</span><h2>{title}</h2></div>;
}

type ContactItem = readonly [string, string, string, LucideIcon];

function ContactGroup({ title, note, contacts, brand }: { title: string; note: string; contacts: readonly ContactItem[]; brand: "vizora" | "buro" }) {
  return (
    <Reveal className={`about-contact-group is-${brand}`}>
      <header>
        {brand === "vizora"
          ? <BrandLogo className="about-contact-brand" />
          : <img className="about-contact-buro-logo" src={`${import.meta.env.BASE_URL}brand/buro-tezaurus-logo.webp`} alt="Бюро Тезаурус" loading="lazy" />}
        <div><strong>{title}</strong><span>{note}</span></div>
      </header>
      <div className="about-contact-list">
        {contacts.map(([label, value, href, Icon]) => (
          <a className="about-contact-link" key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined}>
            <Icon size={18} /><div><small>{label}</small><strong>{value}</strong></div><ExternalLink size={14} />
          </a>
        ))}
      </div>
    </Reveal>
  );
}

function ContactNetwork() {
  return (
    <div className="about-network-visual" aria-hidden="true">
      <svg viewBox="0 0 620 500" role="img">
        <defs>
          <linearGradient id="about-network-line" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#57d6ff" /><stop offset="1" stopColor="#4074ff" /></linearGradient>
          <mask id="about-network-mask"><rect width="620" height="500" fill="white" /><rect x="238" y="195" width="144" height="110" rx="32" fill="black" /></mask>
        </defs>
        <g className="about-network-lines" fill="none" stroke="url(#about-network-line)" mask="url(#about-network-mask)">
          <path d="M310 250 130 116M310 250 500 105M310 250 520 340M310 250 125 378M130 116 500 105M125 378 520 340" />
          <circle cx="310" cy="250" r="112" /><circle cx="310" cy="250" r="178" />
        </g>
        <g className="about-network-points">
          <circle cx="310" cy="250" r="5" /><circle cx="130" cy="116" r="5" /><circle cx="500" cy="105" r="5" /><circle cx="520" cy="340" r="5" /><circle cx="125" cy="378" r="5" />
        </g>
      </svg>
      <div className="about-network-center"><BrandLogo compact className="about-network-brand" /></div>
      <div className="about-network-node node-one"><ContactRound size={21} /></div>
      <div className="about-network-node node-two"><Building2 size={21} /></div>
      <div className="about-network-node node-three"><QrCode size={21} /></div>
      <div className="about-network-node node-four"><SmartphoneNfc size={21} /></div>
    </div>
  );
}

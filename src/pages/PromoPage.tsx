import { ArrowRight, CheckCircle2, Gift, QrCode, SmartphoneNfc, Sparkles, Users } from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { Link } from "react-router";
import Footer from "../components/layout/Footer";
import { useApp } from "../context/AppContext";
import { nfcCardDesigns } from "../lib/nfcCardCatalog";
import { promoRepository, type LaunchPromoStatus } from "../lib/promoRepository";
import { supabase } from "../lib/supabase";
import "./PromoPage.css";

type Viewer = "guest" | "no-card" | "has-card";
type Language = "ru" | "tj" | "en";

type Copy = {
  eyebrow: string; title: string; lead: string; seatsLeft: string; seatsTaken: string; soldOut: string;
  benefitsTitle: string; benefits: { title: string; text: string }[];
  stepsTitle: string; steps: string[];
  galleryTitle: string; galleryText: string;
  conditionsTitle: string; conditions: string[];
  guestCta: string; guestLogin: string; noCardCta: string; memberCta: string; soldOutCta: string;
  pageTitle: string;
};

const copy: Record<Language, Copy> = {
  ru: {
    eyebrow: "Стартовая акция Vizora",
    title: "Первые 50 пользователей — личная визитка бесплатно на 1 год",
    lead: "А вместе с ней фирменная NFC-карта Vizora в подарок. Одно касание телефоном — и ваши контакты уже у клиента.",
    seatsLeft: "мест осталось", seatsTaken: "занято", soldOut: "Все 50 мест уже заняты. Выберите личный тариф.",
    benefitsTitle: "Что входит в акцию",
    benefits: [
      { title: "Бесплатно на 1 год", text: "Личная визитка с QR-кодом и публичной ссылкой без оплаты в течение года." },
      { title: "NFC-карта в подарок", text: "Поднесите карту к телефону — визитка откроется мгновенно." },
      { title: "QR-код и ссылка", text: "Одна ссылка и один QR-код. Данные меняются без перевыпуска." },
      { title: "Профессиональный вид", text: "Готовые дизайны и аккуратное оформление, которое сразу вызывает доверие." }
    ],
    stepsTitle: "Как получить акцию",
    steps: ["Зарегистрируйтесь и подтвердите почту", "Заполните личную визитку: имя, должность, организацию и телефон", "При выборе тарифа нажмите «Стартовая акция»"],
    galleryTitle: "Выберите дизайн NFC-карты",
    galleryText: "Одиннадцать дизайнов. Выберите тот, который ближе вашему стилю.",
    conditionsTitle: "Условия",
    conditions: ["Акция только для личных визиток. Организации участвуют по корпоративным тарифам.", "Одна акция на один аккаунт.", "Места распределяются по порядку заявок, пока они не закончатся.", "Срок действия — 1 год с момента активации."],
    guestCta: "Зарегистрироваться и получить", guestLogin: "У меня уже есть аккаунт", noCardCta: "Создать визитку и получить", memberCta: "Открыть кабинет", soldOutCta: "Выбрать тариф",
    pageTitle: "Стартовая акция Vizora — 50 бесплатных визиток"
  },
  tj: {
    eyebrow: "Иқдоми оғози Vizora",
    title: "50 корбари аввал — варақаи шахсӣ ройгон барои 1 сол",
    lead: "Ва ҳамроҳи он корти фирмавии NFC-и Vizora ҳамчун тӯҳфа. Як ламс бо телефон — ва тамосҳои шумо назди муштарӣ аст.",
    seatsLeft: "ҷой монд", seatsTaken: "band", soldOut: "Ҳамаи 50 ҷой пур шуд. Тарофаи шахсиро интихоб кунед.",
    benefitsTitle: "Чӣ дар иқдом дохил аст",
    benefits: [
      { title: "1 сол ройгон", text: "Варақаи шахсӣ бо QR-код ва пайванди умумӣ, бе пардохт дар тӯли сол." },
      { title: "Корти NFC тӯҳфа", text: "Корторо ба телефон наздик кунед — варақа фавран кушода мешавад." },
      { title: "QR-код ва пайванд", text: "Як пайванд ва як QR-код. Маълумот бе аз нав сохтани онҳо иваз мешавад." },
      { title: "Намуди касбӣ", text: "Тарҳҳои омода ва оройиши озода, ки аз аввал эътимод эҷод мекунанд." }
    ],
    stepsTitle: "Чӣ тавр иқдомро гирифтан",
    steps: ["Бақайдгирӣ кунед ва почтаро тасдиқ кунед", "Варақаи шахсиро пур кунед: ном, вазифа, ташкилот ва телефон", "Ҳангоми интихоби тариф «Иқдоми оғоз»-ро пахш кунед"],
    galleryTitle: "Тарҳи корти NFC-ро интихоб кунед",
    galleryText: "Ёздаҳ тарҳ. Ҳамонеро интихоб кунед, ки ба услуби шумо наздиктар аст.",
    conditionsTitle: "Шартҳо",
    conditions: ["Иқдом танҳо барои варақаҳои шахсӣ. Ташкилотҳо аз рӯи тарофаҳои корпоративӣ хизмат мегиранд.", "Як иқдом барои як ҳисоб.", "Ҷойҳо бо тартиби дархостҳо тақсим мешаванд, то он ки тамом шаванд.", "Мӯҳлат — 1 сол аз лаҳзаи фаъолсозӣ."],
    guestCta: "Бақайдгирӣ ва гирифтан", guestLogin: "Ҳисоб дорам", noCardCta: "Варақа созед ва гиред", memberCta: "Кушодани кабинет", soldOutCta: "Интихоби тариф",
    pageTitle: "Иқдоми оғози Vizora — 50 варақаи ройгон"
  },
  en: {
    eyebrow: "Vizora launch offer",
    title: "The first 50 users — a personal card free for 1 year",
    lead: "Plus a branded Vizora NFC card as a gift. One tap of the phone and your contacts are already with the client.",
    seatsLeft: "places left", seatsTaken: "taken", soldOut: "All 50 places are taken. Choose a personal plan.",
    benefitsTitle: "What the offer includes",
    benefits: [
      { title: "Free for 1 year", text: "A personal card with a QR code and a public link, with no payment for a full year." },
      { title: "NFC card as a gift", text: "Tap the card to a phone and the card opens instantly." },
      { title: "QR code and link", text: "One link and one QR code. Details can be updated without reprinting." },
      { title: "Professional look", text: "Ready designs and clean styling that builds trust from the first glance." }
    ],
    stepsTitle: "How to claim the offer",
    steps: ["Sign up and confirm your email", "Fill in your personal card: name, position, organization and phone", "When choosing a plan, press “Launch offer”"],
    galleryTitle: "Choose your NFC card design",
    galleryText: "Eleven designs. Pick the one that fits your style.",
    conditionsTitle: "Terms",
    conditions: ["The offer is for personal cards only. Organizations use corporate plans.", "One offer per account.", "Places are allocated in order of requests until they run out.", "Valid for 1 year from activation."],
    guestCta: "Sign up and claim", guestLogin: "I already have an account", noCardCta: "Create a card and claim", memberCta: "Open dashboard", soldOutCta: "Choose a plan",
    pageTitle: "Vizora launch offer — 50 free cards"
  }
};

const benefitIcons: ComponentType<{ size?: number }>[] = [Gift, SmartphoneNfc, QrCode, Sparkles];

export default function PromoPage() {
  const { language } = useApp();
  const lang: Language = language === "tj" || language === "en" ? language : "ru";
  const c = copy[lang];
  const [promo, setPromo] = useState<LaunchPromoStatus | null>(null);
  const [viewer, setViewer] = useState<Viewer>("guest");

  useEffect(() => {
    document.title = c.pageTitle;
    let active = true;
    void promoRepository.status().then((data) => { if (active) setPromo(data); }).catch(() => undefined);
    const client = supabase;
    if (client) {
      void (async () => {
        const { data } = await client.auth.getUser();
        if (!active) return;
        if (!data.user) { setViewer("guest"); return; }
        const { data: cards } = await client.from("cards").select("id").eq("owner_id", data.user.id).limit(1);
        if (!active) return;
        setViewer(cards && cards.length > 0 ? "has-card" : "no-card");
      })();
    }
    return () => { active = false; };
  }, [c.pageTitle]);

  const limit = promo?.limit ?? 50;
  const remaining = promo?.remaining ?? limit;
  const taken = Math.min(limit, limit - remaining);
  const percent = Math.round((taken / limit) * 100);
  const soldOut = promo !== null && remaining <= 0;
  const formatter = new Intl.NumberFormat(lang === "tj" ? "tg-TJ" : lang === "en" ? "en" : "ru");
  const primary = soldOut
    ? { to: "/create", label: c.soldOutCta }
    : viewer === "has-card"
      ? { to: "/dashboard", label: c.memberCta }
      : viewer === "no-card"
        ? { to: "/create", label: c.noCardCta }
        : { to: "/register", label: c.guestCta };

  return (
    <main className="promo-page">
      <section className="promo-hero">
        <div className="site-container promo-hero-layout">
          <div className="promo-hero-copy">
            <span className="promo-eyebrow"><Users size={15} />{c.eyebrow}</span>
            <h1>{c.title}</h1>
            <p>{c.lead}</p>
            <div className="promo-actions">
              <Link to={primary.to} className="promo-button promo-button-primary">{primary.label}<ArrowRight size={18} /></Link>
              {viewer === "guest" && !soldOut && <Link to="/login" className="promo-button promo-button-ghost">{c.guestLogin}</Link>}
            </div>
          </div>
          <div className="promo-seats" aria-label={`${remaining}/${limit}`}>
            <div className="promo-seats-number">
              <strong>{promo ? formatter.format(remaining) : "—"}</strong>
              <span>/{limit}</span>
            </div>
            <p className="promo-seats-label">{soldOut ? c.soldOut : c.seatsLeft}</p>
            <div className="promo-seats-bar" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={taken}>
              <i style={{ ["--fill" as string]: `${percent}%` }} />
            </div>
            <small>{taken}/{limit} {c.seatsTaken}</small>
          </div>
        </div>
      </section>

      <section className="site-container promo-section">
        <h2>{c.benefitsTitle}</h2>
        <div className="promo-benefits">
          {c.benefits.map((item, index) => {
            const Icon = benefitIcons[index];
            return (
              <article key={item.title} className="promo-benefit">
                <span className="promo-benefit-icon"><Icon size={22} /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="site-container promo-section">
        <h2>{c.galleryTitle}</h2>
        <p className="promo-section-text">{c.galleryText}</p>
        <div className="promo-gallery">
          {nfcCardDesigns.map((design) => (
            <figure key={design.id} className="promo-card">
              <img src={design.image} alt={design.title[lang]} loading="lazy" decoding="async" />
              <figcaption>{design.title[lang]}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="site-container promo-section promo-two-col">
        <div>
          <h2>{c.stepsTitle}</h2>
          <ol className="promo-steps">
            {c.steps.map((step, index) => (
              <li key={step}><span>{index + 1}</span><p>{step}</p></li>
            ))}
          </ol>
        </div>
        <div>
          <h2>{c.conditionsTitle}</h2>
          <ul className="promo-conditions">
            {c.conditions.map((item) => (
              <li key={item}><CheckCircle2 size={18} /><span>{item}</span></li>
            ))}
          </ul>
        </div>
      </section>

      <section className="site-container promo-final">
        <div>
          <h2>{soldOut ? c.soldOut : `${remaining}/${limit} — ${c.seatsLeft}`}</h2>
        </div>
        <Link to={primary.to} className="promo-button promo-button-primary">{primary.label}<ArrowRight size={18} /></Link>
      </section>

      <Footer />
    </main>
  );
}

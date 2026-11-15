import { ArrowRight, CheckCircle2, Gift, QrCode, SmartphoneNfc, Sparkles, Users } from "lucide-react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
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

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const fadeUp: Variants = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease } } };
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };

// Counts from 0 up to the target once the promo status has loaded.
function useCountUp(target: number, ready: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!ready) return;
    const start = performance.now();
    const duration = 1200;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ready]);
  return value;
}

export default function PromoPage() {
  const { language } = useApp();
  const lang: Language = language === "tj" || language === "en" ? language : "ru";
  const c = copy[lang];
  const reduce = useReducedMotion();
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
  const shown = useCountUp(remaining, promo !== null);
  const formatter = new Intl.NumberFormat(lang === "tj" ? "tg-TJ" : lang === "en" ? "en" : "ru");
  const primary = soldOut
    ? { to: "/create", label: c.soldOutCta }
    : viewer === "has-card"
      ? { to: "/dashboard", label: c.memberCta }
      : viewer === "no-card"
        ? { to: "/create", label: c.noCardCta }
        : { to: "/register", label: c.guestCta };
  const initial = reduce ? false : "hidden";
  const floating = nfcCardDesigns.slice(0, 3);

  return (
    <main className="promo-page">
      <section className="promo-hero">
        <div className="promo-hero-glow" aria-hidden="true" />
        <div className="site-container promo-hero-layout">
          <motion.div className="promo-hero-copy" variants={stagger} initial={initial} animate="show">
            <motion.span className="promo-eyebrow" variants={fadeUp}><Users size={15} />{c.eyebrow}</motion.span>
            <motion.h1 variants={fadeUp}>{c.title}</motion.h1>
            <motion.p variants={fadeUp}>{c.lead}</motion.p>
            <motion.div className="promo-actions" variants={fadeUp}>
              <Link to={primary.to} className="promo-button promo-button-primary">{primary.label}<ArrowRight size={18} /></Link>
              {viewer === "guest" && !soldOut && <Link to="/login" className="promo-button promo-button-ghost">{c.guestLogin}</Link>}
            </motion.div>
          </motion.div>

          <div className="promo-visual" aria-hidden="true">
            {floating.map((design, index) => (
              <div key={design.id} className={`promo-float promo-float-${index}`}>
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 30 }}
                  animate={reduce ? undefined : { opacity: 1, y: [0, -8, 0] }}
                  transition={reduce ? undefined : {
                    opacity: { duration: 0.7, delay: 0.2 + index * 0.15 },
                    y: { duration: 4 + index * 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.9 + index * 0.15 }
                  }}
                >
                  <img src={design.image} alt="" loading="eager" decoding="async" />
                </motion.div>
              </div>
            ))}
            <motion.div
              className="promo-seats"
              aria-label={`${remaining}/${limit}`}
              initial={reduce ? false : { opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.5, ease }}
            >
              <div className="promo-seats-number">
                <strong>{promo ? formatter.format(shown) : "—"}</strong>
                <span>/{limit}</span>
              </div>
              <p className="promo-seats-label">{soldOut ? c.soldOut : c.seatsLeft}</p>
              <div className="promo-seats-bar" role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={taken}>
                <motion.i initial={reduce ? false : { width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: 1.4, delay: 0.8, ease: "easeOut" }} />
              </div>
              <small>{taken}/{limit} {c.seatsTaken}</small>
            </motion.div>
          </div>
        </div>
      </section>

      <motion.section className="site-container promo-section" variants={stagger} initial={initial} whileInView="show" viewport={{ once: true, amount: 0.2 }}>
        <motion.h2 variants={fadeUp}>{c.benefitsTitle}</motion.h2>
        <div className="promo-benefits">
          {c.benefits.map((item, index) => {
            const Icon = benefitIcons[index];
            return (
              <motion.article key={item.title} className="promo-benefit" variants={fadeUp}>
                <span className="promo-benefit-icon"><Icon size={20} /></span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </motion.article>
            );
          })}
        </div>
      </motion.section>

      <motion.section className="site-container promo-section" variants={stagger} initial={initial} whileInView="show" viewport={{ once: true, amount: 0.2 }}>
        <motion.h2 variants={fadeUp}>{c.galleryTitle}</motion.h2>
        <motion.p className="promo-section-text" variants={fadeUp}>{c.galleryText}</motion.p>
        <div className="promo-gallery">
          {nfcCardDesigns.map((design) => (
            <motion.figure key={design.id} className="promo-card" variants={fadeUp}>
              <img src={design.image} alt={design.title[lang]} loading="lazy" decoding="async" />
              <figcaption>{design.title[lang]}</figcaption>
            </motion.figure>
          ))}
        </div>
      </motion.section>

      <motion.section className="site-container promo-section promo-two-col" variants={stagger} initial={initial} whileInView="show" viewport={{ once: true, amount: 0.2 }}>
        <div>
          <motion.h2 variants={fadeUp}>{c.stepsTitle}</motion.h2>
          <ol className="promo-steps">
            {c.steps.map((step, index) => (
              <motion.li key={step} variants={fadeUp}><span>{index + 1}</span><p>{step}</p></motion.li>
            ))}
          </ol>
        </div>
        <div>
          <motion.h2 variants={fadeUp}>{c.conditionsTitle}</motion.h2>
          <ul className="promo-conditions">
            {c.conditions.map((item) => (
              <motion.li key={item} variants={fadeUp}><CheckCircle2 size={18} /><span>{item}</span></motion.li>
            ))}
          </ul>
        </div>
      </motion.section>

      <motion.section className="site-container promo-final" variants={fadeUp} initial={initial} whileInView="show" viewport={{ once: true, amount: 0.5 }}>
        <h2>{soldOut ? c.soldOut : `${remaining}/${limit} — ${c.seatsLeft}`}</h2>
        <Link to={primary.to} className="promo-button promo-button-primary">{primary.label}<ArrowRight size={18} /></Link>
      </motion.section>

      <Footer />
    </main>
  );
}

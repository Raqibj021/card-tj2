import { ArrowRight, BadgeCheck, Gift, QrCode, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";

const slideCopy = {
  ru: [
    {
      eyebrow: "Скоро официальный запуск",
      title: "Все контакты в одной ссылке",
      text: "Электронные визитки для специалистов, команд и организаций Таджикистана.",
      action: "Создать визитку"
    },
    {
      eyebrow: "Знакомьтесь быстрее",
      title: "Делитесь профилем по QR-коду",
      text: "Телефон, мессенджеры, соцсети, адрес и сайт доступны без установки приложения.",
      action: "Открыть каталог"
    },
    {
      eyebrow: "Всегда актуально",
      title: "Обновляйте контакты в любое время",
      text: "Обновите профиль один раз — новые контакты сразу увидят все ваши клиенты.",
      action: "Узнать больше"
    },
    {
      eyebrow: "Главная акция запуска",
      title: "Год бесплатно для первых 50 пользователей",
      text: "И фирменная NFC-карта Vizora в подарок. Акция только для личных визиток — организации участвуют по корпоративным тарифам.",
      action: "Получить бесплатно",
    }
  ],
  tj: [
    {
      eyebrow: "Оғози расмӣ ба наздикӣ",
      title: "Ҳамаи тамосҳо дар як пайванд",
      text: "Варақаҳои рақамӣ барои мутахассисон, гурӯҳҳо ва ташкилотҳои Тоҷикистон.",
      action: "Сохтани варақа"
    },
    {
      eyebrow: "Зудтар шинос шавед",
      title: "Профилро бо QR-код мубодила кунед",
      text: "Телефон, паёмрасонҳо, шабакаҳои иҷтимоӣ, суроға ва сомона бе барнома дастрасанд.",
      action: "Кушодани феҳрист"
    },
    {
      eyebrow: "Ҳамеша нав",
      title: "Тамосҳоро ҳар вақт нав кунед",
      text: "Профилро як бор нав кунед — ҳамаи муштариён маълумоти навро мебинанд.",
      action: "Маълумоти бештар"
    },
    {
      eyebrow: "Иқдоми асосии оғоз",
      title: "Як сол ройгон барои 50 корбари аввал",
      text: "Ва корти фирмавии NFC-и Vizora ҳамчун тӯҳфа. Иқдом танҳо барои варақаҳои шахсӣ — ташкилотҳо аз рӯи тарофаҳои корпоративӣ хизмат мегиранд.",
      action: "Ройгон гирифтан",
    }
  ],
  en: [
    {
      eyebrow: "Official launch coming soon",
      title: "Every contact in one link",
      text: "Digital business cards for professionals, teams and organizations in Tajikistan.",
      action: "Create a card"
    },
    {
      eyebrow: "Connect faster",
      title: "Share your profile by QR code",
      text: "Phone, messengers, social media, address and website with no app required.",
      action: "Open directory"
    },
    {
      eyebrow: "Always up to date",
      title: "Update your contacts anytime",
      text: "Update once and every client immediately sees your current contacts.",
      action: "Learn more"
    },
    {
      eyebrow: "Featured launch offer",
      title: "One year free for the first 50 users",
      text: "Plus a branded Vizora NFC card as a gift. Personal cards only — organizations use corporate plans.",
      action: "Get it free",
    }
  ]
} as const;

const icons = [Smartphone, QrCode, ShieldCheck, Gift];

export default function HomePromoCarousel() {
  const { language } = useApp();
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const slides = slideCopy[language];

  useEffect(() => {
    if (hovered || focused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setTimeout(() => setActive((current) => (current + 1) % slides.length), 6200);
    return () => window.clearTimeout(timer);
  }, [active, focused, hovered, slides.length]);

  return (
    <section
      className="home-promo-carousel"
      aria-roledescription="carousel"
      aria-label="Vizora"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div className="home-promo-stage">
        {slides.map((slide, index) => {
          const Icon = icons[index];
          const isOffer = index === slides.length - 1;
          return (
            <article
              className={`home-promo-slide home-promo-slide-${index + 1}${active === index ? " is-active" : ""}${isOffer ? " is-offer" : ""}`}
              inert={active !== index}
              key={slide.title}
            >
              <div className="home-promo-photo" aria-hidden="true" />
              <div className="home-promo-overlay" aria-hidden="true" />
              <div className="home-promo-content">
                <span className="home-promo-icon"><Icon size={19} /></span>
                <div>
                  <span className="home-promo-eyebrow">{slide.eyebrow}</span>
                  <h2>{slide.title}</h2>
                  <p>{slide.text}</p>
                </div>
                <Link
                  to={index === 1 ? "/directory" : index === 2 ? "/services" : "/create"}
                  className={isOffer ? "home-promo-action home-promo-action-offer" : "home-promo-action"}
                >
                  {isOffer && <BadgeCheck size={17} />}
                  {slide.action}
                  {!isOffer && <ArrowRight size={16} />}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      <div className="home-promo-controls">
        {slides.map((slide, index) => (
          <button
            type="button"
            aria-pressed={active === index}
            aria-label={slide.eyebrow}
            className={active === index ? "is-active" : ""}
            onClick={() => setActive(index)}
            key={slide.eyebrow}
          ><span /></button>
        ))}
      </div>
    </section>
  );
}

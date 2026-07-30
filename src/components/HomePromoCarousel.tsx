import { ArrowRight, BadgeCheck, Gift, QrCode, ShieldCheck, Smartphone, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";

const slideCopy = {
  ru: [
    {
      eyebrow: "Скоро официальный запуск",
      title: "Vizora объединяет ваши контакты в одной красивой ссылке",
      text: "Электронные визитки для специалистов, команд и организаций Таджикистана.",
      action: "Создать визитку"
    },
    {
      eyebrow: "Знакомьтесь быстрее",
      title: "Покажите QR-код — и ваш профиль уже у клиента",
      text: "Телефон, мессенджеры, соцсети, адрес и сайт доступны без установки приложения.",
      action: "Открыть каталог"
    },
    {
      eyebrow: "Всегда актуально",
      title: "Меняйте данные, не меняя ссылку и QR-код",
      text: "Обновите профиль один раз — новые контакты сразу увидят все ваши клиенты.",
      action: "Узнать больше"
    },
    {
      eyebrow: "Главная акция запуска",
      title: "Первые 50 личных пользователей — бесплатно на 1 год",
      text: "Акция действует только для личных визиток. Организации участвуют по корпоративным тарифам.",
      action: "Получить бесплатно",
      badge: "Только 50 мест"
    }
  ],
  tj: [
    {
      eyebrow: "Оғози расмӣ ба наздикӣ",
      title: "Vizora ҳамаи тамосҳои шуморо дар як пайванди зебо муттаҳид мекунад",
      text: "Варақаҳои рақамӣ барои мутахассисон, гурӯҳҳо ва ташкилотҳои Тоҷикистон.",
      action: "Сохтани варақа"
    },
    {
      eyebrow: "Зудтар шинос шавед",
      title: "QR-кодро нишон диҳед — профили шумо аллакай назди муштарӣ аст",
      text: "Телефон, паёмрасонҳо, шабакаҳои иҷтимоӣ, суроға ва сомона бе барнома дастрасанд.",
      action: "Кушодани феҳрист"
    },
    {
      eyebrow: "Ҳамеша нав",
      title: "Маълумотро бе иваз кардани пайванд ва QR-код нав кунед",
      text: "Профилро як бор нав кунед — ҳамаи муштариён маълумоти навро мебинанд.",
      action: "Маълумоти бештар"
    },
    {
      eyebrow: "Иқдоми асосии оғоз",
      title: "50 корбари шахсии аввал — барои 1 сол ройгон",
      text: "Иқдом танҳо барои варақаҳои шахсӣ амал мекунад. Ташкилотҳо аз рӯи тарофаҳои корпоративӣ хизмат мегиранд.",
      action: "Ройгон гирифтан",
      badge: "Танҳо 50 ҷой"
    }
  ],
  en: [
    {
      eyebrow: "Official launch coming soon",
      title: "Vizora brings every contact into one beautiful link",
      text: "Digital business cards for professionals, teams and organizations in Tajikistan.",
      action: "Create a card"
    },
    {
      eyebrow: "Connect faster",
      title: "Show your QR code — your profile is already with the client",
      text: "Phone, messengers, social media, address and website with no app required.",
      action: "Open directory"
    },
    {
      eyebrow: "Always up to date",
      title: "Change your details without changing your link or QR",
      text: "Update once and every client immediately sees your current contacts.",
      action: "Learn more"
    },
    {
      eyebrow: "Featured launch offer",
      title: "The first 50 personal users get 1 year free",
      text: "This offer is for personal cards only. Organizations use corporate plans.",
      action: "Get it free",
      badge: "Only 50 places"
    }
  ]
} as const;

const icons = [Smartphone, QrCode, ShieldCheck, Gift];

export default function HomePromoCarousel() {
  const { language } = useApp();
  const [active, setActive] = useState(0);
  const slides = slideCopy[language];

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 6200);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  return (
    <section className="home-promo-carousel" aria-roledescription="carousel" aria-label="Vizora">
      <div className="home-promo-stage">
        {slides.map((slide, index) => {
          const Icon = icons[index];
          const isOffer = index === slides.length - 1;
          return (
            <article
              className={`home-promo-slide home-promo-slide-${index + 1}${active === index ? " is-active" : ""}${isOffer ? " is-offer" : ""}`}
              aria-hidden={active !== index}
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
                {"badge" in slide && slide.badge && <strong className="home-promo-badge"><Users size={15} />{slide.badge}</strong>}
                <Link
                  to={index === 1 ? "/directory" : index === 2 ? "/services" : "/create"}
                  className={isOffer ? "home-promo-action home-promo-action-offer" : "home-promo-action"}
                  tabIndex={active === index ? 0 : -1}
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
      <div className="home-promo-controls" role="tablist" aria-label="Баннеры Vizora">
        {slides.map((slide, index) => (
          <button
            type="button"
            role="tab"
            aria-selected={active === index}
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

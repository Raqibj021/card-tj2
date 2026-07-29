import { useState } from "react";
import { ChevronRight, Headphones, HelpCircle, MessageCircle, X } from "lucide-react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";

export default function HelpWidget() {
  const { language } = useApp();
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<readonly [string, string] | null>(null);
  const localized = {
    ru: {
      title: "Помощник Vizora", subtitle: "Отвечаю только о платформе", close: "Закрыть", all: "← Все вопросы", greeting: "Здравствуйте! Чем помочь?", manager: "Связаться с менеджером",
      topics: [
        ["Как создать визитку?", "Откройте конструктор, заполните контакты, выберите оформление и сохраните визитку."],
        ["Как зарегистрировать организацию?", "В разделе «Организации» выберите тариф и заполните заявку уполномоченного лица."],
        ["Как проходит оплата?", "После выбора тарифа вы увидите реквизиты. Загрузите чек — менеджер проверит оплату и система отправит код активации."],
        ["Как попасть в каталог?", "Нужно подтвердить телефон, личность и профессию. После проверки визитка появится в открытом каталоге."],
        ["Почему QR не открывается?", "Публичный QR работает после сохранения визитки в системе и её активации."]
      ]
    },
    tj: {
      title: "Ёрдамчии Vizora", subtitle: "Танҳо оид ба платформа ҷавоб медиҳам", close: "Пӯшидан", all: "← Ҳамаи саволҳо", greeting: "Салом! Чӣ гуна кумак кунам?", manager: "Тамос бо менеҷер",
      topics: [
        ["Варақаро чӣ гуна созам?", "Конструкторро кушоед, тамосҳоро пур кунед, ороишро интихоб намуда, варақаро нигоҳ доред."],
        ["Ташкилотро чӣ гуна сабт кунам?", "Дар бахши «Ташкилотҳо» тарофаро интихоб карда, дархости шахси масъулро пур кунед."],
        ["Пардохт чӣ гуна мегузарад?", "Пас аз интихоби тарофа реквизитҳо нишон дода мешаванд. Расидро бор кунед — менеҷер пардохтро санҷида, система рамзи фаъолсозиро мефиристад."],
        ["Чӣ гуна ба феҳрист ворид шавам?", "Телефон, шахсият ва касбро тасдиқ кардан лозим аст. Пас аз санҷиш варақа дар феҳристи кушода пайдо мешавад."],
        ["Чаро QR кушода намешавад?", "QR-и оммавӣ пас аз нигоҳдорӣ ва фаъолсозии варақа кор мекунад."]
      ]
    },
    en: {
      title: "Vizora Assistant", subtitle: "I answer questions about the platform only", close: "Close", all: "← All questions", greeting: "Hello! How can I help?", manager: "Contact a manager",
      topics: [
        ["How do I create a card?", "Open the builder, enter your contacts, choose a design and save the card."],
        ["How do I register an organization?", "Choose a plan in Organizations and complete the authorized representative’s application."],
        ["How does payment work?", "After choosing a plan, you will see the payment details. Upload the receipt; a manager will verify it and the system will send an activation code."],
        ["How do I appear in the directory?", "Verify your phone, identity and profession. After review, the card will appear in the public directory."],
        ["Why does the QR code not open?", "The public QR code works after the card is saved and activated."]
      ]
    }
  }[language];
  const topics: readonly (readonly [string, string])[] = localized.topics.map(
    ([question, response]) => [question, response] as const
  );

  return (
    <>
      <button
        type="button"
        className="help-launcher"
        onClick={() => setOpen((value) => !value)}
        aria-label={localized.title}
      >
        {open ? <X size={22} /> : <MessageCircle size={23} />}
      </button>
      {open && (
        <aside className="help-panel" aria-label={localized.title}>
          <div className="help-head">
            <div className="help-avatar"><HelpCircle size={20} /></div>
            <div>
              <strong>{localized.title}</strong>
              <span>{localized.subtitle}</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label={localized.close}>
              <X size={18} />
            </button>
          </div>
          <div className="help-body">
            {answer ? (
              <>
                <button type="button" className="help-back" onClick={() => setAnswer(null)}>
                  {localized.all}
                </button>
                <h3>{answer[0]}</h3>
                <p>{answer[1]}</p>
              </>
            ) : (
              <>
                <p className="help-greeting">{localized.greeting}</p>
                <div className="help-topics">
                  {topics.map((topic) => (
                    <button type="button" key={topic[0]} onClick={() => setAnswer(topic)}>
                      {topic[0]} <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <Link to="/support" className="help-manager">
            <Headphones size={18} />
            {localized.manager}
          </Link>
        </aside>
      )}
    </>
  );
}

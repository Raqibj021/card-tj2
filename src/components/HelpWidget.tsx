import { useState } from "react";
import { ChevronRight, Headphones, HelpCircle, MessageCircle, X } from "lucide-react";
import { Link } from "react-router";

const topics = [
  ["Как создать визитку?", "Откройте конструктор, заполните контакты, выберите оформление и сохраните визитку."],
  ["Как зарегистрировать организацию?", "В разделе «Организации» выберите тариф и заполните заявку уполномоченного лица."],
  ["Как проходит оплата?", "После выбора тарифа вы увидите реквизиты. Загрузите чек — менеджер проверит оплату и система отправит код активации."],
  ["Как попасть в каталог?", "Нужно подтвердить телефон, личность и профессию. После проверки визитка появится в открытом каталоге."],
  ["Почему QR не открывается?", "Публичный QR работает после сохранения визитки в системе и её активации."]
] as const;

export default function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<(typeof topics)[number] | null>(null);

  return (
    <>
      <button
        type="button"
        className="help-launcher"
        onClick={() => setOpen((value) => !value)}
        aria-label="Помощник Vizora"
      >
        {open ? <X size={22} /> : <MessageCircle size={23} />}
      </button>
      {open && (
        <aside className="help-panel" aria-label="Помощник Vizora">
          <div className="help-head">
            <div className="help-avatar"><HelpCircle size={20} /></div>
            <div>
              <strong>Помощник Vizora</strong>
              <span>Отвечаю только о платформе</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Закрыть">
              <X size={18} />
            </button>
          </div>
          <div className="help-body">
            {answer ? (
              <>
                <button type="button" className="help-back" onClick={() => setAnswer(null)}>
                  ← Все вопросы
                </button>
                <h3>{answer[0]}</h3>
                <p>{answer[1]}</p>
              </>
            ) : (
              <>
                <p className="help-greeting">Здравствуйте! Чем помочь?</p>
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
            Связаться с менеджером
          </Link>
        </aside>
      )}
    </>
  );
}

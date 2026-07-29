import { CheckCircle2, PhoneCall, Send, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useApp } from "../context/AppContext";
import { leadRepository, type Lead } from "../lib/leadRepository";

interface LeadFormModalProps {
  cardId: string;
  cardSlug: string;
  ownerName: string;
  source: Lead["source"];
  onClose: () => void;
}

const modalCopy = {
  ru: {
    titles: { contact: "Связаться", callback: "Заказать звонок", request: "Оставить заявку" },
    forOwner: "Обращение для", sent: "Обращение отправлено",
    sentText: "Владелец визитки увидит его в разделе «Лиды» и сможет связаться с вами.",
    done: "Готово", name: "Ваше имя *", phone: "Телефон *", email: "Электронная почта",
    service: "Услуга", serviceHint: "Какая услуга нужна?", message: "Сообщение",
    messageHint: "Кратко опишите запрос", consent: "Согласен передать контакт владельцу визитки для ответа на обращение.",
    send: "Отправить", close: "Закрыть"
  },
  tj: {
    titles: { contact: "Тамос", callback: "Дархости занг", request: "Пешниҳоди дархост" },
    forOwner: "Муроҷиат барои", sent: "Муроҷиат фиристода шуд",
    sentText: "Соҳиби варақа муроҷиатро дар бахши «Лидҳо» мебинад ва бо шумо тамос мегирад.",
    done: "Омода", name: "Номи шумо *", phone: "Телефон *", email: "Почтаи электронӣ",
    service: "Хизматрасонӣ", serviceHint: "Кадом хизматрасонӣ лозим аст?", message: "Паём",
    messageHint: "Дархости худро кӯтоҳ шарҳ диҳед", consent: "Барои ҷавоб додан ба муроҷиат, ба интиқоли маълумоти тамос ба соҳиби варақа розӣ ҳастам.",
    send: "Фиристодан", close: "Пӯшидан"
  },
  en: {
    titles: { contact: "Contact", callback: "Request a call", request: "Send a request" },
    forOwner: "Request for", sent: "Request sent",
    sentText: "The card owner will see it in Leads and can contact you.",
    done: "Done", name: "Your name *", phone: "Phone *", email: "Email",
    service: "Service", serviceHint: "Which service do you need?", message: "Message",
    messageHint: "Briefly describe your request", consent: "I agree to share my contact details with the card owner for a response.",
    send: "Send", close: "Close"
  }
} as const;

export default function LeadFormModal({
  cardId,
  cardSlug,
  ownerName,
  source,
  onClose
}: LeadFormModalProps) {
  const { language } = useApp();
  const text = modalCopy[language];
  const [sent, setSent] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    leadRepository.create({
      cardId,
      cardSlug,
      source,
      clientName: String(data.get("clientName")),
      phone: String(data.get("phone")),
      email: String(data.get("email")),
      service: String(data.get("service")),
      message: String(data.get("message"))
    });
    setSent(true);
  }

  return (
    <div className="platform-modal" role="dialog" aria-modal="true" aria-label={text.titles[source]}>
      <section className="platform-modal-card lead-modal-card">
        <div className="modal-head">
          <div><span className="section-label">{text.forOwner} {ownerName}</span><h2>{text.titles[source]}</h2></div>
          <button type="button" onClick={onClose} aria-label={text.close}><X size={20} /></button>
        </div>
        {sent ? (
          <div className="lead-success">
            <CheckCircle2 size={50} />
            <h3>{text.sent}</h3>
            <p>{text.sentText}</p>
            <button type="button" className="button button-primary" onClick={onClose}>{text.done}</button>
          </div>
        ) : (
          <form className="platform-form" onSubmit={submit}>
            <div className="form-grid">
              <label><span>{text.name}</span><input name="clientName" required /></label>
              <label><span>{text.phone}</span><input name="phone" type="tel" required placeholder="+992" /></label>
              <label><span>{text.email}</span><input name="email" type="email" /></label>
              <label><span>{text.service}</span><input name="service" placeholder={text.serviceHint} /></label>
            </div>
            <label><span>{text.message}</span><textarea name="message" rows={4} placeholder={text.messageHint} /></label>
            <label className="consent-row"><input type="checkbox" required /><span>{text.consent}</span></label>
            <button className="button button-primary button-large" type="submit">{source === "callback" ? <PhoneCall size={18} /> : <Send size={18} />} {text.send}</button>
          </form>
        )}
      </section>
    </div>
  );
}

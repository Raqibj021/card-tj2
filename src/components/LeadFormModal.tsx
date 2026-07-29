import { CheckCircle2, PhoneCall, Send, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { leadRepository, type Lead } from "../lib/leadRepository";

interface LeadFormModalProps {
  cardId: string;
  cardSlug: string;
  ownerName: string;
  source: Lead["source"];
  onClose: () => void;
}

const titles = {
  contact: "Связаться",
  callback: "Заказать звонок",
  request: "Оставить заявку"
};

export default function LeadFormModal({
  cardId,
  cardSlug,
  ownerName,
  source,
  onClose
}: LeadFormModalProps) {
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
    <div className="platform-modal" role="dialog" aria-modal="true" aria-label={titles[source]}>
      <section className="platform-modal-card lead-modal-card">
        <div className="modal-head">
          <div><span className="section-label">Обращение для {ownerName}</span><h2>{titles[source]}</h2></div>
          <button type="button" onClick={onClose} aria-label="Закрыть"><X size={20} /></button>
        </div>
        {sent ? (
          <div className="lead-success">
            <CheckCircle2 size={50} />
            <h3>Обращение отправлено</h3>
            <p>Владелец визитки увидит его в разделе «Лиды» и сможет связаться с вами.</p>
            <button type="button" className="button button-primary" onClick={onClose}>Готово</button>
          </div>
        ) : (
          <form className="platform-form" onSubmit={submit}>
            <div className="form-grid">
              <label><span>Ваше имя *</span><input name="clientName" required /></label>
              <label><span>Телефон *</span><input name="phone" type="tel" required placeholder="+992" /></label>
              <label><span>Электронная почта</span><input name="email" type="email" /></label>
              <label><span>Услуга</span><input name="service" placeholder="Какая услуга нужна?" /></label>
            </div>
            <label><span>Сообщение</span><textarea name="message" rows={4} placeholder="Кратко опишите запрос" /></label>
            <label className="consent-row"><input type="checkbox" required /><span>Согласен передать контакт владельцу визитки для ответа на обращение.</span></label>
            <button className="button button-primary button-large" type="submit">{source === "callback" ? <PhoneCall size={18} /> : <Send size={18} />} Отправить</button>
          </form>
        )}
      </section>
    </div>
  );
}

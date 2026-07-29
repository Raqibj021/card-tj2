import { Headphones, Mail, Phone, Send } from "lucide-react";
import WhatsAppIcon from "../components/icons/WhatsAppIcon";
import Footer from "../components/layout/Footer";
import { useApp } from "../context/AppContext";
import { useState, type FormEvent } from "react";
import { supportRepository } from "../lib/supportRepository";

export default function SupportPage() {
  const { language } = useApp();
  const [ticket, setTicket] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const copy = {
    ru: { label: "Поддержка Vizora", title: "Связь с менеджером", text: "Опишите вопрос — обращение получит номер и сохранится в вашем кабинете.", name: "Ваше имя *", namePlaceholder: "Имя и фамилия", phone: "Телефон *", topic: "Тема обращения *", topics: ["Создание визитки", "Регистрация организации", "Тариф и оплата", "Проверка специалиста", "Техническая проблема"], number: "Номер заявки", numberHint: "Если имеется", message: "Сообщение *", messageHint: "Кратко опишите вопрос", send: "Отправить обращение", manager: "Менеджер Vizora", working: "Ответ в рабочее время", email: "Электронная почта", chat: "Открыть чат", write: "Написать менеджеру", call: "Заказать звонок" },
    tj: { label: "Дастгирии Vizora", title: "Тамос бо менеҷер", text: "Саволи худро шарҳ диҳед — муроҷиат рақам мегирад ва дар кабинети шумо нигоҳ дошта мешавад.", name: "Номи шумо *", namePlaceholder: "Ному насаб", phone: "Телефон *", topic: "Мавзӯи муроҷиат *", topics: ["Сохтани варақа", "Сабти ташкилот", "Тарофа ва пардохт", "Санҷиши мутахассис", "Мушкили техникӣ"], number: "Рақами дархост", numberHint: "Агар мавҷуд бошад", message: "Паём *", messageHint: "Саволро кӯтоҳ шарҳ диҳед", send: "Фиристодани муроҷиат", manager: "Менеҷери Vizora", working: "Ҷавоб дар вақти корӣ", email: "Почтаи электронӣ", chat: "Кушодани чат", write: "Навиштан ба менеҷер", call: "Дархости занг" },
    en: { label: "Vizora support", title: "Contact a manager", text: "Describe your question. The request will receive a number and be saved in your dashboard.", name: "Your name *", namePlaceholder: "Full name", phone: "Phone *", topic: "Request topic *", topics: ["Creating a business card", "Organization registration", "Plan and payment", "Specialist verification", "Technical issue"], number: "Request number", numberHint: "If available", message: "Message *", messageHint: "Briefly describe your question", send: "Send request", manager: "Vizora manager", working: "Reply during business hours", email: "Email", chat: "Open chat", write: "Message the manager", call: "Request a call" }
  }[language];
  return (
    <>
      <main className="support-page">
        <div className="site-container py-14 md:py-20">
          <div className="section-heading">
            <span className="section-label">{copy.label}</span>
            <h1>{copy.title}</h1>
            <p>{copy.text}</p>
          </div>
          <div className="support-layout">
            <section className="application-panel">
              <form className="platform-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                const data = new FormData(event.currentTarget);
                try {
                  setTicket(await supportRepository.create({
                    name: String(data.get("name")),
                    phone: String(data.get("phone")),
                    topic: String(data.get("topic")),
                    reference: String(data.get("reference")),
                    message: String(data.get("message"))
                  }));
                  event.currentTarget.reset();
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Не удалось отправить обращение.");
                } finally {
                  setBusy(false);
                }
              }}>
                <div className="form-grid">
                  <label><span>{copy.name}</span><input name="name" required placeholder={copy.namePlaceholder} /></label>
                  <label><span>{copy.phone}</span><input name="phone" required type="tel" placeholder="+992" /></label>
                  <label><span>{copy.topic}</span><select name="topic" required>{copy.topics.map((topic) => <option key={topic}>{topic}</option>)}</select></label>
                  <label><span>{copy.number}</span><input name="reference" placeholder={copy.numberHint} /></label>
                </div>
                <label><span>{copy.message}</span><textarea name="message" required rows={6} placeholder={copy.messageHint} /></label>
                {ticket && <div className="activation-result"><span>{copy.number}: <strong>{ticket}</strong></span></div>}
                {error && <div className="auth-message">{error}</div>}
                <button className="button button-primary button-large" type="submit" disabled={busy}><Send size={18} /> {busy ? "…" : copy.send}</button>
              </form>
            </section>
            <aside className="support-options">
              <div className="support-option"><Headphones size={22} /><div><strong>{copy.manager}</strong><span>{copy.working}</span></div></div>
              <a href="mailto:support@vizora.tj" className="support-option"><Mail size={22} /><div><strong>support@vizora.tj</strong><span>{copy.email}</span></div></a>
              <button type="button" className="support-option"><WhatsAppIcon size={22} /><div><strong>WhatsApp</strong><span>{copy.chat}</span></div></button>
              <button type="button" className="support-option"><Send size={22} /><div><strong>Telegram</strong><span>{copy.write}</span></div></button>
              <button type="button" className="support-option"><Phone size={22} /><div><strong>{copy.phone.replace(" *", "")}</strong><span>{copy.call}</span></div></button>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

import { Headphones, Mail, MessageCircle, Phone, Send } from "lucide-react";
import Footer from "../components/layout/Footer";

export default function SupportPage() {
  return (
    <>
      <main className="support-page">
        <div className="site-container py-14 md:py-20">
          <div className="section-heading">
            <span className="section-label">Поддержка Vizora</span>
            <h1>Связь с менеджером</h1>
            <p>Опишите вопрос — обращение получит номер и сохранится в вашем кабинете.</p>
          </div>
          <div className="support-layout">
            <section className="application-panel">
              <form className="platform-form" onSubmit={(event) => event.preventDefault()}>
                <div className="form-grid">
                  <label><span>Ваше имя *</span><input required placeholder="Имя и фамилия" /></label>
                  <label><span>Телефон *</span><input required type="tel" placeholder="+992" /></label>
                  <label><span>Тема обращения *</span><select required><option>Создание визитки</option><option>Регистрация организации</option><option>Тариф и оплата</option><option>Проверка специалиста</option><option>Техническая проблема</option></select></label>
                  <label><span>Номер заявки</span><input placeholder="Если имеется" /></label>
                </div>
                <label><span>Сообщение *</span><textarea required rows={6} placeholder="Кратко опишите вопрос" /></label>
                <button className="button button-primary button-large" type="submit"><Send size={18} /> Отправить обращение</button>
              </form>
            </section>
            <aside className="support-options">
              <div className="support-option"><Headphones size={22} /><div><strong>Менеджер Vizora</strong><span>Ответ в рабочее время</span></div></div>
              <a href="mailto:support@vizora.tj" className="support-option"><Mail size={22} /><div><strong>support@vizora.tj</strong><span>Электронная почта</span></div></a>
              <button type="button" className="support-option"><MessageCircle size={22} /><div><strong>WhatsApp</strong><span>Открыть чат</span></div></button>
              <button type="button" className="support-option"><Send size={22} /><div><strong>Telegram</strong><span>Написать менеджеру</span></div></button>
              <button type="button" className="support-option"><Phone size={22} /><div><strong>Телефон</strong><span>Заказать звонок</span></div></button>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

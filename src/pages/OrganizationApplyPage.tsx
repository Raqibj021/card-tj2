import { Building2, CheckCircle2, Clock3, CreditCard, LockKeyhole } from "lucide-react";
import { useState } from "react";
import Footer from "../components/layout/Footer";

export default function OrganizationApplyPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <>
      <main className="application-page">
        <div className="site-container grid gap-8 py-10 lg:grid-cols-[1fr_360px] lg:py-14">
          <section className="application-panel">
            <span className="section-label">Заявка организации</span>
            <h1>Регистрация в Vizora</h1>
            <p className="form-intro">Черновик сохраняется автоматически. После проверки оплаты вы получите код активации.</p>
            {submitted ? (
              <div className="application-success">
                <CheckCircle2 size={48} />
                <h2>Заявка сохранена</h2>
                <p>Демонстрационный режим: после подключения Supabase заявка будет доступна по номеру и на другом устройстве.</p>
                <button type="button" className="button button-primary" onClick={() => setSubmitted(false)}>Изменить данные</button>
              </div>
            ) : (
              <form className="platform-form" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
                <div className="form-grid">
                  <label><span>Название организации *</span><input required placeholder="Полное название" /></label>
                  <label><span>Тип организации *</span><select required defaultValue=""><option value="" disabled>Выберите</option><option>Компания</option><option>Учебное учреждение</option><option>Государственное учреждение</option><option>Магазин</option><option>Другое</option></select></label>
                  <label><span>ФИО ответственного лица *</span><input required placeholder="Имя и фамилия" /></label>
                  <label><span>Должность *</span><input required placeholder="Руководитель или администратор" /></label>
                  <label><span>Телефон *</span><input required type="tel" placeholder="+992" /></label>
                  <label><span>Электронная почта *</span><input required type="email" placeholder="name@company.tj" /></label>
                </div>
                <fieldset>
                  <legend>Выберите тариф</legend>
                  <div className="plan-radio-grid">
                    {["Start — до 20 / 200 с.", "Business — до 50 / 300 с.", "Pro — до 100 / 500 с."].map((plan, index) => (
                      <label key={plan}><input type="radio" name="plan" required defaultChecked={index === 0} /><span>{plan}</span></label>
                    ))}
                  </div>
                </fieldset>
                <label className="consent-row"><input required type="checkbox" /> Я подтверждаю достоверность данных и согласен с правилами платформы.</label>
                <button className="button button-primary button-large" type="submit">Сохранить заявку</button>
              </form>
            )}
          </section>
          <aside className="application-aside">
            <Building2 size={26} />
            <h2>Как проходит активация</h2>
            <ol>
              <li><span>1</span> Заполните заявку</li>
              <li><span>2</span> Переведите оплату</li>
              <li><span>3</span> Загрузите подтверждение</li>
              <li><span>4</span> Получите код активации</li>
            </ol>
            <div className="payment-note"><CreditCard size={18} /><div><strong>Реквизиты после заявки</strong><span>ДС Банк и Alif Bank: 929213537</span></div></div>
            <div className="payment-note"><Clock3 size={18} /><div><strong>Проверка до 3 часов</strong><span>Заявка сохраняется 7 дней</span></div></div>
            <div className="payment-note"><LockKeyhole size={18} /><div><strong>Защищённые данные</strong><span>Документы не публикуются</span></div></div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

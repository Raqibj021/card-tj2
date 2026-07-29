import { Building2, CheckCircle2, Clock3, CreditCard, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import Footer from "../components/layout/Footer";
import { useApp } from "../context/AppContext";
import { organizationRepository } from "../lib/organizationRepository";

export default function OrganizationApplyPage() {
  const { language } = useApp();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const c = {
    ru: { label: "Заявка организации", title: "Регистрация в Vizora", intro: "Черновик сохраняется автоматически. После проверки оплаты вы получите код активации.", saved: "Заявка сохранена", demo: "Демонстрационный режим: после подключения Supabase заявка будет доступна по номеру и на другом устройстве.", edit: "Изменить данные", org: "Название организации *", full: "Полное название", type: "Тип организации *", choose: "Выберите", types: ["Компания", "Учебное учреждение", "Государственное учреждение", "Магазин", "Другое"], person: "ФИО ответственного лица *", personHint: "Имя и фамилия", position: "Должность *", positionHint: "Руководитель или администратор", phone: "Телефон *", email: "Электронная почта *", plan: "Выберите тариф", consent: "Я подтверждаю достоверность данных и согласен с правилами платформы.", save: "Сохранить заявку", activation: "Как проходит активация", steps: ["Заполните заявку", "Переведите оплату", "Загрузите подтверждение", "Получите код активации"], requisites: "Реквизиты после заявки", check: "Проверка до 3 часов", kept: "Заявка сохраняется 7 дней", protected: "Защищённые данные", private: "Документы не публикуются" },
    tj: { label: "Дархости ташкилот", title: "Сабти ном дар Vizora", intro: "Нусхаи муваққатӣ худкор нигоҳ дошта мешавад. Пас аз санҷиши пардохт рамзи фаъолсозиро мегиред.", saved: "Дархост нигоҳ дошта шуд", demo: "Реҷаи намоишӣ: пас аз пайваст кардани Supabase дархост аз рӯи рақам ва дар дастгоҳи дигар дастрас мешавад.", edit: "Тағйир додани маълумот", org: "Номи ташкилот *", full: "Номи пурра", type: "Навъи ташкилот *", choose: "Интихоб кунед", types: ["Ширкат", "Муассисаи таълимӣ", "Муассисаи давлатӣ", "Мағоза", "Дигар"], person: "Ному насаби шахси масъул *", personHint: "Ному насаб", position: "Вазифа *", positionHint: "Роҳбар ё маъмур", phone: "Телефон *", email: "Почтаи электронӣ *", plan: "Тарофаро интихоб кунед", consent: "Дурустии маълумотро тасдиқ намуда, ба қоидаҳои платформа розӣ ҳастам.", save: "Нигоҳ доштани дархост", activation: "Фаъолсозӣ чӣ гуна мегузарад", steps: ["Дархостро пур кунед", "Пардохтро гузаронед", "Тасдиқномаро бор кунед", "Рамзи фаъолсозиро гиред"], requisites: "Реквизитҳо пас аз дархост", check: "Санҷиш то 3 соат", kept: "Дархост 7 рӯз нигоҳ дошта мешавад", protected: "Маълумоти муҳофизатшуда", private: "Ҳуҷҷатҳо нашр намешаванд" },
    en: { label: "Organization application", title: "Register with Vizora", intro: "Your draft is saved automatically. After payment verification, you will receive an activation code.", saved: "Application saved", demo: "Demo mode: after Supabase is connected, the application will be available by number and on another device.", edit: "Edit information", org: "Organization name *", full: "Full legal name", type: "Organization type *", choose: "Choose", types: ["Company", "Educational institution", "Government institution", "Store", "Other"], person: "Authorized person’s full name *", personHint: "Full name", position: "Position *", positionHint: "Manager or administrator", phone: "Phone *", email: "Email *", plan: "Choose a plan", consent: "I confirm that the information is accurate and accept the platform rules.", save: "Save application", activation: "How activation works", steps: ["Complete the application", "Make the payment", "Upload confirmation", "Receive an activation code"], requisites: "Payment details after application", check: "Verification within 3 hours", kept: "Application is saved for 7 days", protected: "Protected information", private: "Documents are not published" }
  }[language];

  return (
    <>
      <main className="application-page">
        <div className="site-container grid gap-8 py-10 lg:grid-cols-[1fr_360px] lg:py-14">
          <section className="application-panel">
            <span className="section-label">{c.label}</span>
            <h1>{c.title}</h1>
            <p className="form-intro">{c.intro}</p>
            {submitted ? (
              <div className="application-success">
                <CheckCircle2 size={48} />
                <h2>{c.saved}</h2>
                <p>{c.demo}</p>
                <button type="button" className="button button-primary" onClick={() => setSubmitted(false)}>{c.edit}</button>
              </div>
            ) : (
              <form className="platform-form" onSubmit={async (event) => {
                event.preventDefault();
                setBusy(true);
                setError("");
                const form = new FormData(event.currentTarget);
                try {
                  const plan = String(form.get("plan") ?? "start");
                  const organization = await organizationRepository.createApplication({
                    name: String(form.get("organizationName")),
                    type: String(form.get("organizationType")),
                    contactName: String(form.get("contactName")),
                    contactPosition: String(form.get("contactPosition")),
                    phone: String(form.get("phone")),
                    email: String(form.get("email")),
                    planCode: plan
                  });
                  setSubmitted(true);
                  window.setTimeout(() => navigate(`/payment?plan=${plan}&organization=${String(organization.id)}`), 700);
                } catch (caught) {
                  setError(caught instanceof Error ? caught.message : "Не удалось сохранить заявку.");
                } finally {
                  setBusy(false);
                }
              }}>
                <div className="form-grid">
                  <label><span>{c.org}</span><input name="organizationName" required placeholder={c.full} /></label>
                  <label><span>{c.type}</span><select name="organizationType" required defaultValue=""><option value="" disabled>{c.choose}</option>{c.types.map((type) => <option key={type}>{type}</option>)}</select></label>
                  <label><span>{c.person}</span><input name="contactName" required placeholder={c.personHint} /></label>
                  <label><span>{c.position}</span><input name="contactPosition" required placeholder={c.positionHint} /></label>
                  <label><span>{c.phone}</span><input name="phone" required type="tel" placeholder="+992" /></label>
                  <label><span>{c.email}</span><input name="email" required type="email" placeholder="name@company.tj" /></label>
                </div>
                <fieldset>
                  <legend>{c.plan}</legend>
                  <div className="plan-radio-grid">
                    {[
                      ["start", "Start — до 20 / 200 с."],
                      ["business", "Business — до 50 / 300 с."],
                      ["organization_pro", "Pro — до 100 / 500 с."]
                    ].map(([value, plan], index) => (
                      <label key={plan}><input type="radio" name="plan" value={value} required defaultChecked={index === 0} /><span>{plan}</span></label>
                    ))}
                  </div>
                </fieldset>
                <label className="consent-row"><input required type="checkbox" /> {c.consent}</label>
                {error && <div className="auth-message">{error}</div>}
                <button className="button button-primary button-large" type="submit" disabled={busy}>{busy ? "…" : c.save}</button>
              </form>
            )}
          </section>
          <aside className="application-aside">
            <Building2 size={26} />
            <h2>{c.activation}</h2>
            <ol>
              {c.steps.map((step, index) => <li key={step}><span>{index + 1}</span> {step}</li>)}
            </ol>
            <div className="payment-note"><CreditCard size={18} /><div><strong>{c.requisites}</strong><span>DC Bank / Alif Bank: 929213537</span></div></div>
            <div className="payment-note"><Clock3 size={18} /><div><strong>{c.check}</strong><span>{c.kept}</span></div></div>
            <div className="payment-note"><LockKeyhole size={18} /><div><strong>{c.protected}</strong><span>{c.private}</span></div></div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

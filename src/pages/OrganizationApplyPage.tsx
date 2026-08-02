import { Building2, CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import Footer from "../components/layout/Footer";
import OrganizationApplicationStatus from "../components/OrganizationApplicationStatus";
import { useApp } from "../context/AppContext";
import {
  organizationRepository,
  type OrganizationApplication
} from "../lib/organizationRepository";

export default function OrganizationApplyPage() {
  const [searchParams] = useSearchParams();
  const creatingNew = searchParams.get("new") === "1";
  const { language } = useApp();
  const [application, setApplication] = useState<OrganizationApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const copy = {
    ru: {
      label: "Заявка организации", title: "Регистрация организации",
      intro: "Заявка сохраняется в вашем аккаунте. После решения администратора здесь откроется рабочий кабинет организации.",
      org: "Название организации *", full: "Полное название", type: "Тип организации *",
      choose: "Выберите", types: ["Компания", "Учебное учреждение", "Государственное учреждение", "Магазин", "Другое"],
      person: "ФИО ответственного лица *", personHint: "Имя и фамилия",
      position: "Должность *", positionHint: "Руководитель или администратор",
      phone: "Телефон *", email: "Электронная почта *", plan: "Выберите тариф",
      consent: "Я подтверждаю достоверность данных и беру ответственность за добавляемых сотрудников и их визитки.",
      save: "Отправить заявку", review: "Порядок рассмотрения",
      steps: ["Заполните достоверные данные", "Выберите тариф", "Администратор проверит заявку", "Решение и комментарий придут в уведомления"],
      protected: "Заявка не потеряется", private: "После повторного входа вы увидите её актуальный статус.",
      responsibility: "Ответственность организации", responsibilityText: "После одобрения уполномоченное лицо самостоятельно создаёт структуру и визитки сотрудников без повторной модерации платформой.",
      loadError: "Не удалось загрузить заявку."
    },
    tj: {
      label: "Дархости ташкилот", title: "Сабти ташкилот",
      intro: "Дархост дар ҳисоби шумо нигоҳ дошта мешавад. Пас аз қарори администратор кабинети кории ташкилот дар ҳамин ҷо кушода мешавад.",
      org: "Номи ташкилот *", full: "Номи пурра", type: "Навъи ташкилот *",
      choose: "Интихоб кунед", types: ["Ширкат", "Муассисаи таълимӣ", "Муассисаи давлатӣ", "Мағоза", "Дигар"],
      person: "Ному насаби шахси масъул *", personHint: "Ному насаб",
      position: "Вазифа *", positionHint: "Роҳбар ё маъмур",
      phone: "Телефон *", email: "Почтаи электронӣ *", plan: "Тарофаро интихоб кунед",
      consent: "Дурустии маълумотро тасдиқ мекунам ва барои кормандон ва варақаҳои онҳо масъулият мегирам.",
      save: "Фиристодани дархост", review: "Тартиби баррасӣ",
      steps: ["Маълумоти дурустро пур кунед", "Тарофаро интихоб кунед", "Администратор дархостро месанҷад", "Қарор ва шарҳ ба огоҳиҳо меоянд"],
      protected: "Дархост гум намешавад", private: "Пас аз воридшавии дубора ҳолати ҷории он нишон дода мешавад.",
      responsibility: "Масъулияти ташкилот", responsibilityText: "Пас аз тасдиқ шахси ваколатдор сохтор ва варақаҳои кормандонро бе санҷиши такрории платформа месозад.",
      loadError: "Дархост бор карда нашуд."
    },
    en: {
      label: "Organization application", title: "Register an organization",
      intro: "The application is saved in your account. Once the administrator decides, the organization workspace will open here.",
      org: "Organization name *", full: "Full legal name", type: "Organization type *",
      choose: "Choose", types: ["Company", "Educational institution", "Government institution", "Store", "Other"],
      person: "Authorized person’s full name *", personHint: "Full name",
      position: "Position *", positionHint: "Manager or administrator",
      phone: "Phone *", email: "Email *", plan: "Choose a plan",
      consent: "I confirm the information is accurate and accept responsibility for employees and their cards.",
      save: "Submit application", review: "Review process",
      steps: ["Enter accurate information", "Choose a plan", "The administrator reviews the application", "The decision and comment appear in Notifications"],
      protected: "Your application is retained", private: "Its current status remains available after you sign in again.",
      responsibility: "Organization responsibility", responsibilityText: "After approval, the authorized manager creates the structure and employee cards without another platform review.",
      loadError: "Could not load the application."
    }
  }[language];

  useEffect(() => {
    let active = true;
    const loadApplication = () => {
      (creatingNew ? Promise.resolve(null) : organizationRepository.getCurrentApplication())
        .then((result) => {
          if (active) {
            setApplication(result);
            setError("");
          }
        })
        .catch((caught) => {
          if (active) setError(caught instanceof Error ? caught.message : copy.loadError);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadApplication();
    };
    loadApplication();
    window.addEventListener("focus", loadApplication);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      active = false;
      window.removeEventListener("focus", loadApplication);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const canEdit = application?.reviewStatus === "rejected" || application?.reviewStatus === "changes_requested";

  return (
    <>
      <main className="application-page">
        <div className="site-container py-10 lg:py-14">
          {loading ? (
            <div className="route-loading"><span /><p>...</p></div>
          ) : application && !editing ? (
            <div className="organization-status-page">
              <OrganizationApplicationStatus
                organization={application}
                onEdit={canEdit ? () => setEditing(true) : undefined}
              />
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
              <section className="application-panel">
                <span className="section-label">{copy.label}</span>
                <h1>{copy.title}</h1>
                <p className="form-intro">{copy.intro}</p>
                <form
                  className="platform-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setBusy(true);
                    setError("");
                    const form = new FormData(event.currentTarget);
                    try {
                      const result = await organizationRepository.createApplication({
                        name: String(form.get("organizationName") ?? ""),
                        type: String(form.get("organizationType") ?? ""),
                        contactName: String(form.get("contactName") ?? ""),
                        contactPosition: String(form.get("contactPosition") ?? ""),
                        phone: String(form.get("phone") ?? ""),
                        email: String(form.get("email") ?? ""),
                        planCode: String(form.get("plan") ?? "start"),
                        createNew: creatingNew
                      });
                      setApplication(result);
                      setEditing(false);
                    } catch (caught) {
                      setError(caught instanceof Error ? caught.message : "Не удалось сохранить заявку.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <div className="form-grid">
                    <label><span>{copy.org}</span><input name="organizationName" required minLength={2} defaultValue={application?.displayName ?? ""} placeholder={copy.full} /></label>
                    <label>
                      <span>{copy.type}</span>
                      <select name="organizationType" required defaultValue={application?.organizationType ?? ""}>
                        <option value="" disabled>{copy.choose}</option>
                        {copy.types.map((type) => <option key={type}>{type}</option>)}
                      </select>
                    </label>
                    <label><span>{copy.person}</span><input name="contactName" required minLength={3} defaultValue={application?.contactName ?? ""} placeholder={copy.personHint} /></label>
                    <label><span>{copy.position}</span><input name="contactPosition" required minLength={2} defaultValue={application?.contactPosition ?? ""} placeholder={copy.positionHint} /></label>
                    <label><span>{copy.phone}</span><input name="phone" required type="tel" inputMode="tel" pattern="\+992[0-9]{9}" defaultValue={application?.phone ?? "+992"} placeholder="+992XXXXXXXXX" /></label>
                    <label><span>{copy.email}</span><input name="email" required type="email" defaultValue={application?.email ?? ""} placeholder="name@company.tj" /></label>
                  </div>
                  <fieldset>
                    <legend>{copy.plan}</legend>
                    <div className="plan-radio-grid">
                      {[
                        ["start", "Start — до 20 / 200 с."],
                        ["business", "Business — до 50 / 300 с."],
                        ["organization_pro", "Pro — до 100 / 500 с."]
                      ].map(([value, plan]) => (
                        <label key={plan}>
                          <input type="radio" name="plan" value={value} required defaultChecked={(application?.planCode ?? "start") === value} />
                          <span>{plan}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="consent-row"><input required type="checkbox" /> {copy.consent}</label>
                  {error && <div className="auth-message">{error}</div>}
                  <button className="button button-primary button-large" type="submit" disabled={busy}>{busy ? "…" : copy.save}</button>
                </form>
              </section>
              <aside className="application-aside">
                <Building2 size={26} />
                <h2>{copy.review}</h2>
                <ol>{copy.steps.map((step, index) => <li key={step}><span>{index + 1}</span> {step}</li>)}</ol>
                <div className="payment-note"><LockKeyhole size={18} /><div><strong>{copy.protected}</strong><span>{copy.private}</span></div></div>
                <div className="payment-note"><ShieldCheck size={18} /><div><strong>{copy.responsibility}</strong><span>{copy.responsibilityText}</span></div></div>
                <div className="payment-note"><CreditCard size={18} /><div><strong>DC Bank / Alif Bank</strong><span>{language === "ru" ? "Реквизиты указаны на странице оплаты" : language === "tj" ? "Реквизитҳо дар саҳифаи пардохт нишон дода шудаанд" : "Payment details are shown on the payment page"}</span></div></div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

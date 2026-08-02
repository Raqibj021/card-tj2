import { Building2, CreditCard, LockKeyhole, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import Footer from "../components/layout/Footer";
import OrganizationApplicationStatus from "../components/OrganizationApplicationStatus";
import { useApp } from "../context/AppContext";
import {
  organizationRepository,
  type OrganizationApplication
} from "../lib/organizationRepository";
import { paymentRepository } from "../lib/paymentRepository";

export default function OrganizationApplyPage() {
  const [searchParams] = useSearchParams();
  const creatingNew = searchParams.get("new") === "1";
  const { language } = useApp();
  const [application, setApplication] = useState<OrganizationApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptName, setReceiptName] = useState("");
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
      save: "Отправить заявку и чек", review: "Порядок рассмотрения",
      steps: ["Заполните достоверные данные", "Выберите тариф и оплатите", "Загрузите чек оплаты", "Администратор отдельно проверит оплату и организацию", "Два решения и комментарии придут в уведомления"],
      paymentTitle: "Оплата выбранного тарифа", paymentText: "Переведите точную сумму через DC Bank или Alif Bank на номер 084785555, затем загрузите чек.", payer: "ФИО отправителя платежа *", payerHint: "Как указано в платеже", receipt: "Загрузить чек оплаты", formats: "JPG, PNG или PDF до 5 МБ", receiptRequired: "Загрузите чек оплаты.",
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
      save: "Фиристодани дархост ва расид", review: "Тартиби баррасӣ",
      steps: ["Маълумоти дурустро пур кунед", "Тарофаро интихоб карда, пардохт кунед", "Расиди пардохтро бор кунед", "Администратор пардохт ва ташкилотро алоҳида месанҷад", "Ду қарор ва шарҳ ба огоҳиҳо меоянд"],
      paymentTitle: "Пардохти тарофаи интихобшуда", paymentText: "Маблағи дақиқро тавассути DC Bank ё Alif Bank ба рақами 084785555 гузаронед ва расидро бор кунед.", payer: "Ному насаби фиристандаи пардохт *", payerHint: "Тавре ки дар пардохт навишта шудааст", receipt: "Бор кардани расиди пардохт", formats: "JPG, PNG ё PDF то 5 МБ", receiptRequired: "Расиди пардохтро бор кунед.",
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
      save: "Submit application and receipt", review: "Review process",
      steps: ["Enter accurate information", "Choose a plan and pay", "Upload the payment receipt", "The administrator reviews payment and organization separately", "Both decisions and comments appear in Notifications"],
      paymentTitle: "Selected plan payment", paymentText: "Transfer the exact amount via DC Bank or Alif Bank to 084785555, then upload the receipt.", payer: "Payment sender’s full name *", payerHint: "As shown in the payment", receipt: "Upload payment receipt", formats: "JPG, PNG or PDF up to 5 MB", receiptRequired: "Upload the payment receipt.",
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
                    if (!receiptFile) { setError(copy.receiptRequired); return; }
                    setBusy(true);
                    setError("");
                    const form = new FormData(event.currentTarget);
                    try {
                      const organizationName = String(form.get("organizationName") ?? "");
                      const contactName = String(form.get("contactName") ?? "");
                      const phone = String(form.get("phone") ?? "");
                      const planCode = String(form.get("plan") ?? "start");
                      const result = await organizationRepository.createApplication({
                        name: organizationName,
                        type: String(form.get("organizationType") ?? ""),
                        contactName,
                        contactPosition: String(form.get("contactPosition") ?? ""),
                        phone,
                        email: String(form.get("email") ?? ""),
                        planCode,
                        createNew: creatingNew
                      });
                      // Keep the saved organization available even if the receipt upload is
                      // interrupted; the status page then offers a safe "continue payment" action.
                      setApplication(result);
                      await paymentRepository.create({
                        customerName: contactName,
                        phone,
                        plan: planCode,
                        planCode,
                        payerName: String(form.get("payerName") ?? ""),
                        receiptFile,
                        organizationId: result.id
                      });
                      result.paymentStatus = "payment_review";
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
                  <section className="inline-payment-guide">
                    <div><CreditCard size={22} /><div><strong>{copy.paymentTitle}</strong><p>{copy.paymentText}</p></div></div>
                    <b>DC Bank / Alif Bank · 084785555</b>
                    <label><span>{copy.payer}</span><input name="payerName" required minLength={2} maxLength={100} placeholder={copy.payerHint} /></label>
                    <label className="receipt-upload">
                      <Upload size={23} /><strong>{receiptName || copy.receipt}</strong><span>{copy.formats}</span>
                      <input type="file" required accept="image/png,image/jpeg,application/pdf" onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        if (file && file.size > 5 * 1024 * 1024) { setError(copy.formats); event.target.value = ""; setReceiptFile(null); setReceiptName(""); return; }
                        setError(""); setReceiptFile(file); setReceiptName(file?.name ?? "");
                      }} />
                    </label>
                  </section>
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
                <div className="payment-note"><CreditCard size={18} /><div><strong>DC Bank / Alif Bank</strong><span>084785555</span></div></div>
              </aside>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

import { CheckCircle2, Clock3, Copy, CreditCard, FileCheck2, LockKeyhole, ShieldCheck, Upload } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import Footer from "../components/layout/Footer";
import { paymentRepository, type PaymentRequest } from "../lib/paymentRepository";
import { useApp } from "../context/AppContext";

export default function PaymentPage() {
  const { language } = useApp();
  const c = {
    ru: { planNames: ["Личная визитка", "Проверенный специалист", "Специалист PRO", "Организация Start", "Организация Business", "Организация Pro"], accepted: "Заявка принята", acceptedText: "Чек получен. В ближайшее время администратор проверит оплату и одобрит вашу визитку. Дополнительный код вводить не нужно.", waiting: "Статус: ожидается проверка оплаты", manual: "Ручная оплата", title: "Подтверждение платежа", intro: "Переведите точную сумму по реквизитам и загрузите подтверждение. Черновик заказа сохраняется на 7 дней.", copied: "Скопировано", copy: "Копировать", amount: "Сумма к оплате", currency: "сомони", order: "Номер заказа", customer: "ФИО заказчика *", phone: "Телефон *", payer: "Имя отправителя платежа *", selected: "Выбранный тариф", upload: "Загрузить чек оплаты", formats: "JPG, PNG или PDF до 5 МБ", submit: "Отправить на проверку", safe: "Безопасный порядок", steps: ["Выберите тариф", "Переведите точную сумму", "Загрузите чек", "Дождитесь одобрения администратора"], hours: "До 3 часов", hoursText: "Максимальный срок ручной проверки", noPassword: "Не отправляйте пароль", noPasswordText: "Менеджер никогда его не запрашивает" },
    tj: { planNames: ["Варақаи шахсӣ", "Мутахассиси тасдиқшуда", "Мутахассиси PRO", "Ташкилоти Start", "Ташкилоти Business", "Ташкилоти Pro"], accepted: "Дархост қабул шуд", acceptedText: "Расид қабул шуд. Дар наздиктарин вақт администратор пардохтро месанҷад ва варақаи шуморо тасдиқ мекунад. Ворид кардани рамзи иловагӣ лозим нест.", waiting: "Ҳолат: санҷиши пардохт интизор аст", manual: "Пардохти дастӣ", title: "Тасдиқи пардохт", intro: "Маблағи дақиқро гузаронед ва тасдиқномаро бор кунед. Нусхаи фармоиш 7 рӯз нигоҳ дошта мешавад.", copied: "Нусхабардорӣ шуд", copy: "Нусхабардорӣ", amount: "Маблағи пардохт", currency: "сомонӣ", order: "Рақами фармоиш", customer: "Ному насаби фармоишгар *", phone: "Телефон *", payer: "Номи фиристандаи пардохт *", selected: "Тарофаи интихобшуда", upload: "Бор кардани расиди пардохт", formats: "JPG, PNG ё PDF то 5 МБ", submit: "Фиристодан ба санҷиш", safe: "Тартиби бехатар", steps: ["Тарофаро интихоб кунед", "Маблағи дақиқро гузаронед", "Расидро бор кунед", "Тасдиқи администраторро интизор шавед"], hours: "То 3 соат", hoursText: "Муҳлати ниҳоии санҷиши дастӣ", noPassword: "Рамзро нафиристед", noPasswordText: "Менеҷер ҳеҷ гоҳ онро талаб намекунад" },
    en: { planNames: ["Personal card", "Verified specialist", "Specialist PRO", "Organization Start", "Organization Business", "Organization Pro"], accepted: "Application received", acceptedText: "Receipt received. An administrator will verify the payment and approve your card shortly. No additional activation code is required.", waiting: "Status: awaiting payment verification", manual: "Manual payment", title: "Payment confirmation", intro: "Transfer the exact amount and upload confirmation. The order draft is saved for 7 days.", copied: "Copied", copy: "Copy", amount: "Amount due", currency: "somoni", order: "Order number", customer: "Customer full name *", phone: "Phone *", payer: "Payment sender’s name *", selected: "Selected plan", upload: "Upload payment receipt", formats: "JPG, PNG or PDF up to 5 MB", submit: "Send for verification", safe: "Secure process", steps: ["Choose a plan", "Transfer the exact amount", "Upload the receipt", "Wait for administrator approval"], hours: "Within 3 hours", hoursText: "Maximum manual verification time", noPassword: "Never send your password", noPasswordText: "A manager will never ask for it" }
  }[language];
  const plans = {
    personal: { name: c.planNames[0], amount: 20 },
    specialist: { name: c.planNames[1], amount: 50 },
    pro: { name: c.planNames[2], amount: 100 },
    start: { name: c.planNames[3], amount: 200 },
    business: { name: c.planNames[4], amount: 300 },
    organization_pro: { name: c.planNames[5], amount: 500 }
  };
  const [params] = useSearchParams();
  const planKey = params.get("plan") as keyof typeof plans;
  const organizationId = params.get("organization") ?? undefined;
  const plan = plans[planKey] ?? plans.personal;
  const [created, setCreated] = useState<PaymentRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [receiptName, setReceiptName] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const orderDraft = useMemo(() => `VZ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!receiptFile) return;
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      setCreated(await paymentRepository.create({
        customerName: String(data.get("customerName")),
        phone: String(data.get("phone")),
        plan: plan.name,
        planCode: planKey || "personal",
        amount: plan.amount,
        payerName: String(data.get("payerName")),
        receiptFile,
        organizationId
      }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось отправить оплату.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <main className="payment-page">
        <div className="site-container grid gap-8 py-10 lg:grid-cols-[1fr_380px] lg:py-14">
          <section className="application-panel">
            {created ? (
              <div className="payment-success">
                <CheckCircle2 size={54} />
                <span className="section-label">{c.accepted}</span>
                <h1>{created.orderNumber}</h1>
                <strong className="payment-reference-note">
                  {language === "ru" ? "Это номер заявки, не код активации." : language === "tj" ? "Ин рақами дархост аст, на рамзи фаъолсозӣ." : "This is the application number, not an activation code."}
                </strong>
                <p>{c.acceptedText}</p>
                <div><Clock3 size={18} /> {c.waiting}</div>
              </div>
            ) : (
              <>
                <span className="section-label">{c.manual}</span>
                <h1>{c.title}</h1>
                <p className="form-intro">{c.intro}</p>
                <div className="payment-details">
                  <div><CreditCard size={21} /><span><small>DC Bank / Alif Bank</small><strong>929213537</strong></span><button type="button" onClick={async () => { await navigator.clipboard.writeText("929213537"); setCopied(true); }}><Copy size={17} /> {copied ? c.copied : c.copy}</button></div>
                  <div><FileCheck2 size={21} /><span><small>{c.amount}</small><strong>{plan.amount} {c.currency}</strong></span></div>
                  <div><LockKeyhole size={21} /><span><small>{c.order}</small><strong>{orderDraft}</strong></span></div>
                </div>
                <form className="platform-form mt-7" onSubmit={submit}>
                  <div className="form-grid">
                    <label><span>{c.customer}</span><input name="customerName" required /></label>
                    <label><span>{c.phone}</span><input name="phone" type="tel" required placeholder="+992" /></label>
                    <label><span>{c.payer}</span><input name="payerName" required /></label>
                    <label><span>{c.selected}</span><input value={`${plan.name} — ${plan.amount} ${c.currency}`} readOnly /></label>
                  </div>
                  <label className="receipt-upload">
                    <Upload size={23} />
                    <strong>{receiptName || c.upload}</strong>
                    <span>{c.formats}</span>
                    <input type="file" required accept="image/png,image/jpeg,application/pdf" onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (file && file.size > 5 * 1024 * 1024) {
                        setError(c.formats);
                        event.target.value = "";
                        setReceiptFile(null);
                        setReceiptName("");
                        return;
                      }
                      setError("");
                      setReceiptFile(file);
                      setReceiptName(file?.name ?? "");
                    }} />
                  </label>
                  {error && <div className="auth-message">{error}</div>}
                  <button className="button button-primary button-large" type="submit" disabled={busy}>{busy ? "…" : c.submit}</button>
                </form>
              </>
            )}
          </section>
          <aside className="application-aside">
            <CreditCard size={26} />
            <h2>{c.safe}</h2>
            <ol>{c.steps.map((step, index) => <li key={step}><span>{index + 1}</span> {step}</li>)}</ol>
            <div className="payment-note"><Clock3 size={18} /><div><strong>{c.hours}</strong><span>{c.hoursText}</span></div></div>
            <div className="payment-note"><LockKeyhole size={18} /><div><strong>{c.noPassword}</strong><span>{c.noPasswordText}</span></div></div>
            <div className="payment-code-policy">
              <ShieldCheck size={18} />
              <div>
                <strong>{language === "ru" ? "Без кода активации" : language === "tj" ? "Бе рамзи фаъолсозӣ" : "No activation code"}</strong>
                <span>{language === "ru" ? "После проверки чека администратор активирует тариф автоматически." : language === "tj" ? "Пас аз санҷиши расид администратор тарофаро худкор фаъол мекунад." : "After verifying the receipt, the administrator activates the plan automatically."}</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

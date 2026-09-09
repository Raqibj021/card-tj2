import { CheckCircle2, Clock3, Copy, CreditCard, FileCheck2, LockKeyhole, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import Footer from "../components/layout/Footer";
import { paymentRepository, type PaymentRequest } from "../lib/paymentRepository";
import { useApp } from "../context/AppContext";

export default function PaymentPage() {
  const { language } = useApp();
  const c = {
    ru: { planNames: ["Личная визитка", "Проверенный специалист", "Специалист PRO", "Организация Start", "Организация Business", "Организация Pro"], accepted: "Заявка принята", acceptedText: "Чек и визитка получены. Администратор проверит их вместе — повторно отправлять визитку не нужно.", activated: "Визитка опубликована", activatedText: "Оплата подтверждена, тариф активен, а визитка одобрена и опубликована.", waiting: "Статус: чек и визитка проверяются", activeStatus: "Статус: тариф активен", manual: "Единая проверка", title: "Оплата и публикация визитки", intro: "Переведите точную сумму и загрузите чек. После одной проверки тариф активируется, а визитка будет опубликована.", copied: "Скопировано", copy: "Копировать", amount: "Сумма к оплате", currency: "сомони", order: "Номер заявки", customer: "ФИО заказчика *", phone: "Телефон *", payer: "Имя отправителя платежа *", selected: "Выбранный тариф", upload: "Загрузить чек оплаты", formats: "JPG, PNG или PDF до 5 МБ", submit: "Отправить чек и визитку", safe: "Как это работает", steps: ["Проверьте готовую визитку", "Переведите точную сумму", "Загрузите чек", "Получите одно решение по заявке"], hours: "До 3 часов", hoursText: "Проверка чека и визитки вместе", noPassword: "Не отправляйте пароль", noPasswordText: "Менеджер никогда его не запрашивает" },
    tj: { planNames: ["Варақаи шахсӣ", "Мутахассиси тасдиқшуда", "Мутахассиси PRO", "Ташкилоти Start", "Ташкилоти Business", "Ташкилоти Pro"], accepted: "Дархост қабул шуд", acceptedText: "Расид ва варақа қабул шуданд. Администратор онҳоро якҷоя месанҷад — дубора фиристодани варақа лозим нест.", activated: "Варақа нашр шуд", activatedText: "Пардохт тасдиқ, тарофа фаъол ва варақа тасдиқ ва нашр шуд.", waiting: "Ҳолат: расид ва варақа санҷида мешаванд", activeStatus: "Ҳолат: тарофа фаъол аст", manual: "Санҷиши ягона", title: "Пардохт ва нашри варақа", intro: "Маблағи дақиқро гузаронед ва расидро бор кунед. Пас аз як санҷиш тарофа фаъол ва варақа нашр мешавад.", copied: "Нусхабардорӣ шуд", copy: "Нусхабардорӣ", amount: "Маблағи пардохт", currency: "сомонӣ", order: "Рақами дархост", customer: "Ному насаби фармоишгар *", phone: "Телефон *", payer: "Номи фиристандаи пардохт *", selected: "Тарофаи интихобшуда", upload: "Бор кардани расиди пардохт", formats: "JPG, PNG ё PDF то 5 МБ", submit: "Расид ва варақаро фиристед", safe: "Тарзи кор", steps: ["Варақаи тайёрро санҷед", "Маблағи дақиқро гузаронед", "Расидро бор кунед", "Як қарорро оид ба дархост гиред"], hours: "То 3 соат", hoursText: "Санҷиши якҷояи расид ва варақа", noPassword: "Рамзро нафиристед", noPasswordText: "Менеҷер ҳеҷ гоҳ онро талаб намекунад" },
    en: { planNames: ["Personal card", "Verified specialist", "Specialist PRO", "Organization Start", "Organization Business", "Organization Pro"], accepted: "Application received", acceptedText: "Your receipt and card were received. An administrator will review them together—there is no need to submit the card again.", activated: "Card published", activatedText: "The payment is confirmed, the plan is active, and the card is approved and published.", waiting: "Status: receipt and card under review", activeStatus: "Status: plan active", manual: "Single review", title: "Payment and card publication", intro: "Transfer the exact amount and upload the receipt. One review will activate the plan and publish the card.", copied: "Copied", copy: "Copy", amount: "Amount due", currency: "somoni", order: "Application number", customer: "Customer full name *", phone: "Phone *", payer: "Payment sender’s name *", selected: "Selected plan", upload: "Upload payment receipt", formats: "JPG, PNG or PDF up to 5 MB", submit: "Submit receipt and card", safe: "How it works", steps: ["Check your completed card", "Transfer the exact amount", "Upload the receipt", "Receive one application decision"], hours: "Within 3 hours", hoursText: "Receipt and card reviewed together", noPassword: "Never send your password", noPasswordText: "A manager will never ask for it" }
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
  const requestedPlan = params.get("plan");
  const planKey: keyof typeof plans =
    requestedPlan && requestedPlan in plans ? requestedPlan as keyof typeof plans : "personal";
  const organizationId = params.get("organization") ?? undefined;
  const plan = plans[planKey] ?? plans.personal;
  const [created, setCreated] = useState<PaymentRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [receiptName, setReceiptName] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setCheckingExisting(true);
    setError("");
    paymentRepository.findCurrent(planKey, organizationId)
      .then((existing) => {
        if (active) setCreated(existing);
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Не удалось проверить статус оплаты.");
      })
      .finally(() => {
        if (active) setCheckingExisting(false);
      });
    return () => { active = false; };
  }, [planKey, organizationId]);

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
        planCode: planKey,
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
            {checkingExisting ? (
              <div className="route-loading"><span /><p>...</p></div>
            ) : created ? (
              <div className="payment-success">
                <CheckCircle2 size={54} />
                <span className="section-label">{created.status === "active" ? c.activated : c.accepted}</span>
                <h1>{created.orderNumber}</h1>
                {created.status !== "active" && (
                  <strong className="payment-reference-note">
                    {language === "ru" ? "Это номер заявки, не код активации." : language === "tj" ? "Ин рақами дархост аст, на рамзи фаъолсозӣ." : "This is the application number, not an activation code."}
                  </strong>
                )}
                <p>{created.status === "active" ? c.activatedText : c.acceptedText}</p>
                <div>{created.status === "active" ? <ShieldCheck size={18} /> : <Clock3 size={18} />} {created.status === "active" ? c.activeStatus : c.waiting}</div>
              </div>
            ) : (
              <>
                <span className="section-label">{c.manual}</span>
                <h1>{c.title}</h1>
                <p className="form-intro">{c.intro}</p>
                <div className="payment-details">
                  <div><CreditCard size={21} /><span><small>DC Bank / Alif Bank</small><strong>084785555</strong></span><button type="button" onClick={async () => { await navigator.clipboard.writeText("084785555"); setCopied(true); }}><Copy size={17} /> {copied ? c.copied : c.copy}</button></div>
                  <div><FileCheck2 size={21} /><span><small>{c.amount}</small><strong>{plan.amount} {c.currency}</strong></span></div>
                  <div><LockKeyhole size={21} /><span><small>{c.order}</small><strong>{language === "ru" ? "После отправки" : language === "tj" ? "Пас аз фиристодан" : "Assigned after submission"}</strong></span></div>
                </div>
                <form className="platform-form mt-7" onSubmit={submit}>
                  <div className="form-grid">
                    <label><span>{c.customer}</span><input name="customerName" required minLength={2} maxLength={100} pattern="[\p{L}\p{M} .'-]{2,100}" /></label>
                    <label><span>{c.phone}</span><input name="phone" type="tel" inputMode="tel" required placeholder="+992" pattern="\+?[0-9 ()-]{9,20}" /></label>
                    <label><span>{c.payer}</span><input name="payerName" required minLength={2} maxLength={100} pattern="[\p{L}\p{M} .'-]{2,100}" /></label>
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

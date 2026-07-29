import { CheckCircle2, Clock3, Copy, CreditCard, FileCheck2, LockKeyhole, Upload } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import Footer from "../components/layout/Footer";
import { paymentRepository, type PaymentRequest } from "../lib/paymentRepository";

const plans = {
  personal: { name: "Личная визитка", amount: 20 },
  specialist: { name: "Проверенный специалист", amount: 50 },
  pro: { name: "Специалист PRO", amount: 100 },
  start: { name: "Организация Start", amount: 200 },
  business: { name: "Организация Business", amount: 300 },
  organization_pro: { name: "Организация Pro", amount: 500 }
} as const;

export default function PaymentPage() {
  const [params] = useSearchParams();
  const planKey = params.get("plan") as keyof typeof plans;
  const plan = plans[planKey] ?? plans.personal;
  const [created, setCreated] = useState<PaymentRequest | null>(null);
  const [copied, setCopied] = useState(false);
  const [receiptName, setReceiptName] = useState("");
  const orderDraft = useMemo(() => `VZ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setCreated(paymentRepository.create({
      customerName: String(data.get("customerName")),
      phone: String(data.get("phone")),
      plan: plan.name,
      amount: plan.amount,
      payerName: String(data.get("payerName")),
      receiptName
    }));
  }

  return (
    <>
      <main className="payment-page">
        <div className="site-container grid gap-8 py-10 lg:grid-cols-[1fr_380px] lg:py-14">
          <section className="application-panel">
            {created ? (
              <div className="payment-success">
                <CheckCircle2 size={54} />
                <span className="section-label">Заявка принята</span>
                <h1>{created.orderNumber}</h1>
                <p>Проверка оплаты выполняется до трёх часов. После подтверждения код активации появится в кабинете и будет отправлен автоматически.</p>
                <div><Clock3 size={18} /> Статус: ожидается проверка оплаты</div>
              </div>
            ) : (
              <>
                <span className="section-label">Ручная оплата</span>
                <h1>Подтверждение платежа</h1>
                <p className="form-intro">Переведите точную сумму по реквизитам и загрузите подтверждение. Черновик заказа сохраняется на 7 дней.</p>
                <div className="payment-details">
                  <div><CreditCard size={21} /><span><small>ДС Банк / Alif Bank</small><strong>929213537</strong></span><button type="button" onClick={async () => { await navigator.clipboard.writeText("929213537"); setCopied(true); }}><Copy size={17} /> {copied ? "Скопировано" : "Копировать"}</button></div>
                  <div><FileCheck2 size={21} /><span><small>Сумма к оплате</small><strong>{plan.amount} сомони</strong></span></div>
                  <div><LockKeyhole size={21} /><span><small>Номер заказа</small><strong>{orderDraft}</strong></span></div>
                </div>
                <form className="platform-form mt-7" onSubmit={submit}>
                  <div className="form-grid">
                    <label><span>ФИО заказчика *</span><input name="customerName" required /></label>
                    <label><span>Телефон *</span><input name="phone" type="tel" required placeholder="+992" /></label>
                    <label><span>Имя отправителя платежа *</span><input name="payerName" required /></label>
                    <label><span>Выбранный тариф</span><input value={`${plan.name} — ${plan.amount} сомони`} readOnly /></label>
                  </div>
                  <label className="receipt-upload">
                    <Upload size={23} />
                    <strong>{receiptName || "Загрузить чек оплаты"}</strong>
                    <span>JPG, PNG или PDF до 5 МБ</span>
                    <input type="file" required accept="image/png,image/jpeg,application/pdf" onChange={(event) => setReceiptName(event.target.files?.[0]?.name ?? "")} />
                  </label>
                  <button className="button button-primary button-large" type="submit">Отправить на проверку</button>
                </form>
              </>
            )}
          </section>
          <aside className="application-aside">
            <CreditCard size={26} />
            <h2>Безопасный порядок</h2>
            <ol><li><span>1</span> Выберите тариф</li><li><span>2</span> Переведите точную сумму</li><li><span>3</span> Загрузите чек</li><li><span>4</span> Получите одноразовый код</li></ol>
            <div className="payment-note"><Clock3 size={18} /><div><strong>До 3 часов</strong><span>Максимальный срок ручной проверки</span></div></div>
            <div className="payment-note"><LockKeyhole size={18} /><div><strong>Не отправляйте пароль</strong><span>Менеджер никогда его не запрашивает</span></div></div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

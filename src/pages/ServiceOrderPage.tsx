import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import Footer from "../components/layout/Footer";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { createServiceOrder, type OrderItem } from "../lib/commerceRepository";

const catalog = [
  { id: "turnkey", category: "digital", price: 0, title: ["Визитки организации под ключ", "Варақаҳои ташкилот бо омодасозии пурра", "Turnkey organization cards"] },
  { id: "digital", category: "design", price: 80, title: ["Дизайн электронной визитки", "Дизайни варақаи электронӣ", "Digital card design"] },
  { id: "print-design", category: "design", price: 100, title: ["Дизайн печатной визитки", "Дизайни варақаи чопӣ", "Print card design"] },
  { id: "print-one", category: "print", price: 0.8, title: ["Односторонняя печать", "Чопи яктарафа", "Single-sided printing"] },
  { id: "print-two", category: "print", price: 1.2, title: ["Двусторонняя печать", "Чопи дутарафа", "Double-sided printing"] },
  { id: "lamination", category: "materials", price: 0.6, title: ["Ламинация", "Ламинатсия", "Lamination"] },
  { id: "plastic", category: "materials", price: 8, title: ["Пластиковая визитка", "Варақаи пластикӣ", "Plastic card"] },
  { id: "nfc", category: "materials", price: 45, title: ["NFC-карта", "Корти NFC", "NFC card"] },
  { id: "badge", category: "materials", price: 12, title: ["Бейдж или пропуск с QR", "Бейҷ ё иҷозатнома бо QR", "QR badge or pass"] },
  { id: "desk", category: "materials", price: 35, title: ["QR-табличка на стол", "QR-лавҳаи рӯимизӣ", "QR desk sign"] },
  { id: "door", category: "materials", price: 45, title: ["QR-табличка на дверь", "QR-лавҳаи дар", "QR door sign"] },
  { id: "sticker", category: "materials", price: 2, title: ["Наклейка с QR-кодом", "Часпак бо QR-код", "QR sticker"] },
  { id: "delivery", category: "extras", price: 25, title: ["Доставка", "Расонидан", "Delivery"] },
  { id: "urgent", category: "extras", price: 50, title: ["Срочное изготовление", "Омодасозии фаврӣ", "Urgent production"] }
] as const;

export default function ServiceOrderPage() {
  const { language } = useApp();
  const { user, profile } = useAuth();
  const lang = language === "ru" ? 0 : language === "tj" ? 1 : 2;
  const text = [
    { label: "Заказ услуг", title: "Соберите заказ", note: "Стоимость предварительная. Менеджер проверит параметры и согласует итог до оплаты.", quantity: "Количество", customer: "Контактные данные", submit: "Отправить заказ", total: "Предварительный итог", success: "Заказ принят", byAgreement: "По договору" },
    { label: "Фармоиши хизмат", title: "Фармоишро ҷамъ кунед", note: "Арзиш пешакӣ аст. Менеҷер параметрҳоро месанҷад ва маблағи ниҳоиро тасдиқ мекунад.", quantity: "Миқдор", customer: "Маълумоти тамос", submit: "Фиристодани фармоиш", total: "Ҷамъбасти пешакӣ", success: "Фармоиш қабул шуд", byAgreement: "Бо шартнома" },
    { label: "Service order", title: "Build your order", note: "Pricing is preliminary. A manager will verify specifications and confirm the final total before payment.", quantity: "Quantity", customer: "Contact details", submit: "Submit order", total: "Estimated total", success: "Order received", byAgreement: "By agreement" }
  ][lang];
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState({ fullName: profile?.fullName ?? "", phone: profile?.phone ?? "", email: profile?.email ?? "" });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const items = useMemo<OrderItem[]>(() => catalog.flatMap((service) => {
    const quantity = selected[service.id] ?? 0;
    return quantity ? [{ id: service.id, title: service.title[lang], category: service.category, quantity, unitPrice: service.price }] : [];
  }), [selected, lang]);
  const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  const submit = async () => {
    if (!user || !items.length || !customer.fullName || !customer.phone) return;
    setBusy(true);
    try {
      const order = await createServiceOrder(user.id, customer, items);
      setResult(`${text.success}: ${order.order_number}`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <main className="commerce-page">
        <section className="site-container commerce-shell">
          <div className="commerce-heading">
            <span className="section-label"><ShoppingBag size={15} /> {text.label}</span>
            <h1>{text.title}</h1><p>{text.note}</p>
          </div>
          <div className="order-layout">
            <div className="order-catalog">
              {catalog.map((service) => {
                const quantity = selected[service.id] ?? 0;
                return <article className={`order-item ${quantity ? "selected" : ""}`} key={service.id}>
                  <button type="button" className="order-toggle" onClick={() => setSelected((value) => ({ ...value, [service.id]: quantity ? 0 : 1 }))}>
                    <span>{quantity ? <Check size={16} /> : null}</span>
                    <strong>{service.title[lang]}</strong>
                    <b>{service.price ? `${service.price} c.` : text.byAgreement}</b>
                  </button>
                  {quantity > 0 && service.id !== "turnkey" && <div className="quantity-control" aria-label={text.quantity}>
                    <button type="button" onClick={() => setSelected((value) => ({ ...value, [service.id]: Math.max(0, quantity - 1) }))}><Minus size={14} /></button>
                    <span>{quantity}</span>
                    <button type="button" onClick={() => setSelected((value) => ({ ...value, [service.id]: quantity + 1 }))}><Plus size={14} /></button>
                  </div>}
                </article>;
              })}
            </div>
            <aside className="order-summary">
              <h2>{text.customer}</h2>
              <input value={customer.fullName} onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })} placeholder="ФИО / Full name" />
              <input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="+992" inputMode="tel" />
              <input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="email@example.com" type="email" />
              <div className="summary-lines">{items.map((item) => <div key={item.id}><span>{item.title} × {item.quantity}</span><b>{item.unitPrice ? `${item.unitPrice * item.quantity} c.` : text.byAgreement}</b></div>)}</div>
              <div className="summary-total"><span>{text.total}</span><strong>{total} c.</strong></div>
              <button type="button" className="button button-primary w-full" disabled={busy || !items.length} onClick={submit}>{busy ? "…" : text.submit}</button>
              {result && <p className="form-notice">{result}</p>}
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

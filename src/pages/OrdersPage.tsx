import { FileSignature, PackageCheck, Plus, RefreshCw, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";
import {
  listContracts,
  listServiceOrders,
  type ContractRecord,
  type ServiceOrderRecord
} from "../lib/commerceRepository";

const statusLabels = {
  ru: { new: "Новый", clarifying: "Уточнение", approved: "Подтверждён", in_progress: "В работе", ready: "Готов", completed: "Завершён", cancelled: "Отменён", unpaid: "Не оплачен", pending: "Проверка оплаты", paid: "Оплачен", refunded: "Возврат", draft: "Черновик", submitted: "Отправлен", signed: "Подписан" },
  tj: { new: "Нав", clarifying: "Муайянкунӣ", approved: "Тасдиқ шуд", in_progress: "Дар кор", ready: "Омода", completed: "Анҷом ёфт", cancelled: "Бекор шуд", unpaid: "Пардохт нашудааст", pending: "Санҷиши пардохт", paid: "Пардохт шудааст", refunded: "Баргардонида шуд", draft: "Лоиҳа", submitted: "Фиристода шуд", signed: "Имзо шуд" },
  en: { new: "New", clarifying: "Clarification", approved: "Approved", in_progress: "In progress", ready: "Ready", completed: "Completed", cancelled: "Cancelled", unpaid: "Unpaid", pending: "Payment review", paid: "Paid", refunded: "Refunded", draft: "Draft", submitted: "Submitted", signed: "Signed" }
};

export default function OrdersPage() {
  const { language } = useApp();
  const labels = statusLabels[language] as Record<string, string>;
  const copy = {
    ru: { eyebrow: "Личный кабинет", title: "Мои заказы и договоры", text: "Следите за изготовлением, оплатой и документами в одном месте.", orders: "Заказы", contracts: "Договоры", create: "Новый заказ", contract: "Создать договор", empty: "Здесь пока ничего нет", comment: "Комментарий менеджера", items: "позиций" },
    tj: { eyebrow: "Утоқи шахсӣ", title: "Фармоишҳо ва шартномаҳои ман", text: "Омодасозӣ, пардохт ва ҳуҷҷатҳоро дар як ҷо пайгирӣ кунед.", orders: "Фармоишҳо", contracts: "Шартномаҳо", create: "Фармоиши нав", contract: "Сохтани шартнома", empty: "Ҳоло маълумот нест", comment: "Шарҳи менеҷер", items: "мавқеъ" },
    en: { eyebrow: "Dashboard", title: "My orders and contracts", text: "Track production, payment and documents in one place.", orders: "Orders", contracts: "Contracts", create: "New order", contract: "Create contract", empty: "Nothing here yet", comment: "Manager comment", items: "items" }
  }[language];
  const [tab, setTab] = useState<"orders" | "contracts">("orders");
  const [orders, setOrders] = useState<ServiceOrderRecord[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const [nextOrders, nextContracts] = await Promise.all([listServiceOrders(), listContracts()]);
      setOrders(nextOrders); setContracts(nextContracts);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Ошибка загрузки");
    } finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  return <main className="dashboard-page"><section className="site-container py-10 md:py-14">
    <div className="platform-section-head">
      <div><span className="section-label">{copy.eyebrow}</span><h1 className="page-title">{copy.title}</h1><p className="page-copy">{copy.text}</p></div>
      <div className="commerce-head-actions"><button className="button button-secondary" onClick={() => void refresh()}><RefreshCw size={16} /></button><Link className="button button-secondary" to="/contract"><FileSignature size={16} /> {copy.contract}</Link><Link className="button button-primary" to="/service-order"><Plus size={16} /> {copy.create}</Link></div>
    </div>
    <div className="commerce-tabs"><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><ShoppingBag size={17} /> {copy.orders}<b>{orders.length}</b></button><button className={tab === "contracts" ? "active" : ""} onClick={() => setTab("contracts")}><FileSignature size={17} /> {copy.contracts}<b>{contracts.length}</b></button></div>
    {error && <div className="auth-message">{error}</div>}
    {loading ? <div className="commerce-loading"><RefreshCw className="animate-spin" /> Загрузка…</div> : tab === "orders" ? <div className="commerce-records">
      {orders.map((order) => <article className="commerce-record" key={order.id}>
        <div className="commerce-record-icon"><PackageCheck size={21} /></div>
        <div className="commerce-record-main"><div><strong>{order.order_number}</strong><time>{new Date(order.created_at).toLocaleDateString(language)}</time></div><p>{order.items.slice(0, 3).map((item) => item.title).join(" · ")}</p><small>{order.items.length} {copy.items}</small>{order.manager_comment && <blockquote><b>{copy.comment}:</b> {order.manager_comment}</blockquote>}</div>
        <div className="commerce-record-state"><span className={`record-status status-${order.status}`}>{labels[order.status]}</span><span className={`record-payment payment-${order.payment_status}`}>{labels[order.payment_status]}</span><strong>{Number(order.total).toLocaleString(language)} c.</strong></div>
      </article>)}
      {!orders.length && <div className="empty-state"><ShoppingBag size={28} /><h2>{copy.empty}</h2><Link className="button button-primary mt-5" to="/service-order">{copy.create}</Link></div>}
    </div> : <div className="commerce-records">
      {contracts.map((contract) => <article className="commerce-record" key={contract.id}><div className="commerce-record-icon"><FileSignature size={21} /></div><div className="commerce-record-main"><div><strong>{contract.contract_number}</strong><time>{new Date(contract.created_at).toLocaleDateString(language)}</time></div><p>{contract.services.join(" · ")}</p><small>{contract.customer.fullName}</small></div><div className="commerce-record-state"><span className={`record-status status-${contract.status}`}>{labels[contract.status]}</span><strong>{Number(contract.total).toLocaleString(language)} c.</strong></div></article>)}
      {!contracts.length && <div className="empty-state"><FileSignature size={28} /><h2>{copy.empty}</h2><Link className="button button-primary mt-5" to="/contract">{copy.contract}</Link></div>}
    </div>}
  </section></main>;
}

import { Banknote, FileSignature, PackageCheck, RefreshCw, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import {
  getCommerceStats,
  listContracts,
  listServiceOrders,
  updateContractStatus,
  updateServiceOrder,
  type ContractRecord,
  type ContractStatus,
  type OrderStatus,
  type PaymentStatus,
  type ServiceOrderRecord
} from "../lib/commerceRepository";

const orderStatuses: OrderStatus[] = ["new", "clarifying", "approved", "in_progress", "ready", "completed", "cancelled"];
const paymentStatuses: PaymentStatus[] = ["unpaid", "pending", "paid", "refunded"];
const contractStatuses: ContractStatus[] = ["draft", "submitted", "approved", "signed", "cancelled"];
const labels: Record<string, string> = { new: "Новый", clarifying: "Уточнение", approved: "Подтверждён", in_progress: "В работе", ready: "Готов", completed: "Завершён", cancelled: "Отменён", unpaid: "Не оплачен", pending: "Проверяется", paid: "Оплачен", refunded: "Возврат", draft: "Черновик", submitted: "Отправлен", signed: "Подписан" };

export default function AdminCommercePage() {
  const [tab, setTab] = useState<"orders" | "contracts">("orders");
  const [orders, setOrders] = useState<ServiceOrderRecord[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [stats, setStats] = useState({ orders: 0, newOrders: 0, unpaid: 0, revenue: 0, contracts: 0 });
  const [notice, setNotice] = useState("");
  const refresh = async () => {
    try {
      const [nextOrders, nextContracts, nextStats] = await Promise.all([listServiceOrders(), listContracts(), getCommerceStats()]);
      setOrders(nextOrders); setContracts(nextContracts); setStats(nextStats);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Ошибка загрузки"); }
  };
  useEffect(() => { void refresh(); }, []);
  const updateOrder = async (order: ServiceOrderRecord, values: Parameters<typeof updateServiceOrder>[1]) => {
    try { await updateServiceOrder(order.id, values); setNotice(`Заказ ${order.order_number} обновлён`); await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "Ошибка"); }
  };
  return <AdminShell title="Заказы и договоры" description="Производство визиток, QR-табличек, NFC-карт и документы заказчиков." actions={<button className="admin-toolbar-button" onClick={() => void refresh()}><RefreshCw size={16} /> Обновить</button>}><section className="admin-subpage">
    <div className="admin-stats commerce-admin-stats">
      <article><div className="admin-stat-icon"><ShoppingBag size={20} /></div><p>Всего заказов</p><strong>{stats.orders}</strong></article>
      <article><div className="admin-stat-icon"><PackageCheck size={20} /></div><p>Новые</p><strong>{stats.newOrders}</strong></article>
      <article><div className="admin-stat-icon"><Banknote size={20} /></div><p>Ожидают оплату</p><strong>{stats.unpaid}</strong></article>
      <article><div className="admin-stat-icon"><Banknote size={20} /></div><p>Оплачено</p><strong>{Number(stats.revenue).toLocaleString()} c.</strong></article>
      <article><div className="admin-stat-icon"><FileSignature size={20} /></div><p>Договоры</p><strong>{stats.contracts}</strong></article>
    </div>
    {notice && <div className="activation-result">{notice}</div>}
    <div className="commerce-tabs"><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><ShoppingBag size={17} /> Заказы <b>{orders.length}</b></button><button className={tab === "contracts" ? "active" : ""} onClick={() => setTab("contracts")}><FileSignature size={17} /> Договоры <b>{contracts.length}</b></button></div>
    {tab === "orders" ? <div className="admin-order-list">{orders.map((order) => <article key={order.id}>
      <header><div><strong>{order.order_number}</strong><small>{order.customer.fullName} · {order.customer.phone}</small></div><b>{Number(order.total).toLocaleString()} c.</b></header>
      <p>{order.items.map((item) => `${item.title} × ${item.quantity}`).join(" · ")}</p>
      <div className="admin-order-controls"><label>Статус<select value={order.status} onChange={(e) => void updateOrder(order, { status: e.target.value as OrderStatus })}>{orderStatuses.map((status) => <option value={status} key={status}>{labels[status]}</option>)}</select></label><label>Оплата<select value={order.payment_status} onChange={(e) => void updateOrder(order, { payment_status: e.target.value as PaymentStatus })}>{paymentStatuses.map((status) => <option value={status} key={status}>{labels[status]}</option>)}</select></label><label className="manager-comment">Комментарий<input defaultValue={order.manager_comment} onBlur={(e) => { if (e.target.value !== order.manager_comment) void updateOrder(order, { manager_comment: e.target.value }); }} placeholder="Комментарий для клиента" /></label></div>
    </article>)}{!orders.length && <div className="table-empty">Заказов пока нет.</div>}</div> :
    <div className="admin-order-list">{contracts.map((contract) => <article key={contract.id}><header><div><strong>{contract.contract_number}</strong><small>{contract.customer.fullName} · {contract.customer.phone}</small></div><b>{Number(contract.total).toLocaleString()} c.</b></header><p>{contract.services.join(" · ")}</p><div className="admin-order-controls"><label>Статус договора<select value={contract.status} onChange={async (e) => { try { await updateContractStatus(contract.id, e.target.value as ContractStatus); setNotice(`Договор ${contract.contract_number} обновлён`); await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "Ошибка"); } }}>{contractStatuses.map((status) => <option value={status} key={status}>{labels[status]}</option>)}</select></label></div></article>)}{!contracts.length && <div className="table-empty">Договоров пока нет.</div>}</div>}
  </section></AdminShell>;
}

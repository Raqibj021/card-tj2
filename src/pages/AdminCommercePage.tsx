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
import { getNfcCardDesign } from "../lib/nfcCardCatalog";

const orderStatuses: OrderStatus[] = ["new", "clarifying", "approved", "in_progress", "ready", "completed", "cancelled"];
const paymentStatuses: PaymentStatus[] = ["unpaid", "pending", "paid", "refunded"];
const contractStatuses: ContractStatus[] = ["draft", "submitted", "approved", "signed", "cancelled"];
const labels: Record<string, string> = {
  new: "Новый", clarifying: "Уточнение", approved: "Подтверждён", in_progress: "В работе", ready: "Готов",
  completed: "Завершён", cancelled: "Отменён", unpaid: "Не оплачен", pending: "Проверяется", paid: "Оплачен",
  refunded: "Возврат", draft: "Черновик", submitted: "Отправлен", signed: "Подписан"
};

export default function AdminCommercePage() {
  const [tab, setTab] = useState<"orders" | "contracts">("orders");
  const [orders, setOrders] = useState<ServiceOrderRecord[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [stats, setStats] = useState({ orders: 0, newOrders: 0, unpaid: 0, revenue: 0, contracts: 0 });
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const [nextOrders, nextContracts, nextStats] = await Promise.all([listServiceOrders(), listContracts(), getCommerceStats()]);
      setOrders(nextOrders); setContracts(nextContracts); setStats(nextStats);
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Ошибка загрузки", error: true });
    }
  };
  useEffect(() => { void refresh(); }, []);

  // Runs one change, reports the result, and reloads the list so the screen always shows what is saved.
  const run = async (confirmText: string | undefined, success: string, action: () => Promise<void>) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      await action();
      setNotice({ text: success });
      await refresh();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Не удалось сохранить", error: true });
    } finally {
      setBusy(false);
    }
  };

  const setOrderStatus = (order: ServiceOrderRecord, status: OrderStatus) =>
    run(status === "cancelled" ? `Отменить заказ ${order.order_number}? Клиент увидит статус «Отменён».` : undefined,
      `Заказ ${order.order_number}: «${labels[status]}»`,
      () => updateServiceOrder(order.id, { status }));

  const setOrderPayment = (order: ServiceOrderRecord, payment_status: PaymentStatus) =>
    run(undefined, `Оплата заказа ${order.order_number}: «${labels[payment_status]}»`,
      () => updateServiceOrder(order.id, { payment_status }));

  const saveComment = (order: ServiceOrderRecord, manager_comment: string) =>
    run(undefined, `Комментарий к заказу ${order.order_number} сохранён`,
      () => updateServiceOrder(order.id, { manager_comment }));

  const setContractStatus = (contract: ContractRecord, status: ContractStatus) =>
    run(status === "cancelled" ? `Отменить договор ${contract.contract_number}?` : undefined,
      `Договор ${contract.contract_number}: «${labels[status]}»`,
      () => updateContractStatus(contract.id, status));

  return (
    <AdminShell
      title="Заказы и договоры"
      description="Производство визиток, QR-табличек, NFC-карт и документы заказчиков."
      actions={<button className="admin-toolbar-button" disabled={busy} onClick={() => void refresh()}><RefreshCw size={16} /> Обновить</button>}
    >
      <section className="admin-subpage">
        <div className="admin-stats commerce-admin-stats">
          <article><div className="admin-stat-icon"><ShoppingBag size={20} /></div><p>Всего заказов</p><strong>{stats.orders}</strong></article>
          <article><div className="admin-stat-icon"><PackageCheck size={20} /></div><p>Новые</p><strong>{stats.newOrders}</strong></article>
          <article><div className="admin-stat-icon"><Banknote size={20} /></div><p>Ожидают оплату</p><strong>{stats.unpaid}</strong></article>
          <article><div className="admin-stat-icon"><Banknote size={20} /></div><p>Оплачено</p><strong>{Number(stats.revenue).toLocaleString()} c.</strong></article>
          <article><div className="admin-stat-icon"><FileSignature size={20} /></div><p>Договоры</p><strong>{stats.contracts}</strong></article>
        </div>

        {notice && <div className={notice.error ? "admin-notice-error" : "activation-result"}>{notice.text}</div>}

        <div className="commerce-tabs">
          <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><ShoppingBag size={17} /> Заказы <b>{orders.length}</b></button>
          <button className={tab === "contracts" ? "active" : ""} onClick={() => setTab("contracts")}><FileSignature size={17} /> Договоры <b>{contracts.length}</b></button>
        </div>

        {tab === "orders" ? (
          <div className="admin-order-list">
            {orders.map((order) => (
              <article key={order.id}>
                <header>
                  <div><strong>{order.order_number}</strong><small>{order.customer.fullName} · {order.customer.phone}</small></div>
                  <b>{Number(order.total).toLocaleString()} c.</b>
                </header>
                <div className="admin-order-items">
                  {order.items.map((item) => {
                    const design = getNfcCardDesign(item.imageKey);
                    return (
                      <div key={`${item.id}-${item.imageKey ?? "plain"}`}>
                        {design && <img src={`${import.meta.env.BASE_URL}${design.image.slice(1)}`} alt={item.title} />}
                        <span>{item.title} × {item.quantity}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="admin-action-group">
                  <small>Статус заказа</small>
                  <div className="admin-action-row">
                    {orderStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={busy || order.status === status}
                        className={`admin-action${order.status === status ? " is-current" : ""}${status === "cancelled" ? " is-danger" : ""}`}
                        onClick={() => void setOrderStatus(order, status)}
                      >
                        {labels[status]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="admin-action-group">
                  <small>Оплата</small>
                  <div className="admin-action-row">
                    {paymentStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={busy || order.payment_status === status}
                        className={`admin-action${order.payment_status === status ? " is-current" : ""}`}
                        onClick={() => void setOrderPayment(order, status)}
                      >
                        {labels[status]}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="admin-comment-field">
                  <small>Комментарий для клиента</small>
                  <input
                    key={`${order.id}-${order.manager_comment}`}
                    defaultValue={order.manager_comment}
                    placeholder="Например: макет готов, ждём подтверждения"
                    onBlur={(event) => {
                      if (event.target.value !== order.manager_comment) void saveComment(order, event.target.value);
                    }}
                  />
                </label>
              </article>
            ))}
            {!orders.length && <div className="table-empty">Заказов пока нет.</div>}
          </div>
        ) : (
          <div className="admin-order-list">
            {contracts.map((contract) => (
              <article key={contract.id}>
                <header>
                  <div><strong>{contract.contract_number}</strong><small>{contract.customer.fullName} · {contract.customer.phone}</small></div>
                  <b>{Number(contract.total).toLocaleString()} c.</b>
                </header>
                <p>{contract.services.join(" · ")}</p>
                <div className="admin-action-group">
                  <small>Статус договора</small>
                  <div className="admin-action-row">
                    {contractStatuses.map((status) => (
                      <button
                        key={status}
                        type="button"
                        disabled={busy || contract.status === status}
                        className={`admin-action${contract.status === status ? " is-current" : ""}${status === "cancelled" ? " is-danger" : ""}`}
                        onClick={() => void setContractStatus(contract, status)}
                      >
                        {labels[status]}
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
            {!contracts.length && <div className="table-empty">Договоров пока нет.</div>}
          </div>
        )}
      </section>
    </AdminShell>
  );
}

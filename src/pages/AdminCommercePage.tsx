import { Archive, ArchiveRestore, Banknote, ChevronDown, FileSignature, PackageCheck, RefreshCw, ShoppingBag } from "lucide-react";
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
import { signalAdminCountsChanged } from "../lib/adminNotificationRepository";
import { adminSupabase } from "../lib/supabase";
import { getNfcCardDesign } from "../lib/nfcCardCatalog";

const orderStatuses: OrderStatus[] = ["new", "clarifying", "approved", "in_progress", "ready", "completed", "cancelled"];
const paymentStatuses: PaymentStatus[] = ["unpaid", "pending", "paid", "refunded"];
const contractStatuses: ContractStatus[] = ["draft", "submitted", "approved", "signed", "cancelled"];
const labels: Record<string, string> = {
  new: "Новый", clarifying: "Уточнение", approved: "Подтверждён", in_progress: "В работе", ready: "Готов",
  completed: "Завершён", cancelled: "Отменён", unpaid: "Не оплачен", pending: "Проверяется", paid: "Оплачен",
  refunded: "Возврат", draft: "Черновик", submitted: "Отправлен", signed: "Подписан"
};

type Notice = { text: string; error?: boolean };

export default function AdminCommercePage() {
  const [tab, setTab] = useState<"orders" | "contracts">("orders");
  const [view, setView] = useState<"active" | "archive">("active");
  const [orders, setOrders] = useState<ServiceOrderRecord[]>([]);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [stats, setStats] = useState({ orders: 0, newOrders: 0, unpaid: 0, revenue: 0, contracts: 0 });
  const [openId, setOpenId] = useState<string | null>(null);
  // Cancelling takes two taps: the first arms the button, the second confirms. No system dialog is used.
  const [armed, setArmed] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try {
      const [nextOrders, nextContracts, nextStats] = await Promise.all([listServiceOrders(adminSupabase), listContracts(adminSupabase), getCommerceStats(adminSupabase)]);
      setOrders(nextOrders); setContracts(nextContracts); setStats(nextStats);
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Ошибка загрузки", error: true });
    }
  };
  useEffect(() => { void refresh(); }, []);

  // Runs one change, reports the result, and reloads so the screen always shows what is saved.
  const run = async (success: string, action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      signalAdminCountsChanged();
      setNotice({ text: success });
      await refresh();
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : "Не удалось сохранить", error: true });
    } finally {
      setBusy(false);
    }
  };

  const toggleOrder = async (order: ServiceOrderRecord) => {
    const opening = openId !== order.id;
    setOpenId(opening ? order.id : null);
    setArmed(null);
    if (opening && !order.admin_seen_at) {
      // Opening an order is what marks it as seen; the badge counts only unseen orders.
      try {
        await updateServiceOrder(order.id, { admin_seen_at: new Date().toISOString() }, adminSupabase);
        signalAdminCountsChanged();
        await refresh();
      } catch (error) {
        setNotice({ text: error instanceof Error ? error.message : "Не удалось отметить заказ", error: true });
      }
    }
  };

  const setOrderStatus = (order: ServiceOrderRecord, status: OrderStatus) => {
    setArmed(null);
    return run(`Заказ ${order.order_number}: «${labels[status]}»`, () => updateServiceOrder(order.id, { status }, adminSupabase));
  };

  const setOrderPayment = (order: ServiceOrderRecord, payment_status: PaymentStatus) =>
    run(`Оплата заказа ${order.order_number}: «${labels[payment_status]}»`, () => updateServiceOrder(order.id, { payment_status }, adminSupabase));

  const saveComment = (order: ServiceOrderRecord, manager_comment: string) =>
    run(`Комментарий к заказу ${order.order_number} сохранён`, () => updateServiceOrder(order.id, { manager_comment }, adminSupabase));

  const setArchived = (order: ServiceOrderRecord, archived: boolean) => {
    setOpenId(null);
    setArmed(null);
    return run(archived ? `Заказ ${order.order_number} перенесён в архив` : `Заказ ${order.order_number} возвращён в активные`,
      () => updateServiceOrder(order.id, { archived_at: archived ? new Date().toISOString() : null }, adminSupabase));
  };

  const setContractStatus = (contract: ContractRecord, status: ContractStatus) => {
    setArmed(null);
    return run(`Договор ${contract.contract_number}: «${labels[status]}»`, () => updateContractStatus(contract.id, status, adminSupabase));
  };

  const activeOrders = orders.filter((order) => !order.archived_at);
  const archivedOrders = orders.filter((order) => order.archived_at);
  const visibleOrders = view === "active" ? activeOrders : archivedOrders;

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
          <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}><ShoppingBag size={17} /> Заказы <b>{activeOrders.length}</b></button>
          <button className={tab === "contracts" ? "active" : ""} onClick={() => setTab("contracts")}><FileSignature size={17} /> Договоры <b>{contracts.length}</b></button>
        </div>

        {tab === "orders" ? (
          <>
            <div className="order-views">
              <button className={view === "active" ? "active" : ""} onClick={() => { setView("active"); setOpenId(null); }}>Активные <b>{activeOrders.length}</b></button>
              <button className={view === "archive" ? "active" : ""} onClick={() => { setView("archive"); setOpenId(null); }}><Archive size={15} /> Архив <b>{archivedOrders.length}</b></button>
            </div>

            <div className="order-folder">
              {visibleOrders.map((order) => {
                const isOpen = openId === order.id;
                const isNew = !order.admin_seen_at;
                const isCancelArmed = armed === `order:${order.id}`;
                return (
                  <article key={order.id} className={`order-card${isOpen ? " is-open" : ""}`}>
                    <button type="button" className="order-card-head" aria-expanded={isOpen} onClick={() => void toggleOrder(order)}>
                      <span className="order-card-title">
                        <strong>{isNew && <i className="order-dot" aria-label="Новый заказ" />}{order.order_number}</strong>
                        <small>{order.customer.fullName} · {order.customer.phone}</small>
                      </span>
                      <span className="order-card-side">
                        <b>{Number(order.total).toLocaleString()} c.</b>
                        <em className={`order-status s-${order.status}`}>{labels[order.status]}</em>
                        <ChevronDown size={18} className="order-chevron" />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="order-card-body">
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
                            {orderStatuses.filter((status) => status !== "cancelled").map((status) => (
                              <button key={status} type="button" disabled={busy || order.status === status}
                                className={`admin-action${order.status === status ? " is-current" : ""}`}
                                onClick={() => void setOrderStatus(order, status)}>{labels[status]}</button>
                            ))}
                          </div>
                        </div>

                        <div className="admin-action-group">
                          <small>Оплата</small>
                          <div className="admin-action-row">
                            {paymentStatuses.map((status) => (
                              <button key={status} type="button" disabled={busy || order.payment_status === status}
                                className={`admin-action${order.payment_status === status ? " is-current" : ""}`}
                                onClick={() => void setOrderPayment(order, status)}>{labels[status]}</button>
                            ))}
                          </div>
                        </div>

                        <label className="admin-comment-field">
                          <small>Комментарий клиенту</small>
                          <input
                            key={`${order.id}-${order.manager_comment}`}
                            defaultValue={order.manager_comment}
                            placeholder="Необязательно"
                            onBlur={(event) => {
                              if (event.target.value !== order.manager_comment) void saveComment(order, event.target.value);
                            }}
                          />
                        </label>

                        <div className="order-card-foot">
                          {view === "active" ? (
                            <button type="button" className="admin-secondary" disabled={busy} onClick={() => void setArchived(order, true)}>
                              <Archive size={15} /> В архив
                            </button>
                          ) : (
                            <button type="button" className="admin-secondary" disabled={busy} onClick={() => void setArchived(order, false)}>
                              <ArchiveRestore size={15} /> Вернуть из архива
                            </button>
                          )}

                          {order.status !== "cancelled" && (
                            isCancelArmed ? (
                              <span className="order-cancel-confirm">
                                <button type="button" className="admin-danger is-armed" disabled={busy} onClick={() => void setOrderStatus(order, "cancelled")}>Точно отменить</button>
                                <button type="button" className="admin-secondary" onClick={() => setArmed(null)}>Не отменять</button>
                              </span>
                            ) : (
                              <button type="button" className="admin-danger" disabled={busy} onClick={() => setArmed(`order:${order.id}`)}>Отменить заказ</button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
              {!visibleOrders.length && <div className="table-empty">{view === "active" ? "Активных заказов нет." : "Архив пуст."}</div>}
            </div>
          </>
        ) : (
          <div className="order-folder">
            {contracts.map((contract) => {
              const isCancelArmed = armed === `contract:${contract.id}`;
              return (
                <article key={contract.id} className="order-card is-open">
                  <div className="order-card-head is-static">
                    <span className="order-card-title">
                      <strong>{contract.contract_number}</strong>
                      <small>{contract.customer.fullName} · {contract.customer.phone}</small>
                    </span>
                    <span className="order-card-side">
                      <b>{Number(contract.total).toLocaleString()} c.</b>
                      <em className={`order-status s-${contract.status}`}>{labels[contract.status]}</em>
                    </span>
                  </div>
                  <div className="order-card-body">
                    <p className="order-contract-services">{contract.services.join(" · ")}</p>
                    <div className="admin-action-group">
                      <small>Статус договора</small>
                      <div className="admin-action-row">
                        {contractStatuses.filter((status) => status !== "cancelled").map((status) => (
                          <button key={status} type="button" disabled={busy || contract.status === status}
                            className={`admin-action${contract.status === status ? " is-current" : ""}`}
                            onClick={() => void setContractStatus(contract, status)}>{labels[status]}</button>
                        ))}
                      </div>
                    </div>
                    {contract.status !== "cancelled" && (
                      <div className="order-card-foot">
                        {isCancelArmed ? (
                          <span className="order-cancel-confirm">
                            <button type="button" className="admin-danger is-armed" disabled={busy} onClick={() => void setContractStatus(contract, "cancelled")}>Точно отменить договор</button>
                            <button type="button" className="admin-secondary" onClick={() => setArmed(null)}>Не отменять</button>
                          </span>
                        ) : (
                          <button type="button" className="admin-danger" disabled={busy} onClick={() => setArmed(`contract:${contract.id}`)}>Отменить договор</button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
            {!contracts.length && <div className="table-empty">Договоров пока нет.</div>}
          </div>
        )}
      </section>
    </AdminShell>
  );
}

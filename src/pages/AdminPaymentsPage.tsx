import { Banknote, Check, ClipboardList, ExternalLink, FileSignature, History, RefreshCw, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import { commerceAdminRepository, type CommerceWorkspace } from "../lib/commerceAdminRepository";
import "./AdminPaymentsPage.css";

const planNames: Record<string, string> = {
  personal: "Личная визитка", specialist: "Проверенный специалист", pro: "Специалист PRO",
  start: "Организация Start · 20 сотрудников", business: "Организация Business · 50 сотрудников",
  organization_pro: "Организация Pro · 100 сотрудников"
};
const statusNames: Record<string, string> = {
  draft: "Черновик", payment_pending: "Ожидает чек", payment_review: "На проверке", active: "Активирован",
  rejected: "Отклонён", expired: "Истёк", new: "Новый", clarifying: "Уточнение", approved: "Одобрен",
  in_progress: "В работе", ready: "Готов", completed: "Завершён", cancelled: "Отменён",
  unpaid: "Не оплачен", pending: "Проверяется", paid: "Оплачен", refunded: "Возврат",
  submitted: "Отправлен", signed: "Подписан"
};
const serviceStatuses = ["new","clarifying","approved","in_progress","ready","completed","cancelled"];
const paymentStatuses = ["unpaid","pending","paid","refunded"];
const contractStatuses = ["draft","submitted","approved","signed","cancelled"];
const initial: CommerceWorkspace = {
  stats: { pendingPayments: 0, activePlans: 0, expiringPlans: 0, tariffRevenue: 0, serviceOrders: 0, serviceRevenue: 0, promoClaimed: 0, promoLimit: 50 },
  payments: [], serviceOrders: [], contracts: [], history: []
};

export default function AdminPaymentsPage() {
  const [data, setData] = useState(initial);
  const [tab, setTab] = useState<"payments"|"orders"|"contracts"|"history">("payments");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const refresh = async () => {
    setBusy("refresh");
    try { setData(await commerceAdminRepository.workspace()); setNotice(""); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось загрузить данные"); }
    finally { setBusy(""); }
  };
  useEffect(() => { void refresh(); }, []);
  const payments = useMemo(() => data.payments.filter((p) => filter === "all" || p.status === filter), [data.payments, filter]);

  const approve = async (id: string) => {
    const note = window.prompt("Комментарий администратора (необязательно):", "") ?? "";
    if (!window.confirm("Вы проверили поступление денег, тариф, сумму и чек? После подтверждения тариф активируется автоматически — код не потребуется.")) return;
    setBusy(id);
    try { await commerceAdminRepository.approvePayment(id, note); await refresh(); setNotice("Оплата подтверждена. Тариф активирован автоматически."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Ошибка подтверждения"); }
    finally { setBusy(""); }
  };
  const reject = async (id: string) => {
    const reason = window.prompt(
      "Укажите причину отклонения. Она будет отправлена клиенту:",
      "Оплата не подтверждена. Пожалуйста, проверьте данные и загрузите корректный чек."
    )?.trim();
    if (!reason || reason.length < 3) {
      setNotice("Укажите понятную причину отклонения — не менее 3 символов.");
      return;
    }
    setBusy(id);
    try { await commerceAdminRepository.rejectPayment(id, reason); await refresh(); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Ошибка отклонения"); }
    finally { setBusy(""); }
  };
  const openReceipt = async (path: string) => {
    try { window.open(await commerceAdminRepository.receiptUrl(path), "_blank", "noopener,noreferrer"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Чек не найден"); }
  };

  return <AdminShell title="Оплаты и заказы" description="Контроль тарифов, ручных оплат, изготовления продукции и договоров в одном рабочем пространстве."
    actions={<button className="admin-toolbar-button" disabled={busy === "refresh"} onClick={() => void refresh()}><RefreshCw size={16}/> Обновить</button>}>
    <div className="admin-subpage commerce-console">
      {notice && <div className="commerce-alert">{notice}<button onClick={() => setNotice("")}><X size={16}/></button></div>}

      <div className="commerce-kpis">
        <article><small>Ждут решения</small><strong>{data.stats.pendingPayments}</strong><span>оплат</span></article>
        <article><small>Активные тарифы</small><strong>{data.stats.activePlans}</strong><span>{data.stats.expiringPlans} скоро истекают</span></article>
        <article><small>Доход по тарифам</small><strong>{Number(data.stats.tariffRevenue).toLocaleString()} c.</strong><span>подтверждённые оплаты</span></article>
        <article><small>Заказы услуг</small><strong>{data.stats.serviceOrders}</strong><span>{Number(data.stats.serviceRevenue).toLocaleString()} c. оплачено</span></article>
        <article><small>Стартовая акция</small><strong>{data.stats.promoClaimed}/{data.stats.promoLimit}</strong><span>бесплатных мест занято</span></article>
      </div>

      <div className="commerce-tabs">
        <button className={tab==="payments"?"active":""} onClick={() => setTab("payments")}><Banknote size={17}/> Тарифы и оплаты <b>{data.payments.length}</b></button>
        <button className={tab==="orders"?"active":""} onClick={() => setTab("orders")}><ClipboardList size={17}/> Заказы <b>{data.serviceOrders.length}</b></button>
        <button className={tab==="contracts"?"active":""} onClick={() => setTab("contracts")}><FileSignature size={17}/> Договоры <b>{data.contracts.length}</b></button>
        <button className={tab==="history"?"active":""} onClick={() => setTab("history")}><History size={17}/> История</button>
      </div>

      {tab === "payments" && <section className="commerce-section">
        <header><div><h2>Проверка ручных оплат</h2><p>Код отсутствует до вашего подтверждения. Сервер сам проверяет цену выбранного тарифа.</p></div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">Все статусы</option><option value="payment_review">На проверке</option><option value="active">Активированы</option><option value="rejected">Отклонены</option></select>
        </header>
        <div className="commerce-payment-list">{payments.map((item) => {
          const awaiting = ["payment_pending","payment_review"].includes(item.status) && !item.reviewedAt;
          return <article key={item.id} className={awaiting?"needs-action":""}>
            <div className="commerce-payment-main"><span className={`commerce-status ${item.status}`}>{statusNames[item.status] ?? item.status}</span>
              <strong>{item.orderNumber}</strong><h3>{item.customer?.fullName || item.payerName || "Без имени"}</h3>
              <p>{item.email || item.customer?.phone || "Контакт не указан"}</p></div>
            <div><small>Тариф</small><strong>{planNames[item.planCode] ?? item.planCode}</strong><span>{item.organization}</span></div>
            <div><small>Сумма</small><strong>{Number(item.amount).toLocaleString()} сомони</strong><span>{new Date(item.createdAt).toLocaleString("ru-RU")}</span></div>
            <div className="commerce-payment-buttons"><button className="receipt" onClick={() => void openReceipt(item.receiptPath)}><ExternalLink size={16}/> Открыть чек</button>
              {awaiting && <><button className="approve" disabled={busy===item.id} onClick={() => void approve(item.id)}><Check size={16}/> Подтвердить</button><button className="reject" disabled={busy===item.id} onClick={() => void reject(item.id)}><X size={16}/> Отклонить</button></>}
            </div>
            {item.rejectionReason && <p className="commerce-reason">Причина: {item.rejectionReason}</p>}
          </article>;
        })}{!payments.length && <div className="table-empty">Заявок с выбранным статусом нет.</div>}</div>
      </section>}

      {tab === "orders" && <section className="commerce-section"><header><div><h2>Производственные заказы</h2><p>Дизайн, печать, QR-таблички, NFC-карты и связанные услуги.</p></div></header>
        <div className="commerce-order-list">{data.serviceOrders.map((order) => <article key={order.id}><header><div><span>{statusNames[order.status]}</span><strong>{order.orderNumber}</strong><small>{order.customer?.fullName} · {order.customer?.phone}</small></div><b>{Number(order.total).toLocaleString()} c.</b></header>
          <p>{order.items?.map((i) => `${i.title ?? "Услуга"} × ${i.quantity ?? 1}`).join(" · ") || "Состав заказа уточняется"}</p>
          <div className="commerce-order-controls"><label>Выполнение<select defaultValue={order.status} data-kind="status">{serviceStatuses.map(s=><option key={s} value={s}>{statusNames[s]}</option>)}</select></label>
            <label>Оплата<select defaultValue={order.paymentStatus} data-kind="payment">{paymentStatuses.map(s=><option key={s} value={s}>{statusNames[s]}</option>)}</select></label>
            <label>Комментарий<input defaultValue={order.managerComment} placeholder="Сообщение клиенту"/></label>
            <button onClick={async (e) => { const box=e.currentTarget.parentElement!; const selects=box.querySelectorAll("select"); const input=box.querySelector("input")!; setBusy(order.id); try { await commerceAdminRepository.updateServiceOrder(order.id,selects[0].value,selects[1].value,input.value); await refresh(); } catch(err){setNotice(err instanceof Error?err.message:"Ошибка");} finally{setBusy("");}}}><Check size={16}/> Сохранить</button>
          </div></article>)}{!data.serviceOrders.length&&<div className="table-empty">Заказов пока нет.</div>}</div>
      </section>}

      {tab === "contracts" && <section className="commerce-section"><header><div><h2>Договоры</h2><p>Документы по заказам с контролем согласования и подписания.</p></div></header>
        <div className="commerce-order-list">{data.contracts.map(c=><article key={c.id}><header><div><span>{statusNames[c.status]}</span><strong>{c.number}</strong><small>{c.customer?.fullName} · {c.customer?.phone}</small></div><b>{Number(c.total).toLocaleString()} c.</b></header><p>{c.services?.join(" · ")||"Услуги не указаны"}</p>
          <div className="commerce-contract-control"><select defaultValue={c.status}>{contractStatuses.map(s=><option key={s} value={s}>{statusNames[s]}</option>)}</select><button onClick={async(e)=>{const select=e.currentTarget.previousElementSibling as HTMLSelectElement;setBusy(c.id);try{await commerceAdminRepository.updateContract(c.id,select.value);await refresh();}catch(err){setNotice(err instanceof Error?err.message:"Ошибка");}finally{setBusy("");}}}>Сохранить статус</button></div>
        </article>)}{!data.contracts.length&&<div className="table-empty">Договоров пока нет.</div>}</div>
      </section>}

      {tab === "history" && <section className="commerce-section"><header><div><h2>Журнал решений</h2><p>Неизменяемая история подтверждений, отказов и обновлений заказов.</p></div></header>
        <div className="commerce-history">{data.history.map(h=><article key={h.id}><span><History size={15}/></span><div><strong>{h.action.replaceAll("_"," ")}</strong><p>{String(h.details.number ?? h.details.reason ?? h.details.status ?? "Операция администратора")}</p></div><time>{new Date(h.createdAt).toLocaleString("ru-RU")}</time></article>)}{!data.history.length&&<div className="table-empty">История пока пуста.</div>}</div>
      </section>}
    </div>
  </AdminShell>;
}

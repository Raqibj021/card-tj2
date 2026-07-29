import { Check, Copy, CreditCard, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { paymentRepository, type PaymentRequest } from "../lib/paymentRepository";

export default function AdminPaymentsPage() {
  const [requests, setRequests] = useState<PaymentRequest[]>(() => paymentRepository.list());
  const [code, setCode] = useState("");
  const refresh = () => setRequests(paymentRepository.list());

  return (
    <main className="admin-page">
      <div className="site-container py-10 md:py-14">
        <div className="platform-section-head">
          <div><span className="section-label">Администратор</span><h1 className="page-title">Проверка оплат</h1><p className="page-copy">Подтверждайте перевод только после проверки банковского поступления.</p></div>
          <div className="flex gap-2"><button className="button button-secondary" onClick={refresh}><RefreshCw size={16} /> Обновить</button><Link className="button button-secondary" to="/admin">Обзор</Link></div>
        </div>
        {code && <div className="activation-result"><Check size={18} /><span>Создан код активации: <strong>{code}</strong></span><button onClick={() => navigator.clipboard.writeText(code)}><Copy size={16} /> Копировать</button></div>}
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Заявки на оплату</h2><p>{requests.length} заявок в демонстрационном хранилище</p></div><CreditCard size={20} /></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Заказ</th><th>Заказчик</th><th>Тариф</th><th>Сумма</th><th>Чек</th><th>Статус</th><th /></tr></thead>
              <tbody>
                {requests.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.orderNumber}</strong></td>
                    <td><div><strong>{item.customerName}</strong><br /><small>{item.phone}</small></div></td>
                    <td>{item.plan}</td><td>{item.amount} с.</td><td>{item.receiptName || "—"}</td>
                    <td><span className={item.status === "active" ? "status-pill" : item.status === "rejected" ? "status-pill status-rejected" : "status-pill status-review"}>{item.status}</span></td>
                    <td><div className="payment-actions"><button title="Подтвердить" onClick={() => { setCode(paymentRepository.approve(item.id)); refresh(); }}><Check size={17} /></button><button title="Отклонить" onClick={() => { paymentRepository.reject(item.id); refresh(); }}><X size={17} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!requests.length && <div className="table-empty">Новых заявок пока нет.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

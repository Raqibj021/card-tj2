import { Check, Copy, CreditCard, RefreshCw, X } from "lucide-react";
import { useEffect, useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import { paymentRepository, type PaymentRequest } from "../lib/paymentRepository";

export default function AdminPaymentsPage() {
  const [requests, setRequests] = useState<PaymentRequest[]>(() => paymentRepository.list());
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const refresh = async () => setRequests(await paymentRepository.listRemote());

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <AdminShell title="Проверка оплат" description="Подтверждайте заявку только после фактического поступления денег. До одобрения код активации не существует." actions={<button className="admin-toolbar-button" onClick={() => void refresh()}><RefreshCw size={16} /> Обновить</button>}>
      <div className="admin-subpage">
        {error && <div className="auth-message">{error}</div>}
        {code && <div className="activation-result"><Check size={18} /><span>Оплата подтверждена. Код создан сервером и отправлен пользователю: <strong>{code}</strong></span><button onClick={() => navigator.clipboard.writeText(code)}><Copy size={16} /> Копировать</button></div>}
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
                    <td><div className="payment-actions"><button title="Подтвердить" onClick={async () => {
                      setError("");
                      try {
                        setCode(await paymentRepository.approve(item.id));
                        await refresh();
                      } catch (caught) {
                        setError(caught instanceof Error ? caught.message : "Ошибка подтверждения");
                      }
                    }}><Check size={17} /></button><button title="Отклонить" onClick={async () => {
                      setError("");
                      try {
                        await paymentRepository.reject(item.id);
                        await refresh();
                      } catch (caught) {
                        setError(caught instanceof Error ? caught.message : "Ошибка отклонения");
                      }
                    }}><X size={17} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!requests.length && <div className="table-empty">Новых заявок пока нет.</div>}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

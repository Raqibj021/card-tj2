import { Download, FileSignature, Printer } from "lucide-react";
import { useState } from "react";
import Footer from "../components/layout/Footer";
import { useAuth } from "../context/AuthContext";
import { createContract, type CustomerDetails } from "../lib/commerceRepository";

export default function ContractPage() {
  const { user, profile } = useAuth();
  const [type, setType] = useState<"individual" | "organization">("individual");
  const [customer, setCustomer] = useState<CustomerDetails>({ fullName: profile?.fullName ?? "", phone: profile?.phone ?? "", email: profile?.email ?? "", address: "", taxId: "", document: "", organization: "" });
  const [services, setServices] = useState("Создание и сопровождение цифровых визиток и QR-кодов");
  const [total, setTotal] = useState(0);
  const [number, setNumber] = useState("ПРОЕКТ");
  const [notice, setNotice] = useState("");

  const save = async () => {
    if (!user || !customer.fullName || !customer.phone) return;
    try {
      const result = await createContract(user.id, type, customer, [services], total);
      setNumber(result.contract_number);
      setNotice(`Договор ${result.contract_number} сохранён.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось сохранить договор.");
    }
  };
  const download = () => {
    const html = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>Договор ${number}</title><style>body{font:14px Arial;max-width:800px;margin:40px auto;line-height:1.6}h1{text-align:center}.sign{display:flex;justify-content:space-between;margin-top:70px}</style><body>${document.querySelector(".contract-paper")?.innerHTML ?? ""}</body></html>`;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `vizora-contract-${number}.html`; anchor.click(); URL.revokeObjectURL(url);
  };
  return (
    <>
      <main className="commerce-page">
        <section className="site-container contract-layout">
          <aside className="contract-form no-print">
            <span className="section-label"><FileSignature size={15} /> Документ</span>
            <h1>Подготовить договор</h1>
            <p>Заполните реквизиты заказчика. После проверки распечатайте два экземпляра.</p>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)}><option value="individual">Физическое лицо</option><option value="organization">Организация</option></select>
            {type === "organization" && <input placeholder="Название организации" value={customer.organization} onChange={(e) => setCustomer({ ...customer, organization: e.target.value })} />}
            <input placeholder="ФИО заказчика" value={customer.fullName} onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })} />
            <input placeholder="Паспорт / ИНН" value={customer.document} onChange={(e) => setCustomer({ ...customer, document: e.target.value })} />
            <input placeholder="Адрес" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} />
            <input placeholder="Телефон" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} />
            <input placeholder="E-mail" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
            <textarea placeholder="Предмет договора" value={services} onChange={(e) => setServices(e.target.value)} />
            <input min="0" type="number" placeholder="Стоимость, сомони" value={total || ""} onChange={(e) => setTotal(Number(e.target.value))} />
            <button className="button button-primary w-full" type="button" onClick={save}>Сохранить договор</button>
            <div className="contract-actions"><button type="button" onClick={() => window.print()}><Printer size={17} /> Печать / PDF</button><button type="button" onClick={download}><Download size={17} /> Скачать</button></div>
            {notice && <p className="form-notice">{notice}</p>}
          </aside>
          <article className="contract-paper">
            <h1>ДОГОВОР № {number}</h1><p className="contract-place">об оказании услуг по созданию цифровых визиток и QR-материалов<br />г. Душанбе · {new Date().toLocaleDateString("ru-RU")}</p>
            <p>VIZORA.TJ, именуемый в дальнейшем «Исполнитель», с одной стороны, и {customer.organization ? `${customer.organization}, в лице ${customer.fullName}` : customer.fullName || "________________"}, именуемый(ая) в дальнейшем «Заказчик», с другой стороны, заключили настоящий договор о нижеследующем.</p>
            <h2>1. Предмет договора</h2><p>Исполнитель обязуется оказать услуги: <b>{services}</b>, а Заказчик обязуется принять результат и оплатить согласованную стоимость.</p>
            <h2>2. Стоимость и порядок оплаты</h2><p>Предварительная стоимость составляет <b>{total.toLocaleString("ru-RU")} сомони</b>. Окончательная стоимость фиксируется после согласования технического задания. Оплата производится по реквизитам Исполнителя; работа начинается после подтверждения оплаты.</p>
            <h2>3. Порядок выполнения</h2><p>Заказчик предоставляет достоверные материалы и подтверждает право на их использование. Срок выполнения согласуется после получения всех данных. Электронные макеты передаются в согласованном формате.</p>
            <h2>4. Ответственность и персональные данные</h2><p>Стороны несут ответственность в соответствии с законодательством Республики Таджикистан. Заказчик разрешает обработку предоставленных данных исключительно для исполнения заказа и работы платформы.</p>
            <h2>5. Реквизиты и подписи</h2>
            <div className="contract-parties"><div><b>Исполнитель</b><p>VIZORA.TJ<br />Тел.: +992 92 921 35 37<br />ДС Банк / Alif Bank</p><div className="vizora-seal">VIZORA.TJ<br /><small>ИСПОЛНИТЕЛЬ</small></div></div><div><b>Заказчик</b><p>{customer.organization}<br />{customer.fullName}<br />{customer.document}<br />{customer.address}<br />{customer.phone}<br />{customer.email}</p><p>Подпись: ______________</p></div></div>
            <small className="contract-disclaimer">Автоматическая печать VIZORA.TJ подтверждает происхождение проекта документа и не заменяет собственноручную или электронную подпись сторон.</small>
          </article>
        </section>
      </main>
      <div className="no-print"><Footer /></div>
    </>
  );
}

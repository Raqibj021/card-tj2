import {
  Building2,
  CheckCircle2,
  Copy,
  Download,
  Network,
  Plus,
  QrCode,
  Search,
  Settings,
  ShieldCheck,
  Users,
  BadgeCheck,
  Edit3,
  Trash2
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { cardRepository } from "../lib/cardRepository";
import { createSlug } from "../lib/cardUtils";

const initialEmployees = [
  { id: 1, name: "Фаридун Саидов", position: "Проректор", department: "Ректорат", status: "Активен" },
  { id: 2, name: "Малика Рахмонова", position: "Начальник отдела", department: "Учебное управление", status: "Активен" },
  { id: 3, name: "Азиз Каримов", position: "Главный специалист", department: "Отдел технологий", status: "На проверке" },
  { id: 4, name: "Шахноза Юсуфова", position: "Инспектор", department: "Отдел кадров", status: "Активен" }
];

export default function OrganizationDashboardPage() {
  const [employees, setEmployees] = useState(initialEmployees);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const filtered = useMemo(
    () => employees.filter((item) =>
      `${item.name} ${item.position} ${item.department}`.toLowerCase().includes(query.toLowerCase())
    ),
    [employees, query]
  );

  return (
    <main className="org-dashboard-page">
      <div className="site-container py-10 md:py-14">
        <div className="org-workspace-head">
          <div className="org-workspace-brand"><span><Building2 size={22} /></span><div><small>Рабочее пространство</small><h1>Университет «Сомон»</h1></div></div>
          <div className="flex gap-2"><button className="button button-secondary"><Settings size={17} /> Настройки</button><button className="button button-primary" onClick={() => setShowForm(true)}><Plus size={17} /> Добавить сотрудника</button></div>
        </div>

        <div className="org-workspace-stats">
          <article><Users size={21} /><div><strong>{employees.length} / 20</strong><span>Сотрудники</span></div></article>
          <article><Network size={21} /><div><strong>4</strong><span>Подразделения</span></div></article>
          <article><QrCode size={21} /><div><strong>286</strong><span>Сканирования</span></div></article>
          <article><ShieldCheck size={21} /><div><strong>Start</strong><span>Тариф до 20</span></div></article>
        </div>

        <div className="org-workspace-grid">
          <aside className="org-sidebar">
            <strong>Управление</strong>
            <button className="active"><Users size={17} /> Сотрудники</button>
            <button><Network size={17} /> Структура</button>
            <button><QrCode size={17} /> QR-коды</button>
            <button><ShieldCheck size={17} /> Проверка данных</button>
            <hr />
            <Link to="/organization/apply"><Building2 size={17} /> Тариф и оплата</Link>
          </aside>
          <section className="org-content-panel">
            <div className="org-content-head">
              <div><h2>Сотрудники</h2><p>Управляйте визитками и доступом сотрудников.</p></div>
              <div className="org-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск сотрудника" /></div>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Сотрудник</th><th>Должность</th><th>Подразделение</th><th>Статус</th><th /></tr></thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td><div className="table-person"><span>{item.name[0]}</span><div><strong>{item.name}</strong><small>Персональная визитка</small></div></div></td>
                      <td>{item.position}</td>
                      <td>{item.department}</td>
                      <td><span className={item.status === "Активен" ? "status-pill" : "status-pill status-review"}>{item.status}</span></td>
                      <td>
                        <div className="employee-actions">
                          {item.status !== "Активен" && <button title="Подтвердить" onClick={() => setEmployees((items) => items.map((employee) => employee.id === item.id ? { ...employee, status: "Активен" } : employee))}><BadgeCheck size={16} /></button>}
                          <button title="Редактировать" onClick={() => {
                            const position = window.prompt("Новая должность", item.position);
                            if (position) setEmployees((items) => items.map((employee) => employee.id === item.id ? { ...employee, position } : employee));
                          }}><Edit3 size={16} /></button>
                          <button title="Удалить" onClick={() => {
                            if (window.confirm(`Удалить сотрудника ${item.name}?`)) setEmployees((items) => items.filter((employee) => employee.id !== item.id));
                          }}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="org-qr-panel">
          <div className="org-qr-preview"><QrCode size={92} /></div>
          <div><span className="section-label">Общий QR организации</span><h2>Один код для доступа ко всей структуре</h2><p>После публикации QR откроет страницу организации с поиском по подразделениям и сотрудникам.</p><div className="flex flex-wrap gap-2"><button className="button button-primary"><Download size={17} /> Скачать QR</button><button className="button button-secondary"><Copy size={17} /> Копировать ссылку</button></div></div>
        </section>
      </div>

      {showForm && (
        <div className="platform-modal" role="dialog" aria-modal="true">
          <form className="platform-modal-card" onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const name = String(data.get("name"));
            const position = String(data.get("position"));
            let slug = createSlug(name);
            if (cardRepository.getBySlug(slug)) slug = `${slug}-${String(Date.now()).slice(-4)}`;
            cardRepository.save({
              slug,
              photo: "",
              companyLogo: "",
              fullName: name,
              position,
              organization: "Университет «Сомон»",
              description: "",
              phone: String(data.get("phone")),
              secondPhone: "",
              whatsapp: String(data.get("phone")),
              telegram: "",
              instagram: "",
              facebook: "",
              email: String(data.get("email")),
              website: "",
              address: "",
              language: "ru",
              theme: "blue",
              template: "executive"
            });
            setEmployees((items) => [...items, {
              id: Date.now(),
              name,
              position,
              department: String(data.get("department")),
              status: "На проверке"
            }]);
            setShowForm(false);
          }}>
            <div className="modal-head"><div><span className="section-label">Новая визитка</span><h2>Добавить сотрудника</h2></div><button type="button" onClick={() => setShowForm(false)}>×</button></div>
            <div className="platform-form">
              <label><span>ФИО *</span><input name="name" required /></label>
              <label><span>Должность *</span><input name="position" required /></label>
              <div className="form-grid"><label><span>Телефон *</span><input name="phone" type="tel" required placeholder="+992" /></label><label><span>Email</span><input name="email" type="email" /></label></div>
              <label><span>Подразделение *</span><select name="department"><option>Ректорат</option><option>Учебное управление</option><option>Отдел технологий</option><option>Отдел кадров</option></select></label>
              <div className="modal-note"><CheckCircle2 size={18} /> После добавления сотрудник получит приглашение и подтвердит данные.</div>
              <button className="button button-primary button-large" type="submit"><Plus size={18} /> Добавить сотрудника</button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}

import {
  Building2, Copy, Download, Edit3, Network, Plus, QrCode,
  Search, ShieldCheck, Trash2, Users
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import QRCodeImage from "../components/QRCode";
import { useApp } from "../context/AppContext";
import { downloadQrCode } from "../lib/cardUtils";
import {
  organizationRepository,
  type OrganizationWorkspace
} from "../lib/organizationRepository";

const publicUrl = (slug: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}/organization/${slug}`;
};

export default function OrganizationDashboardPage() {
  const { language } = useApp();
  const [workspace, setWorkspace] = useState<OrganizationWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [message, setMessage] = useState("");
  const copy = {
    ru: { workspace: "Рабочее пространство", add: "Добавить сотрудника", staff: "Сотрудники", departments: "Подразделения", scans: "Общий QR", plan: "Тариф", manage: "Управление", search: "Поиск сотрудника", person: "Сотрудник", position: "Должность", department: "Подразделение", status: "Статус", card: "Цифровая визитка", invited: "Приглашён", active: "Активен", review: "На проверке", shared: "Общий QR организации", sharedTitle: "Один код для всей структуры", sharedText: "QR открывает страницу организации с подразделениями и подтверждёнными сотрудниками.", download: "Скачать QR", copy: "Копировать ссылку", noOrg: "Организация ещё не зарегистрирована", register: "Зарегистрировать организацию", newDepartment: "Новое подразделение", departmentName: "Название подразделения", save: "Сохранить", fullName: "ФИО", phone: "Телефон", email: "Email", invite: "Отправить приглашение", inviteInfo: "Сотрудник получит код. После подтверждения аккаунта фирменная визитка создастся автоматически." },
    tj: { workspace: "Фазои корӣ", add: "Иловаи корманд", staff: "Кормандон", departments: "Шуъбаҳо", scans: "QR-и умумӣ", plan: "Тарофа", manage: "Идоракунӣ", search: "Ҷустуҷӯи корманд", person: "Корманд", position: "Вазифа", department: "Шуъба", status: "Ҳолат", card: "Варақаи рақамӣ", invited: "Даъват шудааст", active: "Фаъол", review: "Дар санҷиш", shared: "QR-и умумии ташкилот", sharedTitle: "Як рамз барои тамоми сохтор", sharedText: "QR саҳифаи ташкилотро бо шуъбаҳо ва кормандони тасдиқшуда мекушояд.", download: "Боргирии QR", copy: "Нусхаи пайванд", noOrg: "Ташкилот ҳоло сабт нашудааст", register: "Сабти ташкилот", newDepartment: "Шуъбаи нав", departmentName: "Номи шуъба", save: "Нигоҳ доштан", fullName: "Ному насаб", phone: "Телефон", email: "Email", invite: "Фиристодани даъват", inviteInfo: "Корманд рамз мегирад. Пас аз тасдиқ варақаи фирмавӣ худкор сохта мешавад." },
    en: { workspace: "Workspace", add: "Add employee", staff: "Employees", departments: "Departments", scans: "Shared QR", plan: "Plan", manage: "Management", search: "Search employee", person: "Employee", position: "Position", department: "Department", status: "Status", card: "Digital card", invited: "Invited", active: "Active", review: "Under review", shared: "Organization shared QR", sharedTitle: "One code for the entire structure", sharedText: "The QR opens the organization page with departments and verified employees.", download: "Download QR", copy: "Copy link", noOrg: "No organization registered yet", register: "Register organization", newDepartment: "New department", departmentName: "Department name", save: "Save", fullName: "Full name", phone: "Phone", email: "Email", invite: "Send invitation", inviteInfo: "The employee receives a code. A branded card is created automatically after confirmation." }
  }[language];

  const refresh = async () => {
    setLoading(true);
    setWorkspace(await organizationRepository.getWorkspace());
    setLoading(false);
  };
  useEffect(() => { void refresh(); }, []);
  const employees = useMemo(() => (workspace?.employees ?? []).filter((item) =>
    `${item.name} ${item.position} ${item.department}`.toLowerCase().includes(query.toLowerCase())
  ), [workspace, query]);

  if (loading) return <main className="route-loading"><span /><p>...</p></main>;
  if (!workspace) return <main className="card-missing"><div className="empty-state"><Building2 size={32} /><h1>{copy.noOrg}</h1><Link className="button button-primary" to="/organization/apply">{copy.register}</Link></div></main>;

  const organization = workspace.organization;
  const url = publicUrl(organization.slug ?? "");
  return (
    <main className="org-dashboard-page">
      <div className="site-container py-10 md:py-14">
        <div className="org-workspace-head">
          <div className="org-workspace-brand"><span><Building2 size={22} /></span><div><small>{copy.workspace}</small><h1>{organization.displayName}</h1></div></div>
          <div className="flex flex-wrap gap-2"><button className="button button-secondary" onClick={() => setShowDepartmentForm(true)}><Network size={17} /> {copy.newDepartment}</button><button className="button button-primary" onClick={() => setShowEmployeeForm(true)}><Plus size={17} /> {copy.add}</button></div>
        </div>
        {message && <div className="admin-notice mt-5"><ShieldCheck size={18} /><span>{message}</span></div>}
        <div className="org-workspace-stats">
          <article><Users size={21} /><div><strong>{workspace.employees.length} / {organization.employeeLimit}</strong><span>{copy.staff}</span></div></article>
          <article><Network size={21} /><div><strong>{workspace.departments.length}</strong><span>{copy.departments}</span></div></article>
          <article><QrCode size={21} /><div><strong>1</strong><span>{copy.scans}</span></div></article>
          <article><ShieldCheck size={21} /><div><strong>{organization.planCode || "—"}</strong><span>{copy.plan}</span></div></article>
        </div>
        <div className="org-workspace-grid">
          <aside className="org-sidebar"><strong>{copy.manage}</strong><button className="active"><Users size={17} /> {copy.staff}</button><button onClick={() => setShowDepartmentForm(true)}><Network size={17} /> {copy.departments}</button><a href="#organization-qr"><QrCode size={17} /> {copy.scans}</a><hr /><Link to="/organization/apply"><Building2 size={17} /> {copy.plan}</Link></aside>
          <section className="org-content-panel">
            <div className="org-content-head"><div><h2>{copy.staff}</h2><p>{copy.inviteInfo}</p></div><div className="org-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} /></div></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{copy.person}</th><th>{copy.position}</th><th>{copy.department}</th><th>{copy.status}</th><th /></tr></thead><tbody>
              {employees.map((item) => <tr key={item.id}><td><div className="table-person"><span>{item.name[0]}</span><div><strong>{item.name}</strong><small>{item.email || copy.card}</small></div></div></td><td>{item.position}</td><td>{item.department}</td><td><span className={item.status === "approved" ? "status-pill" : "status-pill status-review"}>{item.status === "approved" ? copy.active : item.status === "invited" ? copy.invited : copy.review}</span></td><td><div className="employee-actions">
                {item.status !== "invited" && <button title="Edit" onClick={async () => { const value = window.prompt(copy.position, item.position); if (value) { await organizationRepository.updateEmployee(item.id, value); await refresh(); } }}><Edit3 size={16} /></button>}
                {item.status !== "invited" && <button title="Delete" onClick={async () => { if (window.confirm(item.name)) { await organizationRepository.removeEmployee(item.id); await refresh(); } }}><Trash2 size={16} /></button>}
              </div></td></tr>)}
            </tbody></table>{!employees.length && <div className="table-empty">{copy.staff}: 0</div>}</div>
          </section>
        </div>
        <section className="org-qr-panel" id="organization-qr">
          <div className="org-qr-preview"><QRCodeImage value={url} size={150} /></div>
          <div><span className="section-label">{copy.shared}</span><h2>{copy.sharedTitle}</h2><p>{copy.sharedText}</p><div className="flex flex-wrap gap-2"><button className="button button-primary" onClick={() => void downloadQrCode(url, organization.slug || "organization")}><Download size={17} /> {copy.download}</button><button className="button button-secondary" onClick={async () => { await navigator.clipboard.writeText(url); setMessage(copy.copy); }}><Copy size={17} /> {copy.copy}</button></div></div>
        </section>
      </div>

      {showEmployeeForm && <div className="platform-modal"><form className="platform-modal-card" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        try { const code = await organizationRepository.inviteEmployee({ organizationId: organization.id, name: String(data.get("name")), email: String(data.get("email")), phone: String(data.get("phone")), position: String(data.get("position")), departmentId: String(data.get("departmentId")) || null }); setMessage(`${copy.invited}: ${code}`); setShowEmployeeForm(false); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Error"); }
      }}><div className="modal-head"><div><span className="section-label">{copy.card}</span><h2>{copy.add}</h2></div><button type="button" onClick={() => setShowEmployeeForm(false)}>×</button></div><div className="platform-form"><label><span>{copy.fullName}</span><input name="name" required /></label><div className="form-grid"><label><span>{copy.email}</span><input name="email" type="email" required /></label><label><span>{copy.phone}</span><input name="phone" type="tel" required /></label></div><label><span>{copy.position}</span><input name="position" required /></label><label><span>{copy.department}</span><select name="departmentId"><option value="">—</option>{workspace.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="modal-note"><ShieldCheck size={18} /> {copy.inviteInfo}</div><button className="button button-primary button-large"><Plus size={18} /> {copy.invite}</button></div></form></div>}

      {showDepartmentForm && <div className="platform-modal"><form className="platform-modal-card" onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); try { await organizationRepository.addDepartment(organization.id, String(data.get("name"))); setShowDepartmentForm(false); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Error"); } }}><div className="modal-head"><h2>{copy.newDepartment}</h2><button type="button" onClick={() => setShowDepartmentForm(false)}>×</button></div><div className="platform-form"><label><span>{copy.departmentName}</span><input name="name" required /></label><button className="button button-primary">{copy.save}</button></div></form></div>}
    </main>
  );
}

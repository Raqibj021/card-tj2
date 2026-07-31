import {
  Building2, ChevronRight, Copy, Download, Edit3, FolderTree, Network, Plus, QrCode,
  Search, ShieldCheck, Trash2, Users, X, LogOut, UserRound, Bell
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import QRCodeImage from "../components/QRCode";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { downloadQrCode } from "../lib/cardUtils";
import {
  organizationRepository,
  type OrganizationDepartment,
  type OrganizationEmployee,
  type OrganizationWorkspace
} from "../lib/organizationRepository";
import { publicSiteUrl } from "../lib/siteUrl";
import { useNotificationCounts } from "../hooks/useNotificationCounts";

const publicUrl = (slug: string) => {
  return publicSiteUrl(`/organization/${slug}`);
};

export default function OrganizationDashboardPage() {
  const { language } = useApp();
  const { profile, user, signOut } = useAuth();
  const { counts } = useNotificationCounts();
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<OrganizationWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [departmentParentId, setDepartmentParentId] = useState<string | null>(null);
  const [editingDepartment, setEditingDepartment] = useState<OrganizationDepartment | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [organizations, setOrganizations] = useState<Array<{ id: string; displayName: string }>>([]);
  const [editingEmployee, setEditingEmployee] = useState<OrganizationEmployee | null>(null);
  const [message, setMessage] = useState("");
  const copy = {
    ru: { workspace: "Рабочее пространство", add: "Добавить сотрудника", staff: "Сотрудники", departments: "Структура", scans: "Общий QR", plan: "Тариф", manage: "Управление", search: "Поиск сотрудника", person: "Сотрудник", position: "Должность", department: "Подразделение", status: "Статус", card: "Цифровая визитка", invited: "Приглашён", active: "Активен", review: "На проверке", shared: "Общий QR организации", sharedTitle: "Один код для всей структуры", sharedText: "QR открывает страницу организации с подразделениями и действующими визитками сотрудников.", download: "Скачать QR", copy: "Копировать ссылку", noOrg: "Рабочий кабинет пока недоступен", register: "Посмотреть статус заявки", newDepartment: "Новое подразделение", departmentName: "Название подразделения", parentDepartment: "Родительское подразделение", rootLevel: "Верхний уровень", save: "Сохранить изменения", fullName: "ФИО", phone: "Телефон", email: "Email", invite: "Добавить и пригласить", inviteInfo: "После принятия приглашения фирменная визитка активируется автоматически, без проверки платформой.", responsibility: "Уполномоченное лицо организации отвечает за достоверность данных сотрудников и может в любой момент исправить их визитки.", allEmployees: "Все сотрудники", editDepartment: "Редактировать подразделение", deleteDepartment: "Удалить подразделение", moveEmployee: "Изменить визитку сотрудника", revoke: "Отозвать приглашение", emptyStructure: "Создайте собственную структуру организации: управление, отделы, филиалы или любые другие уровни.", organizationAccount: "Аккаунт организации", logout: "Выйти" },
    tj: { workspace: "Фазои корӣ", add: "Иловаи корманд", staff: "Кормандон", departments: "Сохтор", scans: "QR-и умумӣ", plan: "Тарофа", manage: "Идоракунӣ", search: "Ҷустуҷӯи корманд", person: "Корманд", position: "Вазифа", department: "Шуъба", status: "Ҳолат", card: "Варақаи рақамӣ", invited: "Даъват шудааст", active: "Фаъол", review: "Дар санҷиш", shared: "QR-и умумии ташкилот", sharedTitle: "Як рамз барои тамоми сохтор", sharedText: "QR саҳифаи ташкилотро бо шуъбаҳо ва варақаҳои фаъоли кормандон мекушояд.", download: "Боргирии QR", copy: "Нусхаи пайванд", noOrg: "Кабинети корӣ ҳоло дастрас нест", register: "Дидани ҳолати дархост", newDepartment: "Шуъбаи нав", departmentName: "Номи шуъба", parentDepartment: "Шуъбаи болоӣ", rootLevel: "Сатҳи болоӣ", save: "Нигоҳ доштани тағйирот", fullName: "Ному насаб", phone: "Телефон", email: "Email", invite: "Илова ва даъват кардан", inviteInfo: "Пас аз қабули даъват варақаи фирмавӣ бе санҷиши платформа худкор фаъол мешавад.", responsibility: "Шахси ваколатдори ташкилот барои дурустии маълумоти кормандон ҷавобгар аст ва метавонад варақаҳоро ислоҳ кунад.", allEmployees: "Ҳамаи кормандон", editDepartment: "Тағйири шуъба", deleteDepartment: "Нест кардани шуъба", moveEmployee: "Тағйири варақаи корманд", revoke: "Бекор кардани даъват", emptyStructure: "Сохтори дилхоҳи ташкилотро созед: роҳбарият, шуъбаҳо, филиалҳо ё сатҳҳои дигар.", organizationAccount: "Ҳисоби ташкилот", logout: "Баромадан" },
    en: { workspace: "Workspace", add: "Add employee", staff: "Employees", departments: "Structure", scans: "Shared QR", plan: "Plan", manage: "Management", search: "Search employee", person: "Employee", position: "Position", department: "Department", status: "Status", card: "Digital card", invited: "Invited", active: "Active", review: "Under review", shared: "Organization shared QR", sharedTitle: "One code for the entire structure", sharedText: "The QR opens the organization page with departments and active employee cards.", download: "Download QR", copy: "Copy link", noOrg: "The workspace is not available yet", register: "View application status", newDepartment: "New department", departmentName: "Department name", parentDepartment: "Parent department", rootLevel: "Top level", save: "Save changes", fullName: "Full name", phone: "Phone", email: "Email", invite: "Add and invite", inviteInfo: "After accepting the invitation, the branded card is activated automatically without platform review.", responsibility: "The organization’s authorized manager is responsible for employee data and may correct employee cards at any time.", allEmployees: "All employees", editDepartment: "Edit department", deleteDepartment: "Delete department", moveEmployee: "Edit employee card", revoke: "Revoke invitation", emptyStructure: "Build your own organization structure: management, departments, branches or any other levels.", organizationAccount: "Organization account", logout: "Sign out" }
  }[language];

  const refresh = async (organizationId = selectedOrganizationId) => {
    setLoading(true);
    try {
      const list = (await organizationRepository.listMine()).filter((item) =>
        item.reviewStatus === "approved"
        && Boolean(item.activeUntil)
        && new Date(item.activeUntil as string).getTime() > Date.now()
      );
      setOrganizations(list.map(({ id, displayName }) => ({ id, displayName })));
      if (!list.length) {
        setWorkspace(null);
        navigate("/organization/apply", { replace: true });
        return;
      }
      const resolvedId = list.some((item) => item.id === organizationId) ? organizationId : list[0].id;
      const next = await organizationRepository.getWorkspace(resolvedId);
      setWorkspace(next);
      if (next && next.organization.id !== selectedOrganizationId) setSelectedOrganizationId(next.organization.id);
    } catch (error) {
      setWorkspace(null);
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить организацию.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);
  const descendantIds = useMemo(() => {
    if (!workspace || !selectedDepartmentId) return new Set<string>();
    const result = new Set<string>([selectedDepartmentId]);
    let changed = true;
    while (changed) {
      changed = false;
      workspace.departments.forEach((item) => {
        if (item.parentId && result.has(item.parentId) && !result.has(item.id)) {
          result.add(item.id); changed = true;
        }
      });
    }
    return result;
  }, [workspace, selectedDepartmentId]);
  const employees = useMemo(() => (workspace?.employees ?? []).filter((item) =>
    (!selectedDepartmentId || (item.departmentId && descendantIds.has(item.departmentId))) &&
    `${item.name} ${item.position} ${item.department}`.toLowerCase().includes(query.toLowerCase())
  ), [workspace, query, selectedDepartmentId, descendantIds]);

  if (loading) return <main className="route-loading"><span /><p>...</p></main>;
  if (!workspace) return <main className="card-missing"><div className="empty-state"><Building2 size={32} /><h1>{copy.noOrg}</h1><Link className="button button-primary" to="/organization/apply">{copy.register}</Link></div></main>;

  const organization = workspace.organization;
  const url = publicUrl(organization.slug ?? "");
  const accountName = profile?.fullName || user?.email?.split("@")[0] || organization.displayName;
  const leaveAccount = async () => {
    await signOut();
    navigate("/", { replace: true });
  };
  return (
    <main className="org-dashboard-page">
      <div className="site-container py-10 md:py-14">
        <div className="org-account-strip">
          <div>
            <span><UserRound size={18} /></span>
            <div>
              <small>{copy.organizationAccount}</small>
              <strong>{accountName}</strong>
              <em>{profile?.email || user?.email}</em>
            </div>
          </div>
          <div className="org-account-actions"><Link to="/notifications?section=organization" className="button button-secondary"><Bell size={16} />{counts.organization > 0 && <b className="button-notification-badge">{counts.organization > 99 ? "99+" : counts.organization}</b>}</Link><button type="button" className="button dashboard-logout" onClick={() => void leaveAccount()}><LogOut size={16} /> {copy.logout}</button></div>
        </div>
        <div className="org-workspace-head">
          <div className="org-workspace-brand"><span><Building2 size={22} /></span><div><small>{copy.workspace}</small>{organizations.length > 1 ? <select className="org-switcher" value={organization.id} onChange={(event) => { setSelectedDepartmentId(null); setSelectedOrganizationId(event.target.value); void refresh(event.target.value); }}>{organizations.map((item) => <option value={item.id} key={item.id}>{item.displayName}</option>)}</select> : <h1>{organization.displayName}</h1>}</div></div>
          <div className="flex flex-wrap gap-2"><button className="button button-secondary" onClick={() => { setEditingDepartment(null); setDepartmentParentId(selectedDepartmentId); setShowDepartmentForm(true); }}><Network size={17} /> {copy.newDepartment}</button><button className="button button-primary" onClick={() => setShowEmployeeForm(true)}><Plus size={17} /> {copy.add}</button></div>
        </div>
        {message && <div className="admin-notice mt-5"><ShieldCheck size={18} /><span>{message}</span></div>}
        <div className="org-workspace-stats">
          <article><Users size={21} /><div><strong>{workspace.employees.length} / {organization.employeeLimit}</strong><span>{copy.staff}</span></div></article>
          <article><Network size={21} /><div><strong>{workspace.departments.length}</strong><span>{copy.departments}</span></div></article>
          <article><QrCode size={21} /><div><strong>1</strong><span>{copy.scans}</span></div></article>
          <article><ShieldCheck size={21} /><div><strong>{organization.planCode || "—"}</strong><span>{copy.plan}</span></div></article>
        </div>
        <div className="org-workspace-grid">
          <aside className="org-sidebar org-structure-sidebar">
            <strong>{copy.departments}</strong>
            <button className={!selectedDepartmentId ? "active" : ""} onClick={() => setSelectedDepartmentId(null)}><Users size={17} /> {copy.allEmployees}<b>{workspace.employees.length}</b></button>
            {workspace.departments.length ? <DepartmentTree
              departments={workspace.departments}
              employees={workspace.employees}
              selectedId={selectedDepartmentId}
              onSelect={setSelectedDepartmentId}
              onAdd={(parentId) => { setEditingDepartment(null); setDepartmentParentId(parentId); setShowDepartmentForm(true); }}
              onEdit={(department) => { setEditingDepartment(department); setDepartmentParentId(department.parentId); setShowDepartmentForm(true); }}
              onDelete={async (department) => {
                if (!window.confirm(`${copy.deleteDepartment}: ${department.name}?`)) return;
                try { await organizationRepository.deleteDepartment(department.id); if (selectedDepartmentId === department.id) setSelectedDepartmentId(null); await refresh(); }
                catch (error) { setMessage(error instanceof Error ? error.message : "Error"); }
              }}
            /> : <p className="org-structure-empty">{copy.emptyStructure}</p>}
            <button onClick={() => { setEditingDepartment(null); setDepartmentParentId(null); setShowDepartmentForm(true); }}><Plus size={17} /> {copy.newDepartment}</button>
            <hr /><a href="#organization-qr"><QrCode size={17} /> {copy.scans}</a><Link to="/organization/apply"><Building2 size={17} /> {copy.plan}</Link>
          </aside>
          <section className="org-content-panel">
            <div className="org-content-head"><div><h2>{copy.staff}</h2><p>{copy.inviteInfo}</p><p className="org-responsibility-note">{copy.responsibility}</p></div><div className="org-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} /></div></div>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>{copy.person}</th><th>{copy.position}</th><th>{copy.department}</th><th>{copy.status}</th><th /></tr></thead><tbody>
              {employees.map((item) => <tr key={item.id}><td><div className="table-person"><span>{item.name[0]}</span><div><strong>{item.name}</strong><small>{item.email || copy.card}</small></div></div></td><td>{item.position}</td><td>{item.department}</td><td><span className={item.status === "approved" ? "status-pill" : "status-pill status-review"}>{item.status === "approved" ? copy.active : item.status === "invited" ? copy.invited : copy.review}</span></td><td><div className="employee-actions">
                {item.kind === "assignment" && <button title={copy.moveEmployee} onClick={() => setEditingEmployee(item)}><Edit3 size={16} /></button>}
                <button title={item.kind === "invitation" ? copy.revoke : "Delete"} onClick={async () => { if (!window.confirm(item.name)) return; item.kind === "invitation" ? await organizationRepository.revokeInvitation(item.id) : await organizationRepository.removeEmployee(item.id); await refresh(); }}><Trash2 size={16} /></button>
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

      {editingEmployee && <div className="platform-modal"><form className="platform-modal-card" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        try {
          await organizationRepository.updateEmployee({
            assignmentId: editingEmployee.id,
            name: String(data.get("name")),
            email: String(data.get("email")),
            phone: String(data.get("phone")),
            position: String(data.get("position")),
            departmentId: String(data.get("departmentId")) || null
          });
          setEditingEmployee(null);
          await refresh();
        }
        catch (error) { setMessage(error instanceof Error ? error.message : "Error"); }
      }}><div className="modal-head"><h2>{copy.moveEmployee}</h2><button type="button" onClick={() => setEditingEmployee(null)}>×</button></div><div className="platform-form"><label><span>{copy.fullName}</span><input name="name" defaultValue={editingEmployee.name} required /></label><div className="form-grid"><label><span>{copy.email}</span><input name="email" type="email" defaultValue={editingEmployee.email} required /></label><label><span>{copy.phone}</span><input name="phone" type="tel" defaultValue={editingEmployee.phone ?? ""} required /></label></div><label><span>{copy.position}</span><input name="position" defaultValue={editingEmployee.position} required /></label><label><span>{copy.department}</span><select name="departmentId" defaultValue={editingEmployee.departmentId ?? ""}><option value="">—</option>{workspace.departments.map((item) => <option key={item.id} value={item.id}>{departmentPath(item, workspace.departments)}</option>)}</select></label><div className="modal-note"><ShieldCheck size={18} /> {copy.responsibility}</div><button className="button button-primary">{copy.save}</button></div></form></div>}

      {showDepartmentForm && <div className="platform-modal"><form className="platform-modal-card" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        try {
          const name = String(data.get("name")); const parentId = String(data.get("parentId")) || null;
          if (editingDepartment) await organizationRepository.updateDepartment(editingDepartment.id, name, parentId);
          else await organizationRepository.addDepartment(organization.id, name, parentId);
          setShowDepartmentForm(false); setEditingDepartment(null); await refresh();
        } catch (error) { setMessage(error instanceof Error ? error.message : "Error"); }
      }}><div className="modal-head"><h2>{editingDepartment ? copy.editDepartment : copy.newDepartment}</h2><button type="button" onClick={() => { setShowDepartmentForm(false); setEditingDepartment(null); }}>×</button></div><div className="platform-form"><label><span>{copy.departmentName}</span><input name="name" defaultValue={editingDepartment?.name ?? ""} required /></label><label><span>{copy.parentDepartment}</span><select name="parentId" value={departmentParentId ?? ""} onChange={(event) => setDepartmentParentId(event.target.value || null)}><option value="">{copy.rootLevel}</option>{workspace.departments.filter((item) => item.id !== editingDepartment?.id).map((item) => <option key={item.id} value={item.id}>{departmentPath(item, workspace.departments)}</option>)}</select></label><button className="button button-primary">{copy.save}</button></div></form></div>}
    </main>
  );
}

function departmentPath(department: OrganizationDepartment, all: OrganizationDepartment[]) {
  const names = [department.name];
  let parentId = department.parentId;
  const visited = new Set<string>([department.id]);
  while (parentId && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = all.find((item) => item.id === parentId);
    if (!parent) break;
    names.unshift(parent.name);
    parentId = parent.parentId;
  }
  return names.join(" / ");
}

function DepartmentTree({
  departments,
  employees,
  selectedId,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  parentId = null,
  depth = 0
}: {
  departments: OrganizationDepartment[];
  employees: OrganizationEmployee[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: (parentId: string) => void;
  onEdit: (department: OrganizationDepartment) => void;
  onDelete: (department: OrganizationDepartment) => void;
  parentId?: string | null;
  depth?: number;
}) {
  const children = departments.filter((item) => item.parentId === parentId);
  if (!children.length) return null;
  return <div className={depth ? "org-structure-children" : "org-structure-tree"}>
    {children.map((department) => {
      const count = employees.filter((item) => item.departmentId === department.id).length;
      return <div className="org-structure-node" key={department.id}>
        <div className={selectedId === department.id ? "org-structure-row active" : "org-structure-row"}>
          <button className="org-structure-select" onClick={() => onSelect(department.id)}><ChevronRight size={14} /><FolderTree size={16} /><span>{department.name}</span><b>{count}</b></button>
          <div className="org-structure-actions">
            <button title="Add" onClick={() => onAdd(department.id)}><Plus size={13} /></button>
            <button title="Edit" onClick={() => onEdit(department)}><Edit3 size={13} /></button>
            <button title="Delete" onClick={() => onDelete(department)}><X size={13} /></button>
          </div>
        </div>
        <DepartmentTree departments={departments} employees={employees} selectedId={selectedId} onSelect={onSelect} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} parentId={department.id} depth={depth + 1} />
      </div>;
    })}
  </div>;
}

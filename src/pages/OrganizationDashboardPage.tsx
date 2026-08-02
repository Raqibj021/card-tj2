import {
  Building2, ChevronRight, Copy, Download, Edit3, ExternalLink, FolderTree, Network, Plus, QrCode,
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

const employeePublicUrl = (slug: string) => {
  return publicSiteUrl(`/card/${slug}`);
};

const compressImage = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = reject;
  reader.onload = () => {
    const image = new Image();
    image.onerror = reject;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 720 / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");
      if (!context) return reject(new Error("Canvas unavailable"));
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/webp", 0.8));
    };
    image.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

async function employeeValues(form: HTMLFormElement, organizationId: string, existing?: OrganizationEmployee) {
  const data = new FormData(form);
  const photoFile = data.get("photo"); const logoFile = data.get("companyLogo");
  return {
    organizationId, name: String(data.get("name")), position: String(data.get("position")),
    phone: String(data.get("phone")), whatsapp: String(data.get("whatsapp")),
    departmentId: String(data.get("departmentId")) || null,
    secondPhone: String(data.get("secondPhone")), email: String(data.get("email")),
    website: String(data.get("website")), address: String(data.get("address")),
    telegram: String(data.get("telegram")), instagram: String(data.get("instagram")),
    facebook: String(data.get("facebook")), description: String(data.get("description")),
    language: String(data.get("language") || "ru"), theme: String(data.get("theme") || "teal"),
    template: String(data.get("template") || "executive"),
    photo: photoFile instanceof File && photoFile.size ? await compressImage(photoFile) : existing?.photo ?? "",
    companyLogo: logoFile instanceof File && logoFile.size ? await compressImage(logoFile) : existing?.companyLogo ?? ""
  };
}

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
  const [showOrganizationChooser, setShowOrganizationChooser] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<OrganizationEmployee | null>(null);
  const [message, setMessage] = useState("");
  const [savingEmployee, setSavingEmployee] = useState(false);
  const copy = {
    ru: { workspace: "Рабочее пространство", add: "Создать визитку сотрудника", staff: "Сотрудники", departments: "Структура", scans: "Общий QR", plan: "Тарифы", manage: "Управление", search: "Поиск сотрудника", person: "Сотрудник", position: "Должность", department: "Подразделение", status: "Статус", card: "Цифровая визитка", invited: "Приглашён", active: "Активен", review: "На проверке", shared: "Общий QR организации", sharedTitle: "Один код для всей структуры", sharedText: "QR открывает страницу организации с деревом подразделений, поиском и действующими визитками сотрудников.", download: "Скачать QR", copy: "Копировать ссылку", openPublic: "Открыть общую страницу", openCard: "Открыть визитку", cardQr: "Скачать QR визитки", noOrg: "Рабочий кабинет пока недоступен", register: "Посмотреть статус заявки", newDepartment: "Новое подразделение", departmentName: "Название подразделения", parentDepartment: "Входит в структуру", rootLevel: "Верхний уровень", save: "Сохранить изменения", fullName: "ФИО *", phone: "Телефон *", email: "Email", invite: "Создать и активировать", inviteInfo: "Визитка сотрудника активируется сразу в рамках тарифа организации. Отдельный аккаунт и приглашение не требуются.", responsibility: "Уполномоченное лицо организации отвечает за достоверность данных сотрудников и может в любой момент исправить их визитки.", allEmployees: "Все сотрудники", editDepartment: "Редактировать подразделение", deleteDepartment: "Удалить подразделение", moveEmployee: "Изменить визитку сотрудника", revoke: "Удалить", emptyStructure: "Создайте структуру любой глубины: факультет → кафедра → сектор или департамент → отдел → группа.", organizationAccount: "Аккаунт организации", logout: "Выйти", limitReached: "Лимит сотрудников исчерпан. Для добавления нового сотрудника перейдите на другой тариф.", tariffs: "Посмотреть тарифы" },
    tj: { workspace: "Фазои корӣ", add: "Сохтани варақаи корманд", staff: "Кормандон", departments: "Сохтор", scans: "QR-и умумӣ", plan: "Тарофаҳо", manage: "Идоракунӣ", search: "Ҷустуҷӯи корманд", person: "Корманд", position: "Вазифа", department: "Воҳиди сохторӣ", status: "Ҳолат", card: "Варақаи рақамӣ", invited: "Даъват шудааст", active: "Фаъол", review: "Дар санҷиш", shared: "QR-и умумии ташкилот", sharedTitle: "Як рамз барои тамоми сохтор", sharedText: "QR саҳифаи ташкилотро бо дарахти сохтор, ҷустуҷӯ ва варақаҳои фаъоли кормандон мекушояд.", download: "Боргирии QR", copy: "Нусхаи пайванд", openPublic: "Кушодани саҳифаи умумӣ", openCard: "Кушодани варақа", cardQr: "Боргирии QR-и варақа", noOrg: "Кабинети корӣ ҳоло дастрас нест", register: "Дидани ҳолати дархост", newDepartment: "Воҳиди нав", departmentName: "Номи воҳид", parentDepartment: "Дар дохили", rootLevel: "Сатҳи болоӣ", save: "Нигоҳ доштани тағйирот", fullName: "Ному насаб *", phone: "Телефон *", email: "Email", invite: "Сохтан ва фаъол кардан", inviteInfo: "Варақаи корманд фавран дар доираи тарофаи ташкилот фаъол мешавад. Ҳисоби алоҳида ва даъват лозим нест.", responsibility: "Шахси ваколатдор барои дурустии маълумот ҷавобгар аст ва метавонад варақаҳоро ҳар вақт ислоҳ кунад.", allEmployees: "Ҳамаи кормандон", editDepartment: "Тағйири воҳид", deleteDepartment: "Нест кардани воҳид", moveEmployee: "Тағйири варақаи корманд", revoke: "Нест кардан", emptyStructure: "Сохтори дилхоҳ созед: факултет → кафедра → бахш ё департамент → шуъба → сектор.", organizationAccount: "Ҳисоби ташкилот", logout: "Баромадан", limitReached: "Лимити кормандон пур шуд. Барои иловаи корманди нав тарофаро иваз кунед.", tariffs: "Дидани тарофаҳо" },
    en: { workspace: "Workspace", add: "Create employee card", staff: "Employees", departments: "Structure", scans: "Shared QR", plan: "Plans", manage: "Management", search: "Search employee", person: "Employee", position: "Position", department: "Structure unit", status: "Status", card: "Digital card", invited: "Invited", active: "Active", review: "Under review", shared: "Organization shared QR", sharedTitle: "One code for the entire structure", sharedText: "The QR opens a branded directory with a structure tree, search and active employee cards.", download: "Download QR", copy: "Copy link", openPublic: "Open public page", openCard: "Open card", cardQr: "Download card QR", noOrg: "The workspace is not available yet", register: "View application status", newDepartment: "New structure unit", departmentName: "Unit name", parentDepartment: "Inside", rootLevel: "Top level", save: "Save changes", fullName: "Full name *", phone: "Phone *", email: "Email", invite: "Create and activate", inviteInfo: "The employee card becomes active immediately within the organization plan. No separate account or invitation is required.", responsibility: "The authorized manager is responsible for employee data and can update cards at any time.", allEmployees: "All employees", editDepartment: "Edit structure unit", deleteDepartment: "Delete structure unit", moveEmployee: "Edit employee card", revoke: "Delete", emptyStructure: "Build any hierarchy: faculty → department → sector or division → team → group.", organizationAccount: "Organization account", logout: "Sign out", limitReached: "The employee limit has been reached. Upgrade the plan to add another employee.", tariffs: "View plans" }
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
      if (!organizationId && list.length > 1) {
        setWorkspace(null);
        setShowOrganizationChooser(true);
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
  const employees = useMemo(() => (workspace?.employees ?? []).filter((item) => {
    const haystack = `${item.name} ${item.position} ${item.department}`.toLocaleLowerCase();
    const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return words.every((word) => haystack.includes(word));
  }), [workspace, query]);
  const departmentEmployees = useMemo(() => (workspace?.employees ?? []).filter((item) =>
    selectedDepartmentId && item.departmentId && descendantIds.has(item.departmentId)
  ), [workspace, selectedDepartmentId, descendantIds]);

  if (loading) return <main className="route-loading"><span /><p>...</p></main>;
  if (showOrganizationChooser && organizations.length > 1) return <main className="org-dashboard-page org-organization-choice"><section><Building2 size={32} /><span className="section-label">VIZORA.TJ</span><h1>{language === "tj" ? "Ташкилотро интихоб кунед" : language === "en" ? "Choose an organization" : "Выберите организацию"}</h1><p>{language === "tj" ? "Барои кушодани сохтор ташкилоти лозимаро интихоб кунед." : language === "en" ? "Select the organization whose structure you want to open." : "Выберите организацию, структуру которой хотите открыть."}</p><div>{organizations.map((item) => <button type="button" key={item.id} onClick={() => { setShowOrganizationChooser(false); setSelectedOrganizationId(item.id); void refresh(item.id); }}><Building2 size={20} /><span>{item.displayName}</span><ChevronRight size={18} /></button>)}</div></section></main>;
  if (!workspace) return <main className="card-missing"><div className="empty-state"><Building2 size={32} /><h1>{copy.noOrg}</h1><Link className="button button-primary" to="/organization/apply">{copy.register}</Link></div></main>;

  const organization = workspace.organization;
  const limitReached = workspace.employees.length >= organization.employeeLimit;
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
          <div className="org-workspace-actions">{organizations.length < 2 && <Link className="button button-secondary" to="/organization/apply?new=1"><Plus size={17} /> {language === "tj" ? "Иловаи ташкилот" : language === "en" ? "Add organization" : "Добавить организацию"}</Link>}<button className="button button-secondary" onClick={() => { setEditingDepartment(null); setDepartmentParentId(selectedDepartmentId); setShowDepartmentForm(true); }}><Network size={17} /> {copy.newDepartment}</button>{limitReached ? <Link className="button button-primary" to="/organization/apply"><Building2 size={17} /> {copy.tariffs}</Link> : <button className="button button-primary" onClick={() => setShowEmployeeForm(true)}><Plus size={17} /> {copy.add}</button>}</div>
        </div>
        {message && <div className="admin-notice mt-5"><ShieldCheck size={18} /><span>{message}</span></div>}
        <div className="org-workspace-stats">
          <article><Users size={21} /><div><strong>{workspace.employees.length} / {organization.employeeLimit}</strong><span>{copy.staff}</span></div></article>
          <article><Network size={21} /><div><strong>{workspace.departments.length}</strong><span>{copy.departments}</span></div></article>
          <article><QrCode size={21} /><div><strong>1</strong><span>{copy.scans}</span></div></article>
          <article><ShieldCheck size={21} /><div><strong>{organization.planCode || "—"}</strong><span>{copy.plan}</span></div></article>
        </div>
        <div className="org-directory-search"><Search size={20} /><div><strong>{copy.search}</strong><span>{language === "tj" ? "Бо ному насаб, вазифа ё сохтор" : language === "en" ? "By name, position or structure" : "По ФИО, должности или подразделению"}</span></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} /></div>
        {limitReached && <div className="admin-notice mt-5"><ShieldCheck size={18} /><span>{copy.limitReached}</span><Link className="button button-secondary" to="/organization/apply">{copy.tariffs}</Link></div>}
        <div className="org-workspace-grid">
          <aside className="org-sidebar org-structure-sidebar">
            <strong>{copy.departments}</strong>
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
          <section className="org-content-panel org-structure-guide"><Network size={32} /><h2>{language === "tj" ? "Сохтори ташкилот" : language === "en" ? "Organization structure" : "Структура организации"}</h2><p>{language === "tj" ? "Барои дидани кормандон яке аз воҳидҳои сохториро интихоб кунед." : language === "en" ? "Select a structure unit to view its employees." : "Нажмите на подразделение слева, чтобы увидеть его сотрудников."}</p></section>
        </div>
        <section className="org-qr-panel" id="organization-qr">
          <div className="org-qr-preview"><QRCodeImage value={url} size={220} /></div>
          <div><span className="section-label">{copy.shared}</span><h2>{copy.sharedTitle}</h2><p>{copy.sharedText}</p><div className="flex flex-wrap gap-2"><a className="button button-light" href={url} target="_blank" rel="noreferrer"><ExternalLink size={17} /> {copy.openPublic}</a><button className="button button-primary" onClick={() => void downloadQrCode(url, organization.slug || "organization")}><Download size={17} /> {copy.download}</button><button className="button button-dark-outline" onClick={async () => { await navigator.clipboard.writeText(url); setMessage(copy.copy); }}><Copy size={17} /> {copy.copy}</button></div></div>
        </section>
      </div>

      {query.trim() && <div className="platform-modal" onMouseDown={() => setQuery("")}><section className="platform-modal-card org-employee-directory-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="section-label">{copy.search}</span><h2>{language === "tj" ? "Натиҷаҳои ҷустуҷӯ" : language === "en" ? "Search results" : "Результаты поиска"}</h2></div><button type="button" onClick={() => setQuery("")}>×</button></div><label className="org-modal-search"><Search size={17} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} /></label><EmployeeDirectoryList employees={employees} copy={copy} onOpen={(item) => item.cardSlug && window.open(employeePublicUrl(item.cardSlug), "_blank", "noopener,noreferrer")} onEdit={setEditingEmployee} onRemove={async (item) => { if (!window.confirm(item.name)) return; await organizationRepository.removeEmployee(item.id); await refresh(); }} /></section></div>}

      {selectedDepartmentId && <div className="platform-modal" onMouseDown={() => setSelectedDepartmentId(null)}><section className="platform-modal-card org-employee-directory-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="section-label">{copy.departments}</span><h2>{workspace.departments.find((item) => item.id === selectedDepartmentId)?.name}</h2></div><button type="button" onClick={() => setSelectedDepartmentId(null)}>×</button></div>{departmentEmployees.length ? <EmployeeDirectoryList employees={departmentEmployees} copy={copy} onOpen={(item) => item.cardSlug && window.open(employeePublicUrl(item.cardSlug), "_blank", "noopener,noreferrer")} onEdit={setEditingEmployee} onRemove={async (item) => { if (!window.confirm(item.name)) return; await organizationRepository.removeEmployee(item.id); await refresh(); }} /> : <div className="org-department-empty"><Users size={28} /><h3>{language === "tj" ? "Дар ин воҳид ҳоло корманд нест" : language === "en" ? "No employees in this unit yet" : "В этом подразделении пока нет сотрудников"}</h3><button className="button button-primary" onClick={() => setShowEmployeeForm(true)}><Plus size={17} /> {copy.add}</button></div>}</section></div>}

      {showEmployeeForm && <div className="platform-modal"><form className="platform-modal-card" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (savingEmployee) return;
        setSavingEmployee(true); setMessage("");
        try { await organizationRepository.createEmployee(await employeeValues(event.currentTarget, organization.id)); setMessage(copy.active); setShowEmployeeForm(false); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Error"); } finally { setSavingEmployee(false); }
      }}><div className="modal-head"><div><span className="section-label">{copy.card}</span><h2>{copy.add}</h2></div><button type="button" onClick={() => setShowEmployeeForm(false)}>×</button></div><EmployeeFields copy={copy} departments={workspace.departments} defaultDepartmentId={selectedDepartmentId} /><div className="modal-note"><ShieldCheck size={18} /> {copy.inviteInfo}</div><button className="button button-primary button-large"><Plus size={18} /> {copy.invite}</button></form></div>}

      {editingEmployee && <div className="platform-modal"><form className="platform-modal-card" onSubmit={async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
          const values = await employeeValues(event.currentTarget, organization.id, editingEmployee);
          await organizationRepository.updateEmployee({
            assignmentId: editingEmployee.id,
            ...values
          });
          setEditingEmployee(null);
          await refresh();
        }
        catch (error) { setMessage(error instanceof Error ? error.message : "Error"); }
      }}><div className="modal-head"><h2>{copy.moveEmployee}</h2><button type="button" onClick={() => setEditingEmployee(null)}>×</button></div><EmployeeFields copy={copy} departments={workspace.departments} employee={editingEmployee} /><div className="modal-note"><ShieldCheck size={18} /> {copy.responsibility}</div><button className="button button-primary">{copy.save}</button></form></div>}

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

function EmployeeDirectoryList({ employees, copy, onOpen, onEdit, onRemove }: {
  employees: OrganizationEmployee[];
  copy: Record<string, string>;
  onOpen: (employee: OrganizationEmployee) => void;
  onEdit: (employee: OrganizationEmployee) => void;
  onRemove: (employee: OrganizationEmployee) => void | Promise<void>;
}) {
  if (!employees.length) return <div className="org-department-empty"><Search size={26} /><h3>{copy.staff}: 0</h3></div>;
  return <div className="org-employee-directory-list">{employees.map((item) => <article key={item.id}>
    {item.photo ? <img src={item.photo} alt="" /> : <span>{item.name[0]}</span>}
    <div><strong>{item.name}</strong><small>{item.position}</small><em><Network size={12} />{item.department}</em></div>
    <div className="employee-actions">
      {item.cardSlug && <button title={copy.openCard} onClick={() => onOpen(item)}><ExternalLink size={16} /></button>}
      <button title={copy.moveEmployee} onClick={() => onEdit(item)}><Edit3 size={16} /></button>
      <button title={copy.revoke} onClick={() => void onRemove(item)}><Trash2 size={16} /></button>
    </div>
  </article>)}</div>;
}

function EmployeeFields({ copy, departments, employee, defaultDepartmentId }: {
  copy: Record<string, string>; departments: OrganizationDepartment[]; employee?: OrganizationEmployee; defaultDepartmentId?: string | null;
}) {
  return <div className="platform-form employee-card-form">
    <div className="form-grid">
      <label><span>{copy.fullName}</span><input name="name" defaultValue={employee?.name ?? ""} minLength={3} required /></label>
      <label><span>{copy.position} *</span><input name="position" defaultValue={employee?.position ?? ""} minLength={2} required /></label>
    </div>
    <div className="form-grid">
      <label><span>{copy.phone}</span><input name="phone" type="tel" inputMode="tel" pattern="\+?992[0-9]{9}" placeholder="+992900000000" defaultValue={employee?.phone ?? ""} required /></label>
      <label><span>WhatsApp *</span><input name="whatsapp" type="tel" inputMode="tel" pattern="\+?992[0-9]{9}" placeholder="+992900000000" defaultValue={employee?.whatsapp ?? ""} required /></label>
    </div>
    <div className="form-grid">
      <label><span>Второй телефон</span><input name="secondPhone" type="tel" inputMode="tel" pattern="\+?992[0-9]{9}" placeholder="+992900000000" defaultValue={employee?.secondPhone ?? ""} /></label>
      <label><span>{copy.email}</span><input name="email" type="email" defaultValue={employee?.email ?? ""} /></label>
    </div>
    <label><span>{copy.department}</span><select name="departmentId" defaultValue={employee?.departmentId ?? defaultDepartmentId ?? ""}><option value="">—</option>{departments.map((item) => <option key={item.id} value={item.id}>{departmentPath(item, departments)}</option>)}</select></label>
    <label><span>Краткое описание</span><textarea name="description" maxLength={240} defaultValue={employee?.description ?? ""} /></label>
    <div className="form-grid">
      <label><span>Сайт</span><input name="website" type="url" placeholder="https://" defaultValue={employee?.website ?? ""} /></label>
      <label><span>Адрес</span><input name="address" defaultValue={employee?.address ?? ""} /></label>
    </div>
    <div className="form-grid employee-social-grid">
      <label><span>Telegram</span><input name="telegram" placeholder="@username" defaultValue={employee?.telegram ?? ""} /></label>
      <label><span>Instagram</span><input name="instagram" placeholder="@profile" defaultValue={employee?.instagram ?? ""} /></label>
      <label><span>Facebook</span><input name="facebook" placeholder="profile" defaultValue={employee?.facebook ?? ""} /></label>
    </div>
    <div className="form-grid">
      <label><span>Фотография</span><input name="photo" type="file" accept="image/*" /></label>
      <label><span>Логотип компании</span><input name="companyLogo" type="file" accept="image/*" /></label>
    </div>
    <div className="form-grid employee-style-grid">
      <label><span>Язык</span><select name="language" defaultValue={employee?.language ?? "ru"}><option value="ru">Русский</option><option value="tj">Тоҷикӣ</option><option value="en">English</option></select></label>
      <label><span>Цвет</span><select name="theme" defaultValue={employee?.theme ?? "teal"}><option value="teal">Teal</option><option value="blue">Blue</option><option value="violet">Violet</option><option value="graphite">Graphite</option><option value="amber">Amber</option></select></label>
      <label><span>Шаблон</span><select name="template" defaultValue={employee?.template ?? "executive"}><option value="executive">Деловой</option><option value="minimal">Минимал</option><option value="creative">Креативный</option></select></label>
    </div>
  </div>;
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
      const nestedIds = new Set<string>([department.id]);
      let expanded = true;
      while (expanded) {
        expanded = false;
        departments.forEach((item) => {
          if (item.parentId && nestedIds.has(item.parentId) && !nestedIds.has(item.id)) { nestedIds.add(item.id); expanded = true; }
        });
      }
      const count = employees.filter((item) => item.departmentId && nestedIds.has(item.departmentId)).length;
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

import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ChevronDown,
  Mail,
  MapPin,
  Network,
  Phone,
  QrCode,
  Search,
  ShieldCheck,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import BrandLogo from "../components/BrandLogo";
import QRCodeImage from "../components/QRCode";
import { useApp } from "../context/AppContext";
import { sanitizePhone } from "../lib/cardUtils";
import { publicSiteUrl } from "../lib/siteUrl";
import { supabase } from "../lib/supabase";

interface PublicOrganization {
  organization: { name: string; description: string; logo: string; phone: string; email: string; address: string };
  departments: Array<{ id: string; name: string; parentId: string | null }>;
  employees: Array<{ id: string; name: string; position: string; departmentId: string | null; slug: string; photo: string }>;
}

type PublicCopy = {
  missing: string;
  verified: string;
  directory: string;
  viewOnly: string;
  departments: string;
  employees: string;
  title: string;
  subtitle: string;
  search: string;
  all: string;
  common: string;
  open: string;
  empty: string;
  emptyDepartment: string;
  registry: string;
  published: string;
  scroll: string;
  structure: string;
  sharedQr: string;
  sharedQrHint: string;
};

export default function OrganizationPublicPage() {
  const { slug = "" } = useParams();
  const { language } = useApp();
  const [data, setData] = useState<PublicOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const copy: PublicCopy = {
    ru: {
      missing: "Организация не найдена",
      verified: "Профиль подтверждён",
      directory: "Официальный цифровой профиль",
      viewOnly: "Публичный просмотр",
      departments: "Подразделения",
      employees: "Сотрудники",
      title: "Структура и деловые контакты",
      subtitle: "Найдите подразделение или откройте цифровую визитку нужного сотрудника.",
      search: "ФИО или должность",
      all: "Вся структура",
      common: "Общие контакты",
      open: "Открыть визитку",
      empty: "По вашему запросу сотрудники не найдены",
      emptyDepartment: "Опубликованных сотрудников пока нет",
      registry: "Официальный справочник организации",
      published: "Данные опубликованы организацией",
      scroll: "Перейти к структуре",
      structure: "Структура",
      sharedQr: "Общий QR-код",
      sharedQrHint: "Вся структура организации"
    },
    tj: {
      missing: "Ташкилот ёфт нашуд",
      verified: "Профил тасдиқ шудааст",
      directory: "Профили расмии рақамӣ",
      viewOnly: "Намоиши умумӣ",
      departments: "Шуъбаҳо",
      employees: "Кормандон",
      title: "Сохтор ва тамосҳои корӣ",
      subtitle: "Шуъбаро пайдо кунед ё варақаи рақамии корманди лозимаро кушоед.",
      search: "Ному насаб ё вазифа",
      all: "Тамоми сохтор",
      common: "Тамосҳои умумӣ",
      open: "Кушодани варақа",
      empty: "Аз рӯи дархости шумо корманд ёфт нашуд",
      emptyDepartment: "Ҳоло корманди нашршуда нест",
      registry: "Маълумотномаи расмии ташкилот",
      published: "Маълумот аз ҷониби ташкилот нашр шудааст",
      scroll: "Гузариш ба сохтор",
      structure: "Сохтор",
      sharedQr: "QR-коди умумӣ",
      sharedQrHint: "Тамоми сохтори ташкилот"
    },
    en: {
      missing: "Organization not found",
      verified: "Verified profile",
      directory: "Official digital profile",
      viewOnly: "Public view",
      departments: "Departments",
      employees: "Employees",
      title: "Structure and business contacts",
      subtitle: "Find a department or open the digital card of the person you need.",
      search: "Name or position",
      all: "Entire structure",
      common: "General contacts",
      open: "Open business card",
      empty: "No employees match your request",
      emptyDepartment: "No published employees yet",
      registry: "Official organization directory",
      published: "Information published by the organization",
      scroll: "View organization structure",
      structure: "Structure",
      sharedQr: "Shared QR code",
      sharedQrHint: "The entire organization structure"
    }
  }[language];

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) { setLoadError(copy.missing); setLoading(false); }
    }, 12000);
    void Promise.resolve(supabase.rpc("get_public_organization", { target_slug: slug }))
      .then(({ data: result, error }) => {
        if (!active) return;
        if (error) setLoadError(error.message);
        else setData(result as PublicOrganization | null);
      })
      .catch(() => { if (active) setLoadError(copy.missing); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.clearTimeout(timer); };
  }, [slug]);

  const visibleDepartmentIds = useMemo(() => {
    if (!data || !departmentId) return null;
    const result = new Set<string>([departmentId]);
    let changed = true;
    while (changed) {
      changed = false;
      data.departments.forEach((item) => {
        if (item.parentId && result.has(item.parentId) && !result.has(item.id)) { result.add(item.id); changed = true; }
      });
    }
    return result;
  }, [data, departmentId]);

  const employees = useMemo(() => (data?.employees ?? []).filter((item) =>
    `${item.name} ${item.position}`.toLowerCase().includes(query.trim().toLowerCase())
    && (!visibleDepartmentIds || (!!item.departmentId && visibleDepartmentIds.has(item.departmentId)))
  ), [data, query, visibleDepartmentIds]);

  if (loading) return <main className="route-loading"><span /><p>...</p></main>;
  if (!data) return <main className="card-missing"><BrandLogo /><div className="empty-state"><Building2 size={30} /><h1>{copy.missing}</h1>{loadError && <p>{loadError}</p>}</div></main>;

  const description = publicDescription(data.organization.description);
  const organizationMark = initials(data.organization.name);
  const employeePhotos = data.employees.filter((employee) => employee.photo).slice(0, 3);
  const isFiltering = Boolean(query.trim() || departmentId);
  const organizationUrl = publicSiteUrl(`/organization/${slug}`);

  return <main className="organization-public-page">
    <section className="org-public-hero">
      <div className="org-public-orb org-public-orb-one" />
      <div className="org-public-orb org-public-orb-two" />
      <div className="site-container org-public-hero-grid">
        <div className="org-public-identity org-public-reveal">
          <div className="org-public-heading-row">
            {data.organization.logo
              ? <img className="org-public-emblem" src={data.organization.logo} alt="" />
              : <div className="org-public-emblem org-public-monogram" aria-hidden="true">{organizationMark}</div>}
            <div>
              <span className="org-public-kicker">{copy.directory}</span>
              <span className="org-public-verified"><BadgeCheck size={15} /> {copy.verified}</span>
            </div>
          </div>
          <div className="org-public-title-row">
            <h1>{data.organization.name}</h1>
            <div className="org-public-title-qr" aria-label={copy.sharedQr}>
              <div><QRCodeImage value={organizationUrl} size={142} /></div>
              <span><QrCode size={14} /> {copy.sharedQr}</span>
              <small>{copy.sharedQrHint}</small>
            </div>
          </div>
          {description && <p className="org-public-description">{description}</p>}
          <div className="org-public-contacts">
            {data.organization.phone && <a href={`tel:${sanitizePhone(data.organization.phone)}`}><Phone size={16} /><span>{data.organization.phone}</span><ArrowUpRight size={14} /></a>}
            {data.organization.email && <a href={`mailto:${data.organization.email}`}><Mail size={16} /><span>{data.organization.email}</span><ArrowUpRight size={14} /></a>}
            {data.organization.address && <span><MapPin size={16} /><span>{data.organization.address}</span></span>}
          </div>
        </div>

        <aside className="org-public-overview org-public-reveal org-public-delay-one" aria-label={copy.registry}>
          <header>
            <div className="org-public-overview-icon"><Network size={21} /></div>
            <div><span>{copy.registry}</span><small>{copy.published}</small></div>
            <div className="org-public-readonly"><ShieldCheck size={14} /> {copy.viewOnly}</div>
          </header>
          <div className="org-public-stat-grid">
            <article><strong>{formatCount(data.departments.length)}</strong><span>{copy.departments}</span></article>
            <article><strong>{formatCount(data.employees.length)}</strong><span>{copy.employees}</span></article>
          </div>
          <footer>
            <div className="org-public-avatar-stack" aria-hidden="true">
              {employeePhotos.map((employee) => <img key={employee.id || employee.slug} src={employee.photo} alt="" />)}
              {employeePhotos.length === 0 && <><span>{organizationMark[0] || "V"}</span><span><Users size={15} /></span></>}
            </div>
            <div className="org-public-live-status"><i />{copy.verified}</div>
          </footer>
        </aside>
      </div>
      <a className="org-public-scroll" href="#organization-directory" aria-label={copy.scroll}><ChevronDown size={19} /></a>
    </section>

    <section className="org-public-directory" id="organization-directory">
      <div className="site-container">
        <header className="org-public-directory-head org-public-reveal">
          <div>
            <span className="org-public-section-label"><Users size={15} /> {copy.employees}</span>
            <h2>{copy.title}</h2>
            <p>{copy.subtitle}</p>
          </div>
          <div className="org-public-filters">
            <label className="org-public-search">
              <Search size={18} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} aria-label={copy.search} />
            </label>
            <label className="org-public-select">
              <Network size={17} />
              <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} aria-label={copy.all}>
                <option value="">{copy.all}</option>
                {data.departments.map((item) => <option key={item.id} value={item.id}>{departmentPath(item, data.departments)}</option>)}
              </select>
              <ChevronDown size={16} />
            </label>
          </div>
        </header>

        {isFiltering ? <EmployeeGrid employees={employees} departments={data.departments} copy={copy} /> : <>
          {employees.some((item) => !item.departmentId) && <section className="org-public-department org-public-reveal">
            <DepartmentHeader name={copy.common} count={employees.filter((item) => !item.departmentId).length} index={0} label={copy.structure} />
            <EmployeeGrid employees={employees.filter((item) => !item.departmentId)} departments={data.departments} copy={copy} />
          </section>}
          <PublicDepartmentTree departments={data.departments} employees={employees.filter((item) => item.departmentId)} copy={copy} />
        </>}
      </div>
    </section>
  </main>;
}

function EmployeeGrid({ employees, departments, copy }: { employees: PublicOrganization["employees"]; departments: PublicOrganization["departments"]; copy: PublicCopy }) {
  if (!employees.length) return <div className="org-public-empty"><Search size={20} /><span>{copy.empty}</span></div>;
  return <div className="org-public-employee-grid">{employees.map((employee, index) => {
    const department = departments.find((item) => item.id === employee.departmentId);
    return <article className="org-public-employee org-public-reveal" style={{ animationDelay: `${Math.min(index, 6) * 55}ms` }} key={employee.id || employee.slug}>
      <Link to={`/card/${employee.slug}`} aria-label={`${copy.open}: ${employee.name}`}>
        <div className="org-public-employee-top">
          {employee.photo
            ? <img className="org-public-employee-avatar" src={employee.photo} alt={employee.name} loading="lazy" />
            : <div className="org-public-employee-avatar org-public-employee-initials">{initials(employee.name)}</div>}
          <span className="org-public-card-arrow"><ArrowUpRight size={17} /></span>
        </div>
        <div className="org-public-employee-body">
          <h3>{employee.name}</h3>
          <p>{employee.position}</p>
        </div>
        <footer><span>{department ? departmentPath(department, departments) : copy.common}</span><strong>{copy.open}<ArrowUpRight size={13} /></strong></footer>
      </Link>
    </article>;
  })}</div>;
}

function DepartmentHeader({ name, count, index, label }: { name: string; count: number; index: number; label: string }) {
  return <header className="org-public-department-head">
    <span className="org-public-department-number">{String(index + 1).padStart(2, "0")}</span>
    <div><span>{label}</span><h3>{name}</h3></div>
    <strong><Users size={15} />{count}</strong>
  </header>;
}

function PublicDepartmentTree({ departments, employees, copy, parentId = null, depth = 0 }: { departments: PublicOrganization["departments"]; employees: PublicOrganization["employees"]; copy: PublicCopy; parentId?: string | null; depth?: number }) {
  const children = departments.filter((item) => item.parentId === parentId);
  if (!children.length) return parentId === null && employees.length ? <EmployeeGrid employees={employees} departments={departments} copy={copy} /> : null;
  return <div className={depth ? "org-public-subdepartments" : "org-public-department-list"}>{children.map((department, index) => {
    const nested = descendantIds(department.id, departments);
    const directEmployees = employees.filter((item) => item.departmentId === department.id);
    const total = employees.filter((item) => item.departmentId && nested.has(item.departmentId)).length;
    return <section className="org-public-department org-public-reveal" style={{ animationDelay: `${Math.min(index, 5) * 70}ms` }} key={department.id}>
      <DepartmentHeader name={department.name} count={total} index={index} label={copy.structure} />
      {directEmployees.length > 0
        ? <EmployeeGrid employees={directEmployees} departments={departments} copy={copy} />
        : !departments.some((item) => item.parentId === department.id) && <p className="org-public-department-empty">{copy.emptyDepartment}</p>}
      <PublicDepartmentTree departments={departments} employees={employees} copy={copy} parentId={department.id} depth={depth + 1} />
    </section>;
  })}</div>;
}

function publicDescription(value: string) {
  const description = value?.trim();
  if (!description) return "";
  try {
    const parsed = JSON.parse(description) as Record<string, unknown>;
    const publicValue = parsed.publicDescription ?? parsed.description;
    return typeof publicValue === "string" ? publicValue.trim() : "";
  } catch {
    return description;
  }
}

function initials(value: string) {
  const words = value.replace(/[«»"'“”„()[\].,]/g, " ").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "V";
}

function formatCount(value: number) {
  return String(value).padStart(2, "0");
}

function descendantIds(id: string, departments: PublicOrganization["departments"]) {
  const result = new Set<string>([id]); let changed = true;
  while (changed) { changed = false; departments.forEach((item) => { if (item.parentId && result.has(item.parentId) && !result.has(item.id)) { result.add(item.id); changed = true; } }); }
  return result;
}

function departmentPath(department: PublicOrganization["departments"][number], all: PublicOrganization["departments"]) {
  const names = [department.name]; const seen = new Set([department.id]); let parentId = department.parentId;
  while (parentId && !seen.has(parentId)) { seen.add(parentId); const parent = all.find((item) => item.id === parentId); if (!parent) break; names.unshift(parent.name); parentId = parent.parentId; }
  return names.join(" / ");
}

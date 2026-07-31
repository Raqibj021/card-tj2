import { Building2, Mail, MapPin, Network, Phone, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import BrandLogo from "../components/BrandLogo";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";

interface PublicOrganization {
  organization: { name: string; description: string; logo: string; phone: string; email: string; address: string };
  departments: Array<{ id: string; name: string; parentId: string | null }>;
  employees: Array<{ id: string; name: string; position: string; departmentId: string | null; slug: string; photo: string }>;
}

export default function OrganizationPublicPage() {
  const { slug = "" } = useParams();
  const { language } = useApp();
  const [data, setData] = useState<PublicOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const copy = {
    ru: { missing: "Организация не найдена", verified: "Подтверждённая организация", employees: "Сотрудники", title: "Структура и контакты", search: "Поиск по ФИО или должности", all: "Вся структура", common: "Общие контакты", open: "Открыть визитку", empty: "Сотрудники не найдены" },
    tj: { missing: "Ташкилот ёфт нашуд", verified: "Ташкилоти тасдиқшуда", employees: "Кормандон", title: "Сохтор ва тамосҳо", search: "Ҷустуҷӯ бо ном ё вазифа", all: "Тамоми сохтор", common: "Тамосҳои умумӣ", open: "Кушодани варақа", empty: "Кормандон ёфт нашуданд" },
    en: { missing: "Organization not found", verified: "Verified organization", employees: "Employees", title: "Structure and contacts", search: "Search by name or position", all: "Entire structure", common: "General contacts", open: "Open card", empty: "No employees found" }
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
    `${item.name} ${item.position}`.toLowerCase().includes(query.toLowerCase())
    && (!visibleDepartmentIds || (!!item.departmentId && visibleDepartmentIds.has(item.departmentId)))
  ), [data, query, visibleDepartmentIds]);

  if (loading) return <main className="route-loading"><span /><p>...</p></main>;
  if (!data) return <main className="card-missing"><BrandLogo /><div className="empty-state"><Building2 size={30} /><h1>{copy.missing}</h1>{loadError && <p>{loadError}</p>}</div></main>;
  return <main className="organization-public-page">
    <header className="profile-toolbar"><Link to="/"><BrandLogo light /></Link></header>
    <section className="directory-hero"><div className="site-container py-14 text-center md:py-20">
      {data.organization.logo ? <img className="organization-public-logo" src={data.organization.logo} alt="" /> : <div className="organization-public-logo"><Building2 size={32} /></div>}
      <span className="section-label">{copy.verified}</span><h1>{data.organization.name}</h1><p>{data.organization.description}</p>
      <div className="organization-public-contacts">{data.organization.phone && <a href={`tel:${data.organization.phone}`}><Phone size={16} /> {data.organization.phone}</a>}{data.organization.email && <a href={`mailto:${data.organization.email}`}><Mail size={16} /> {data.organization.email}</a>}{data.organization.address && <span><MapPin size={16} /> {data.organization.address}</span>}</div>
    </div></section>
    <section className="section"><div className="site-container"><div className="platform-section-head"><div><span className="section-label"><Users size={15} /> {copy.employees}</span><h2>{copy.title}</h2></div><div className="organization-directory-filters"><label className="org-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} /></label><select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><option value="">{copy.all}</option>{data.departments.map((item) => <option key={item.id} value={item.id}>{departmentPath(item, data.departments)}</option>)}</select></div></div>
      {(query || departmentId) ? <EmployeeGrid employees={employees} openLabel={copy.open} emptyLabel={copy.empty} /> : <>
        {employees.some((item) => !item.departmentId) && <section className="public-structure-section">
          <header><Users size={18} /><h3>{copy.common}</h3><span>{employees.filter((item) => !item.departmentId).length}</span></header>
          <EmployeeGrid employees={employees.filter((item) => !item.departmentId)} openLabel={copy.open} emptyLabel={copy.empty} />
        </section>}
        <PublicDepartmentTree departments={data.departments} employees={employees.filter((item) => item.departmentId)} openLabel={copy.open} emptyLabel={copy.empty} />
      </>}
    </div></section>
  </main>;
}

function EmployeeGrid({ employees, openLabel, emptyLabel }: { employees: PublicOrganization["employees"]; openLabel: string; emptyLabel: string }) {
  if (!employees.length) return <div className="table-empty">{emptyLabel}</div>;
  return <div className="specialist-grid">{employees.map((employee) => <article className="specialist-card" key={employee.id || employee.slug}>{employee.photo ? <img className="specialist-avatar" src={employee.photo} alt="" /> : <div className="specialist-avatar specialist-avatar-blue">{employee.name[0]}</div>}<h3>{employee.name}</h3><p>{employee.position}</p><Link className="button button-secondary w-full" to={`/card/${employee.slug}`}>{openLabel}</Link></article>)}</div>;
}

function PublicDepartmentTree({ departments, employees, openLabel, emptyLabel, parentId = null }: { departments: PublicOrganization["departments"]; employees: PublicOrganization["employees"]; openLabel: string; emptyLabel: string; parentId?: string | null }) {
  const children = departments.filter((item) => item.parentId === parentId);
  if (!children.length) return parentId === null && employees.length ? <EmployeeGrid employees={employees} openLabel={openLabel} emptyLabel={emptyLabel} /> : null;
  return <div className={parentId ? "public-structure-children" : "public-structure-tree"}>{children.map((department) => {
    const nested = descendantIds(department.id, departments);
    const directEmployees = employees.filter((item) => item.departmentId === department.id);
    const total = employees.filter((item) => item.departmentId && nested.has(item.departmentId)).length;
    return <section className="public-structure-section" key={department.id}><header><Network size={18} /><h3>{department.name}</h3><span>{total}</span></header>{directEmployees.length > 0 && <EmployeeGrid employees={directEmployees} openLabel={openLabel} emptyLabel={emptyLabel} />}<PublicDepartmentTree departments={departments} employees={employees} openLabel={openLabel} emptyLabel={emptyLabel} parentId={department.id} /></section>;
  })}</div>;
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

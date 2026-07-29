import { Building2, Mail, MapPin, Phone, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import BrandLogo from "../components/BrandLogo";
import { supabase } from "../lib/supabase";

interface PublicOrganization {
  organization: { name: string; description: string; logo: string; phone: string; email: string; address: string };
  departments: Array<{ id: string; name: string }>;
  employees: Array<{ name: string; position: string; departmentId: string | null; slug: string; photo: string }>;
}

export default function OrganizationPublicPage() {
  const { slug = "" } = useParams();
  const [data, setData] = useState<PublicOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    void supabase.rpc("get_public_organization", { target_slug: slug }).then(({ data: result }) => {
      setData(result as PublicOrganization | null); setLoading(false);
    });
  }, [slug]);
  const employees = useMemo(() => (data?.employees ?? []).filter((item) =>
    `${item.name} ${item.position}`.toLowerCase().includes(query.toLowerCase())
  ), [data, query]);
  if (loading) return <main className="route-loading"><span /><p>...</p></main>;
  if (!data) return <main className="card-missing"><BrandLogo /><div className="empty-state"><Building2 size={30} /><h1>Организация не найдена</h1></div></main>;
  return <main className="organization-public-page">
    <header className="profile-toolbar"><Link to="/"><BrandLogo light /></Link></header>
    <section className="directory-hero"><div className="site-container py-14 text-center md:py-20">
      {data.organization.logo ? <img className="organization-public-logo" src={data.organization.logo} alt="" /> : <div className="organization-public-logo"><Building2 size={32} /></div>}
      <span className="section-label">Подтверждённая организация</span><h1>{data.organization.name}</h1><p>{data.organization.description}</p>
      <div className="organization-public-contacts">{data.organization.phone && <a href={`tel:${data.organization.phone}`}><Phone size={16} /> {data.organization.phone}</a>}{data.organization.email && <a href={`mailto:${data.organization.email}`}><Mail size={16} /> {data.organization.email}</a>}{data.organization.address && <span><MapPin size={16} /> {data.organization.address}</span>}</div>
    </div></section>
    <section className="section"><div className="site-container"><div className="platform-section-head"><div><span className="section-label"><Users size={15} /> Сотрудники</span><h2>Структура и контакты</h2></div><div className="org-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Поиск сотрудника" /></div></div>
      <div className="specialist-grid">{employees.map((employee) => <article className="specialist-card" key={employee.slug}>{employee.photo ? <img className="specialist-avatar" src={employee.photo} alt="" /> : <div className="specialist-avatar specialist-avatar-blue">{employee.name[0]}</div>}<h3>{employee.name}</h3><p>{employee.position}</p><Link className="button button-secondary w-full" to={`/card/${employee.slug}`}>Открыть визитку</Link></article>)}</div>
    </div></section>
  </main>;
}

import {
  Banknote,
  Building2,
  ContactRound,
  Headphones,
  LayoutDashboard,
  LogOut,
  Settings2,
  ShieldCheck
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, NavLink } from "react-router";
import BrandLogo from "../BrandLogo";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { adminCountsChangedEvent, adminNotificationRepository, emptyAdminNavCounts } from "../../lib/adminNotificationRepository";
import "./AdminTypography.css";

const navigation = [
  { to: "/admin", label: "Главная", icon: LayoutDashboard, end: true, count: "total" as const },
  { to: "/admin/accounts", label: "Аккаунты", icon: Building2, count: "accounts" as const },
  { to: "/admin/cards", label: "Визитки", icon: ContactRound, count: "cards" as const },
  { to: "/admin/moderation", label: "Проверки", icon: ShieldCheck, count: "moderation" as const },
  { to: "/admin/payments", label: "Оплаты и заказы", icon: Banknote, count: "payments" as const },
  { to: "/admin/support", label: "Поддержка", icon: Headphones, count: "support" as const }
];

export default function AdminShell({
  children,
  title,
  description,
  actions
}: {
  children: ReactNode;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  const { profile, signOut } = useAdminAuth();
  const [counts, setCounts] = useState(emptyAdminNavCounts);
  const refreshCounts = useCallback(async () => setCounts(await adminNotificationRepository.counts()), []);

  useEffect(() => {
    void refreshCounts();
    const refresh = () => void refreshCounts();
    window.addEventListener(adminCountsChangedEvent, refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      window.removeEventListener(adminCountsChangedEvent, refresh);
      window.removeEventListener("focus", refresh);
      window.clearInterval(timer);
    };
  }, [refreshCounts]);

  return (
    <main className="admin-workspace">
      <aside className="admin-workspace-sidebar">
        <Link to="/admin" className="admin-workspace-brand" aria-label="Vizora Control">
          <BrandLogo light />
          <span>CONTROL</span>
        </Link>
        <div className="admin-workspace-role">
          <span><Settings2 size={16} /></span>
          <div><strong>Главный администратор</strong><small>Единый защищённый кабинет</small></div>
        </div>
        <nav aria-label="Разделы администратора">
          {navigation.map(({ to, label, icon: Icon, end, count }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={18} /><span>{label}</span>{counts[count] > 0 && <b className="admin-nav-badge">{counts[count] > 99 ? "99+" : counts[count]}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="admin-workspace-account">
          <span>{profile?.fullName?.slice(0, 1).toUpperCase() || "A"}</span>
          <div><strong>{profile?.fullName || "Администратор"}</strong><small>{profile?.email}</small></div>
          <button type="button" title="Выйти" onClick={() => void signOut()}><LogOut size={17} /></button>
        </div>
      </aside>

      <section className="admin-workspace-body">
        <div className="admin-mobile-bar">
          <Link to="/admin" aria-label="Vizora Admin"><BrandLogo light /></Link>
          <span>ADMIN</span>
          <button type="button" onClick={() => void signOut()}><LogOut size={20} /><span>Выйти</span></button>
        </div>
        <header className="admin-workspace-header">
          <div><small>VIZORA ADMINISTRATION</small><h1>{title}</h1><p>{description}</p></div>
          <div className="admin-workspace-actions">{actions}<Link to="/" target="_blank">Открыть сайт</Link></div>
        </header>
        {children}
      </section>
    </main>
  );
}

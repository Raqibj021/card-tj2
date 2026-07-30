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
import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import BrandLogo from "../BrandLogo";
import { useAuth } from "../../context/AuthContext";
import "./AdminTypography.css";

const navigation = [
  { to: "/admin", label: "Главная", icon: LayoutDashboard, end: true },
  { to: "/admin/accounts", label: "Аккаунты", icon: Building2 },
  { to: "/admin/cards", label: "Визитки", icon: ContactRound },
  { to: "/admin/moderation", label: "Проверки", icon: ShieldCheck },
  { to: "/admin/payments", label: "Оплаты и заказы", icon: Banknote },
  { to: "/admin/support", label: "Поддержка", icon: Headphones }
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
  const { profile, signOut } = useAuth();

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
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={18} /><span>{label}</span>
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

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Building2,
  Bell,
  Sun,
  UserRound,
  X
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import type { Language } from "../../types/card";
import BrandLogo from "../BrandLogo";
import { useNotificationCounts } from "../../hooks/useNotificationCounts";

export default function Header() {
  const { t, language, setLanguage, theme, toggleTheme } = useApp();
  const { user, profile, loading: authLoading } = useAuth();
  const { counts } = useNotificationCounts();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const copy = {
    ru: { home: "Главная", directory: "Специалисты", organizations: "Организации", services: "Услуги", dashboard: "Кабинет", leads: "Лиды", notifications: "Уведомления", login: "Войти", account: "Личный кабинет", mainNav: "Основная навигация", mobileNav: "Мобильная навигация" },
    tj: { home: "Асосӣ", directory: "Мутахассисон", organizations: "Ташкилотҳо", services: "Хизматҳо", dashboard: "Утоқи шахсӣ", leads: "Дархостҳо", notifications: "Огоҳиномаҳо", login: "Ворид шудан", account: "Утоқи шахсӣ", mainNav: "Менюи асосӣ", mobileNav: "Менюи мобилӣ" },
    en: { home: "Home", directory: "Specialists", organizations: "Organizations", services: "Services", dashboard: "Dashboard", leads: "Leads", notifications: "Notifications", login: "Sign in", account: "Personal account", mainNav: "Main navigation", mobileNav: "Mobile navigation" }
  }[language];
  const navItems = [
    { to: "/", text: copy.home },
    { to: "/directory", text: copy.directory, icon: Search },
    { to: "/organizations", text: copy.organizations, icon: Building2 },
    { to: "/services", text: copy.services },
    ...(user
      ? [
          { to: "/dashboard", text: copy.dashboard, icon: LayoutDashboard },
          { to: "/dashboard/leads", text: copy.leads }
        ]
      : [])
  ];
  const accountName =
    profile?.fullName.trim().split(/\s+/)[0] ||
    user?.email?.split("@")[0] ||
    copy.account;

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color:var(--header)] backdrop-blur-xl">
      <div className="site-container flex h-20 items-center justify-between gap-5">
        <Link to="/" className="brand-mark" aria-label="Vizora.tj">
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label={copy.mainNav}>
          {navItems.map(({ to, text }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-link ${isActive ? "nav-link-active" : ""}`
              }
            >
              {text}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <label className="sr-only" htmlFor="header-language">
            {t("cardLanguage")}
          </label>
          <select
            id="header-language"
            className="compact-select"
            value={language}
            onChange={(event) =>
              setLanguage(event.target.value as Language)
            }
          >
            <option value="ru">RU</option>
            <option value="tj">TJ</option>
            <option value="en">EN</option>
          </select>
          <button
            type="button"
            onClick={toggleTheme}
            className="icon-button"
            aria-label={theme === "light" ? t("darkTheme") : t("lightTheme")}
            title={theme === "light" ? t("darkTheme") : t("lightTheme")}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          {user && <Link to="/notifications" className="site-notification-link" aria-label={copy.notifications} title={copy.notifications}><Bell size={18} />{counts.all > 0 && <b>{counts.all > 99 ? "99+" : counts.all}</b>}</Link>}
          {!authLoading && (
            user ? (
              <Link
                to="/dashboard"
                className="account-link"
                aria-label={copy.account}
                title={copy.account}
              >
                <span><UserRound size={17} /></span>
                <strong>{accountName}</strong>
              </Link>
            ) : (
              <Link to="/login" className="button button-secondary !min-h-10 !px-4">
                {copy.login}
              </Link>
            )
          )}
        </div>

        <button
          type="button"
          className="icon-button sm:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={t("navMenu")}
          aria-expanded={open}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {open && (
        <div className="mobile-menu sm:hidden">
          <nav className="grid gap-1" aria-label={copy.mobileNav}>
            {navItems.map(({ to, text, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `mobile-nav-link ${isActive ? "mobile-nav-link-active" : ""}`
                }
              >
                {Icon && <Icon size={18} />}
                {text}
              </NavLink>
            ))}
            {user && <NavLink to="/notifications" className={({ isActive }) => `mobile-nav-link ${isActive ? "mobile-nav-link-active" : ""}`}><Bell size={18} />{copy.notifications}{counts.all > 0 && <b className="mobile-notification-badge">{counts.all > 99 ? "99+" : counts.all}</b>}</NavLink>}
          </nav>
          <div className="mt-4 flex items-center gap-2 border-t border-[var(--line)] pt-4">
            <select
              className="compact-select flex-1"
              value={language}
              aria-label={t("cardLanguage")}
              onChange={(event) =>
                setLanguage(event.target.value as Language)
              }
            >
              <option value="ru">Русский</option>
              <option value="tj">Тоҷикӣ</option>
              <option value="en">English</option>
            </select>
            <button
              type="button"
              onClick={toggleTheme}
              className="icon-button"
              aria-label={theme === "light" ? t("darkTheme") : t("lightTheme")}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
          {!authLoading && (
            user ? (
              <Link to="/dashboard" className="mobile-account-link">
                <span><UserRound size={18} /></span>
                <div>
                  <small>{copy.account}</small>
                  <strong>{accountName}</strong>
                </div>
              </Link>
            ) : (
              <Link to="/login" className="button button-secondary mt-2 w-full">
                {copy.login}
              </Link>
            )
          )}
        </div>
      )}
    </header>
  );
}

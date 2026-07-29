import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Building2,
  Plus,
  ShieldCheck,
  Sun,
  X
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router";
import { useApp } from "../../context/AppContext";
import type { Language } from "../../types/card";
import BrandLogo from "../BrandLogo";

const navItems = [
  { to: "/", text: "Главная" },
  { to: "/directory", text: "Специалисты", icon: Search },
  { to: "/organizations", text: "Организации", icon: Building2 },
  { to: "/services", text: "Услуги" },
  { to: "/dashboard", text: "Кабинет", icon: LayoutDashboard },
  { to: "/admin", text: "Админ", icon: ShieldCheck }
];

export default function Header() {
  const { t, language, setLanguage, theme, toggleTheme } = useApp();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[color:var(--header)] backdrop-blur-xl">
      <div className="site-container flex h-18 items-center justify-between gap-4">
        <Link to="/" className="brand-mark" aria-label="Vizora.tj">
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Основная навигация">
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
          <Link to="/create" className="button button-primary !min-h-10 !px-4">
            <Plus size={17} />
            {t("create")}
          </Link>
          <Link to="/login" className="button button-secondary !min-h-10 !px-4">Войти</Link>
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
          <nav className="grid gap-1" aria-label="Мобильная навигация">
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
          <Link to="/create" className="button button-primary mt-3 w-full">
            <Plus size={18} />
            {t("create")}
          </Link>
          <Link to="/login" className="button button-secondary mt-2 w-full">Войти</Link>
        </div>
      )}
    </header>
  );
}

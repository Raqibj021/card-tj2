import { ArrowUpRight, Instagram, Mail } from "lucide-react";
import { Link } from "react-router";
import { useApp } from "../../context/AppContext";

export default function Footer() {
  const { t } = useApp();

  return (
    <footer className="border-t border-white/10 bg-[#0b1220] text-white">
      <div className="site-container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Link to="/" className="brand-mark text-white">
            <span className="brand-symbol">C</span>
            <span>Card<span className="text-teal-400">.tj</span></span>
          </Link>
          <p className="mt-5 text-sm leading-7 text-slate-400">
            {t("footerText")}
          </p>
        </div>
        <div>
          <p className="footer-title">{t("product")}</p>
          <div className="footer-links">
            <Link to="/create">{t("create")}</Link>
            <Link to="/dashboard">{t("dashboard")}</Link>
            <Link to="/card/demo">{t("example")}</Link>
          </div>
        </div>
        <div>
          <p className="footer-title">{t("contacts")}</p>
          <div className="footer-links">
            <a href="mailto:hello@card.tj">
              <Mail size={15} /> hello@card.tj
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              <Instagram size={15} /> Instagram
            </a>
            <Link to="/admin">
              {t("admin")} <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="site-container flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Card.tj. {t("rights")}</span>
          <span>Сделано в Таджикистане</span>
        </div>
      </div>
    </footer>
  );
}

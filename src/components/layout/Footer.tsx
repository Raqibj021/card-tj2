import { Instagram, Mail } from "lucide-react";
import { Link } from "react-router";
import { useApp } from "../../context/AppContext";
import BrandLogo from "../BrandLogo";

export default function Footer() {
  const { t, language } = useApp();
  const copy = {
    ru: { directory: "Каталог специалистов", organizations: "Организациям", services: "Визитки и QR-услуги", made: "Сделано в Таджикистане" },
    tj: { directory: "Феҳристи мутахассисон", organizations: "Барои ташкилотҳо", services: "Варақаҳо ва QR-хизматҳо", made: "Дар Тоҷикистон сохта шудааст" },
    en: { directory: "Specialist directory", organizations: "For organizations", services: "Business cards and QR services", made: "Made in Tajikistan" }
  }[language];

  return (
    <footer className="border-t border-white/10 bg-[#0b1220] text-white">
      <div className="site-container grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Link to="/" className="brand-mark text-white">
            <BrandLogo light />
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
            <Link to="/directory">{copy.directory}</Link>
            <Link to="/organizations">{copy.organizations}</Link>
            <Link to="/services">{copy.services}</Link>
          </div>
        </div>
        <div>
          <p className="footer-title">{t("contacts")}</p>
          <div className="footer-links">
            <a href="mailto:support@vizora.tj">
              <Mail size={15} /> support@vizora.tj
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer">
              <Instagram size={15} /> Instagram
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="site-container flex flex-col gap-2 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Vizora.tj. {t("rights")}</span>
          <span>{copy.made}</span>
        </div>
      </div>
    </footer>
  );
}

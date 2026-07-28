import { ArrowLeft, SearchX } from "lucide-react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";

export default function NotFoundPage() {
  const { t } = useApp();

  return (
    <main className="site-container flex min-h-[calc(100vh-4.5rem)] items-center justify-center py-16">
      <div className="empty-state max-w-xl">
        <div className="empty-state-icon"><SearchX size={27} /></div>
        <span className="section-label">404</span>
        <h1>{t("notFoundTitle")}</h1>
        <p>{t("notFoundText")}</p>
        <Link to="/" className="button button-primary mt-6">
          <ArrowLeft size={17} /> {t("backHome")}
        </Link>
      </div>
    </main>
  );
}

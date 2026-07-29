import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import BrandLogo from "./BrandLogo";

export default function LoadingScreen() {
  const { language } = useApp();
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const startedAt = performance.now();
    const finish = () => {
      const elapsed = performance.now() - startedAt;
      window.setTimeout(() => {
        setLeaving(true);
        window.setTimeout(() => setVisible(false), 360);
      }, Math.max(0, 650 - elapsed));
    };

    if (document.readyState === "complete") finish();
    else window.addEventListener("load", finish, { once: true });

    const fallback = window.setTimeout(finish, 2200);
    return () => {
      window.removeEventListener("load", finish);
      window.clearTimeout(fallback);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`loading-screen ${leaving ? "loading-screen-leaving" : ""}`}>
      <div className="loading-brand">
        <BrandLogo />
        <span className="loading-line" />
        <p>{language === "ru" ? "Цифровые визитки и проверенные контакты" : language === "tj" ? "Варақаҳои рақамӣ ва тамосҳои тасдиқшуда" : "Digital business cards and verified contacts"}</p>
      </div>
    </div>
  );
}

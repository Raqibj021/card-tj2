import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import BrandLogo from "../components/BrandLogo";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { inviteRepository, type InvitePreview } from "../lib/inviteRepository";
import "./FreeCardPage.css";

const copy = {
  tj: {
    title: "Визиткаи шумо омода аст! 🎉",
    text: "Барои идора кардан — тағйир додани маълумот, илова кардани акс ва дидани омор — дар Vizora номнавис шавед. Визитка худкор ба кабинети шумо мегузарад.",
    view: "Дидани визитка",
    register: "Номнавис шудан",
    login: "Ман аллакай аккаунт дорам",
    claim: "Визиткаро ба кабинети худ гирифтан",
    claiming: "Интизор шавед…",
    claimed: "Тайёр! Визитка дар кабинети шумост",
    notFound: "Пайванд нодуруст аст ё муҳлаташ гузаштааст. Ба WhatsApp-и Vizora нависед.",
    taken: "Ин визитка аллакай ба аккаунти дигар пайваст шудааст.",
    loading: "Бор шуда истодааст…"
  },
  ru: {
    title: "Ваша визитка готова! 🎉",
    text: "Чтобы управлять ею — менять данные, добавить фото и смотреть статистику — зарегистрируйтесь на Vizora. Визитка автоматически перейдёт в ваш кабинет.",
    view: "Посмотреть визитку",
    register: "Зарегистрироваться",
    login: "У меня уже есть аккаунт",
    claim: "Забрать визитку в свой кабинет",
    claiming: "Подождите…",
    claimed: "Готово! Визитка в вашем кабинете",
    notFound: "Ссылка неверная или устарела. Напишите в WhatsApp Vizora.",
    taken: "Эта визитка уже привязана к другому аккаунту.",
    loading: "Загрузка…"
  }
} as const;

export default function ClaimCardPage() {
  const { token = "" } = useParams();
  const { language } = useApp();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InvitePreview | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lang = invite?.language === "ru" || (!invite && language === "ru") ? "ru" : "tj";
  const t = copy[lang];
  const back = `/claim/${token}`;

  useEffect(() => {
    inviteRepository.preview(token).then(setInvite).catch(() => setInvite(null));
  }, [token]);

  const claim = async () => {
    setBusy(true);
    setError("");
    try {
      await inviteRepository.claim(token);
      navigate("/dashboard", { replace: true });
    } catch (e) {
      setError((e as Error).message === "already_claimed" ? t.taken : t.notFound);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="free-page">
      <div className="free-bg" aria-hidden><i /><i /><i /></div>
      <header className="free-top"><BrandLogo /></header>
      <section className="free-wrap">
        {invite === undefined ? (
          <div className="free-panel"><p>{t.loading}</p></div>
        ) : invite === null || !invite.slug ? (
          <div className="free-panel"><p>{t.notFound}</p></div>
        ) : (
          <>
            <div className="free-card done">
              <div className="free-card-top">
                <div className="free-avatar">{invite.full_name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</div>
                <div><strong>{invite.full_name}</strong><span>{invite.profession}</span></div>
              </div>
              <div className="free-card-chips"><em className="on">📞</em><em className="on">💬</em><em className="on">🔗</em></div>
              <div className="free-card-foot">vizora.tj/{invite.slug}<b>NFC · QR</b></div>
            </div>
            <div className="free-panel free-done">
              {invite.status === "claimed" ? (
                <>
                  <h1><CheckCircle2 /> {t.claimed}</h1>
                  <Link className="free-btn" to={user ? "/dashboard" : "/login"} state={{ from: "/dashboard" }}>{t.login} <ArrowRight size={18} /></Link>
                </>
              ) : (
                <>
                  <h1>{t.title}</h1>
                  <p>{t.text}</p>
                  <a className="free-ghost" style={{ justifyContent: "center", marginTop: 14 }} href={`/${invite.slug}`} target="_blank" rel="noreferrer">{t.view} ↗</a>
                  {!loading && user ? (
                    <button type="button" className="free-btn" disabled={busy} onClick={() => void claim()}>{busy ? t.claiming : t.claim} <ArrowRight size={18} /></button>
                  ) : (
                    <>
                      <Link className="free-btn" to="/register" state={{ from: back }}>{t.register} <ArrowRight size={18} /></Link>
                      <div style={{ marginTop: 12 }}><Link className="free-ghost" to="/login" state={{ from: back }}>{t.login}</Link></div>
                    </>
                  )}
                  {error && <div className="free-error">{error}</div>}
                </>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

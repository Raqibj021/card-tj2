import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import BrandLogo from "../components/BrandLogo";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import FreeCover from "../components/FreeCover";
import { findFreeCardDesign } from "../lib/freeCardDesigns";
import { inviteRepository, type InvitePreview } from "../lib/inviteRepository";
import type { CSSProperties } from "react";
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
    <main className="free-page" style={(() => { const d = findFreeCardDesign(invite?.design ?? ""); return { "--c1": d.c1, "--c2": d.c2, "--acc": d.accent } as CSSProperties; })()}>
      <div className="free-bg" aria-hidden><i /><i /><i /></div>
      <header className="free-top"><BrandLogo light /></header>
      <section className="free-wrap">
        {invite === undefined ? (
          <div className="free-panel"><p>{t.loading}</p></div>
        ) : invite === null || !invite.slug ? (
          <div className="free-panel"><p>{t.notFound}</p><a className="free-btn" href="/free">Vizora.tj/free →</a></div>
        ) : (
          <>
            <div className="free-card-zone">
              <article className="free-window done">
                <div className="free-cover">
                  <div className="free-cover-img"><FreeCover design={findFreeCardDesign(invite.design).key} /></div>
                  <div className="free-photo" role="img"><span>{invite.full_name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span></div>
                </div>
                <div className="free-window-body">
                  <h3>{invite.full_name}</h3>
                  <p>{invite.profession}</p>
                  <small>vizora.tj/{invite.slug}</small>
                </div>
              </article>
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

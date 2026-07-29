import { Building2, KeyRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { organizationRepository } from "../lib/organizationRepository";

export default function OrganizationJoinPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return <main className="application-page"><div className="site-container py-14"><section className="application-panel mx-auto max-w-xl"><span className="section-label">Приглашение сотрудника</span><h1>Присоединиться к организации</h1><p className="form-intro">Войдите под тем же email, на который отправлено приглашение, и введите полученный код.</p><form className="platform-form" onSubmit={async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setBusy(true); const data = new FormData(event.currentTarget); try { await organizationRepository.acceptInvitation(String(data.get("code"))); setMessage("Приглашение принято. Фирменная визитка создана."); window.setTimeout(() => navigate("/dashboard"), 1200); } catch (error) { setMessage(error instanceof Error ? error.message : "Ошибка"); } finally { setBusy(false); } }}><label><span>Код приглашения</span><div className="auth-input"><KeyRound size={18} /><input name="code" required placeholder="ORG-XXXXXXXX" /></div></label>{message && <div className="auth-message">{message}</div>}<button className="button button-primary button-large" disabled={busy}><Building2 size={18} /> {busy ? "…" : "Присоединиться"}</button></form></section></div></main>;
}

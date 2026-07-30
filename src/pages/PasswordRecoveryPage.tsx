import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import BrandLogo from "../components/BrandLogo";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { authRedirectUrl } from "../lib/siteUrl";

export default function PasswordRecoveryPage({ reset = false }: { reset?: boolean }) {
  const { language } = useApp();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const copy = {
    ru: { label: "Безопасность аккаунта", forgot: "Восстановление пароля", reset: "Новый пароль", email: "Электронная почта", password: "Новый пароль", send: "Отправить ссылку", save: "Сохранить пароль", sent: "Ссылка для восстановления отправлена на вашу почту.", saved: "Пароль изменён. Теперь можно войти.", back: "Вернуться ко входу" },
    tj: { label: "Амнияти ҳисоб", forgot: "Барқарор кардани рамз", reset: "Рамзи нав", email: "Почтаи электронӣ", password: "Рамзи нав", send: "Фиристодани пайванд", save: "Нигоҳ доштани рамз", sent: "Пайванди барқарорсозӣ ба почтаи шумо фиристода шуд.", saved: "Рамз иваз шуд. Акнун метавонед ворид шавед.", back: "Бозгашт ба воридшавӣ" },
    en: { label: "Account security", forgot: "Recover password", reset: "New password", email: "Email", password: "New password", send: "Send recovery link", save: "Save password", sent: "A recovery link was sent to your email.", saved: "Password changed. You can now sign in.", back: "Back to sign in" }
  }[language];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const result = reset
      ? await supabase.auth.updateUser({ password: String(data.get("password")) })
      : await supabase.auth.resetPasswordForEmail(String(data.get("email")), {
          redirectTo: authRedirectUrl("/reset-password")
        });
    setBusy(false);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setMessage(reset ? copy.saved : copy.sent);
    if (reset) window.setTimeout(() => navigate("/login"), 1200);
  }

  return (
    <main className="auth-page auth-recovery-page">
      <section className="auth-side">
        <div className="auth-topbar"><Link to="/"><BrandLogo light /></Link></div>
        <div><span className="section-label">VIZORA.TJ</span><h1>{reset ? copy.reset : copy.forgot}</h1><p>{copy.label}</p></div>
        <small>© {new Date().getFullYear()} Vizora.tj</small>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form-card">
          <span className="section-label">{copy.label}</span>
          <h2>{reset ? copy.reset : copy.forgot}</h2>
          <form className="platform-form" onSubmit={submit}>
            {reset ? (
              <label><span>{copy.password}</span><div className="auth-input"><LockKeyhole size={18} /><input name="password" type="password" minLength={8} required autoComplete="new-password" /></div></label>
            ) : (
              <label><span>{copy.email}</span><div className="auth-input"><Mail size={18} /><input name="email" type="email" required autoComplete="email" /></div></label>
            )}
            {message && <div className="auth-message">{message}</div>}
            <button type="submit" className="button button-primary button-large w-full" disabled={busy}>{busy ? "…" : reset ? copy.save : copy.send} <ArrowRight size={18} /></button>
          </form>
          <p className="auth-switch"><Link to="/login">{copy.back}</Link></p>
        </div>
      </section>
    </main>
  );
}

import { ArrowRight, Check, Eye, EyeOff, Gift, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import BrandLogo from "../components/BrandLogo";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const fullName = String(form.get("fullName") ?? "");

    if (!supabase) {
      setMessage("Регистрация будет активирована после подключения защищённой базы Vizora.");
      return;
    }

    setBusy(true);
    setMessage("");
    const result = isRegister
      ? await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (isRegister) {
      setMessage("Проверьте электронную почту и подтвердите регистрацию.");
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-side">
        <Link to="/" aria-label="Vizora"><BrandLogo light /></Link>
        <div>
          <span className="section-label">VIZORA.TJ</span>
          <h1>{isRegister ? "Создайте свою цифровую визитку" : "С возвращением в Vizora"}</h1>
          <p>Один подтверждённый аккаунт — одна настоящая личность и одна персональная визитка.</p>
          {isRegister && (
            <div className="auth-gift">
              <Gift size={22} />
              <div><strong>Стартовая акция</strong><span>Первые 50 подтверждённых пользователей — бесплатно на 1 год</span></div>
            </div>
          )}
        </div>
        <small>© {new Date().getFullYear()} Vizora.tj</small>
      </section>
      <section className="auth-form-wrap">
        <Link to="/" className="auth-mobile-logo"><BrandLogo /></Link>
        <div className="auth-form-card">
          <span className="section-label">{isRegister ? "Новый аккаунт" : "Личный кабинет"}</span>
          <h2>{isRegister ? "Регистрация" : "Вход"}</h2>
          <p>{isRegister ? "Заполните настоящие данные. Позже их можно будет подтвердить." : "Введите данные своего аккаунта."}</p>
          <form className="platform-form" onSubmit={handleSubmit}>
            {isRegister && (
              <label><span>Имя и фамилия *</span><div className="auth-input"><UserRound size={18} /><input name="fullName" required autoComplete="name" placeholder="Ваше полное имя" /></div></label>
            )}
            <label><span>Электронная почта *</span><div className="auth-input"><Mail size={18} /><input name="email" type="email" required autoComplete="email" placeholder="name@example.com" /></div></label>
            <label><span>Пароль *</span><div className="auth-input"><LockKeyhole size={18} /><input name="password" type={showPassword ? "text" : "password"} required minLength={8} autoComplete={isRegister ? "new-password" : "current-password"} placeholder="Минимум 8 символов" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Показать пароль">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {isRegister && (
              <label className="consent-row"><input type="checkbox" required /><span>Я принимаю правила платформы и подтверждаю, что регистрирую собственные данные.</span></label>
            )}
            {message && <div className={`auth-message ${isSupabaseConfigured ? "" : "auth-message-note"}`}>{message}</div>}
            <button type="submit" className="button button-primary button-large w-full" disabled={busy}>
              {busy ? "Подождите…" : isRegister ? "Создать аккаунт" : "Войти"} <ArrowRight size={18} />
            </button>
          </form>
          {isRegister && <div className="auth-benefits"><span><Check size={15} /> Подтверждение email</span><span><Check size={15} /> Защита от дубликатов</span><span><Check size={15} /> Сохранение данных</span></div>}
          <p className="auth-switch">
            {isRegister ? "Уже есть аккаунт?" : "Ещё нет аккаунта?"}{" "}
            <Link to={isRegister ? "/login" : "/register"}>{isRegister ? "Войти" : "Зарегистрироваться"}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

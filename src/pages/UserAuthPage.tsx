import { ArrowRight, Check, Eye, EyeOff, Gift, Globe2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import BrandLogo from "../components/BrandLogo";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { authRedirectUrl } from "../lib/siteUrl";
import type { Language } from "../types/card";

const copy = {
  ru: {
    registerHero: "Создайте свою цифровую визитку", loginHero: "С возвращением в Vizora",
    heroText: "Один подтверждённый аккаунт — одна настоящая личность и одна персональная визитка.",
    launch: "Стартовая акция", launchText: "Первые 50 подтверждённых личных пользователей — бесплатно на 1 год. Организации в акции не участвуют.",
    newAccount: "Новый аккаунт", cabinet: "Личный кабинет", register: "Регистрация", login: "Вход",
    registerIntro: "Заполните настоящие данные. Позже их можно будет подтвердить.", loginIntro: "Введите данные своего аккаунта.",
    fullName: "Имя и фамилия *", fullNamePlaceholder: "Ваше полное имя", email: "Электронная почта *", password: "Пароль *", passwordPlaceholder: "Минимум 8 символов",
    consent: "Я принимаю правила платформы и подтверждаю, что регистрирую собственные данные.", wait: "Подождите…", create: "Создать аккаунт", enter: "Войти",
    emailConfirmation: "Подтверждение email", duplicateProtection: "Защита от дубликатов", dataSaving: "Сохранение данных",
    hasAccount: "Уже есть аккаунт?", noAccount: "Ещё нет аккаунта?", registerLink: "Зарегистрироваться", forgot: "Забыли пароль?",
    checkEmail: "Мы отправили шестизначный код на вашу электронную почту.", codeTitle: "Подтвердите почту", codeText: "Введите шестизначный код, отправленный на",
    codeLabel: "Код подтверждения", confirmCode: "Подтвердить код", resendCode: "Отправить код повторно", resendIn: "Повторная отправка через", seconds: "сек.", changeEmail: "Указать другую почту",
    invalidCode: "Код неверный или истёк. Проверьте код либо запросите новый.", codeResent: "Новый код отправлен.", unavailable: "Вход временно недоступен. Обновите страницу и попробуйте снова.",
    invalidLogin: "Неверная электронная почта или пароль. Проверьте данные либо восстановите пароль.", unconfirmed: "Электронная почта ещё не подтверждена. Откройте письмо с кодом подтверждения."
  },
  tj: {
    registerHero: "Варақаи рақамии худро созед", loginHero: "Хуш омадед ба Vizora",
    heroText: "Як ҳисоби тасдиқшуда — як шахсияти воқеӣ ва як варақаи шахсӣ.", launch: "Иқдоми оғози платформа", launchText: "Барои 50 корбари шахсии аввал пас аз тасдиқ — 1 сол ройгон. Ташкилотҳо дар иқдом иштирок намекунанд.",
    newAccount: "Ҳисоби нав", cabinet: "Утоқи шахсӣ", register: "Бақайдгирӣ", login: "Воридшавӣ", registerIntro: "Маълумоти воқеии худро ворид намоед.", loginIntro: "Маълумоти ҳисоби худро ворид намоед.",
    fullName: "Ному насаб *", fullNamePlaceholder: "Ному насаби пурраи шумо", email: "Почтаи электронӣ *", password: "Рамз *", passwordPlaceholder: "На камтар аз 8 аломат", consent: "Ман қоидаҳои платформаро қабул мекунам ва дурустии маълумоти худро тасдиқ менамоям.",
    wait: "Интизор шавед…", create: "Сохтани ҳисоб", enter: "Ворид шудан", emailConfirmation: "Тасдиқи почта", duplicateProtection: "Муҳофизат аз такрор", dataSaving: "Нигоҳдории маълумот", hasAccount: "Аллакай ҳисоб доред?", noAccount: "Ҳоло ҳисоб надоред?", registerLink: "Бақайдгирӣ", forgot: "Рамзро фаромӯш кардед?",
    checkEmail: "Мо рамзи шашрақамаро ба почтаи электронии шумо фиристодем.", codeTitle: "Почтаро тасдиқ намоед", codeText: "Рамзи шашрақамаро ворид кунед:", codeLabel: "Рамзи тасдиқ", confirmCode: "Тасдиқи рамз", resendCode: "Рамзро дубора фиристед", resendIn: "Ирсоли такрорӣ пас аз", seconds: "сон.", changeEmail: "Почтаи дигарро ворид кунед", invalidCode: "Рамз нодуруст аст ё муҳлаташ гузаштааст.", codeResent: "Рамзи нав фиристода шуд.", unavailable: "Воридшавӣ муваққатан дастнорас аст. Саҳифаро нав кунед.", invalidLogin: "Почтаи электронӣ ё рамз нодуруст аст.", unconfirmed: "Почтаи электронӣ ҳанӯз тасдиқ нашудааст."
  },
  en: {
    registerHero: "Create your digital business card", loginHero: "Welcome back to Vizora", heroText: "One verified account — one real identity and one personal business card.", launch: "Launch offer", launchText: "The first 50 verified personal users receive one year free. Organizations are not included.",
    newAccount: "New account", cabinet: "Personal account", register: "Registration", login: "Sign in", registerIntro: "Enter your real details.", loginIntro: "Enter your account details.", fullName: "Full name *", fullNamePlaceholder: "Your full name", email: "Email *", password: "Password *", passwordPlaceholder: "At least 8 characters", consent: "I accept the platform rules and confirm that I am registering my own details.", wait: "Please wait…", create: "Create account", enter: "Sign in", emailConfirmation: "Email confirmation", duplicateProtection: "Duplicate protection", dataSaving: "Secure data storage", hasAccount: "Already have an account?", noAccount: "Don’t have an account?", registerLink: "Register", forgot: "Forgot password?",
    checkEmail: "We sent a six-digit code to your email.", codeTitle: "Confirm your email", codeText: "Enter the six-digit code sent to", codeLabel: "Confirmation code", confirmCode: "Confirm code", resendCode: "Resend code", resendIn: "Resend available in", seconds: "sec.", changeEmail: "Use a different email", invalidCode: "The code is incorrect or has expired.", codeResent: "A new code has been sent.", unavailable: "Sign-in is temporarily unavailable. Refresh the page and try again.", invalidLogin: "Incorrect email or password. Check your details or recover your password.", unconfirmed: "Your email has not been confirmed yet."
  }
} as const;

function authMessage(error: unknown, language: Language) {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error ?? "");
  const normalized = message.toLowerCase();
  const text = copy[language];
  if (normalized.includes("invalid login credentials")) return text.invalidLogin;
  if (normalized.includes("email not confirmed")) return text.unconfirmed;
  return message && message !== "[object Object]" ? message : text.unavailable;
}

export default function UserAuthPage({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useApp();
  const { user, loading, refreshSession } = useAuth();
  const text = copy[language];
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const destination = (location.state as { from?: string } | null)?.from ?? "/dashboard";

  useEffect(() => {
    if (!loading && user) navigate(destination, { replace: true });
  }, [destination, loading, navigate, user]);

  useEffect(() => {
    if (resendCooldown < 1) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    const fullName = String(data.get("fullName") ?? "").trim();
    setBusy(true); setMessage("");
    try {
      if (isRegister) {
        const { data: result, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName }, emailRedirectTo: authRedirectUrl() } });
        if (error) throw error;
        if (!result.session) {
          setPendingEmail(email); setVerificationCode(""); setResendCooldown(60); setMessage(text.checkEmail); return;
        }
      } else {
        const { data: result, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!result.session) throw new Error(text.unavailable);
      }
      const session = await refreshSession();
      if (!session) throw new Error(text.unavailable);
      navigate(destination, { replace: true });
    } catch (error) {
      setMessage(authMessage(error, language));
    } finally { setBusy(false); }
  }

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || verificationCode.length !== 6 || busy) return;
    setBusy(true); setMessage("");
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: pendingEmail, token: verificationCode, type: "signup" });
      if (error || !data.session) throw error ?? new Error(text.invalidCode);
      await refreshSession();
      navigate("/dashboard", { replace: true });
    } catch { setMessage(text.invalidCode); }
    finally { setBusy(false); }
  }

  async function resend() {
    if (!supabase || resendCooldown || busy) return;
    setBusy(true); setMessage("");
    const { error } = await supabase.auth.resend({ type: "signup", email: pendingEmail, options: { emailRedirectTo: authRedirectUrl() } });
    setBusy(false);
    if (error) setMessage(authMessage(error, language));
    else { setResendCooldown(60); setMessage(text.codeResent); }
  }

  return (
    <main className="auth-page">
      <section className="auth-side">
        <div className="auth-topbar"><Link to="/" aria-label="Vizora"><BrandLogo light /></Link><Language value={language} setValue={setLanguage} /></div>
        <div><span className="section-label">VIZORA.TJ</span><h1>{isRegister ? text.registerHero : text.loginHero}</h1><p>{text.heroText}</p>{isRegister && <div className="auth-gift"><Gift size={22} /><div><strong>{text.launch}</strong><span>{text.launchText}</span></div></div>}</div>
        <small>© {new Date().getFullYear()} Vizora.tj</small>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-mobile-topbar"><Link to="/" className="auth-mobile-logo"><BrandLogo light /></Link><Language value={language} setValue={setLanguage} /></div>
        <div className="auth-form-card">
          <span className="section-label">{isRegister ? text.newAccount : text.cabinet}</span>
          <h2>{pendingEmail ? text.codeTitle : isRegister ? text.register : text.login}</h2>
          <p>{pendingEmail ? <>{text.codeText} <strong>{pendingEmail}</strong></> : isRegister ? text.registerIntro : text.loginIntro}</p>
          {pendingEmail ? (
            <form className="platform-form auth-code-form" onSubmit={verify}>
              <label><span>{text.codeLabel}</span><div className="auth-input"><Mail size={18} /><input className="auth-code-input" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" required autoFocus placeholder="000000" /></div></label>
              {message && <div className="auth-message" role="alert">{message}</div>}
              <button className="button button-primary button-large w-full" disabled={busy || verificationCode.length !== 6}>{busy ? text.wait : text.confirmCode}<ArrowRight size={18} /></button>
              <button type="button" className="button button-secondary w-full" disabled={busy || resendCooldown > 0} onClick={resend}>{resendCooldown ? `${text.resendIn} ${resendCooldown} ${text.seconds}` : text.resendCode}</button>
              <button type="button" className="auth-change-email" onClick={() => { setPendingEmail(""); setMessage(""); }}>{text.changeEmail}</button>
            </form>
          ) : (
            <form className="platform-form" onSubmit={submit}>
              {isRegister && <label><span>{text.fullName}</span><div className="auth-input"><UserRound size={18} /><input name="fullName" required minLength={3} autoComplete="name" placeholder={text.fullNamePlaceholder} /></div></label>}
              <label><span>{text.email}</span><div className="auth-input"><Mail size={18} /><input name="email" type="email" required autoComplete="email" placeholder="name@example.com" /></div></label>
              <label><span>{text.password}</span><div className="auth-input"><LockKeyhole size={18} /><input name="password" type={showPassword ? "text" : "password"} required minLength={8} autoComplete={isRegister ? "new-password" : "current-password"} placeholder={text.passwordPlaceholder} /><button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={text.password}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
              {isRegister && <label className="consent-row"><input type="checkbox" required /><span>{text.consent}</span></label>}
              {message && <div className="auth-message" role="alert">{message}</div>}
              <button className="button button-primary button-large w-full" disabled={busy}>{busy ? text.wait : isRegister ? text.create : text.enter}<ArrowRight size={18} /></button>
            </form>
          )}
          {!isRegister && <p className="auth-switch"><Link to="/forgot-password">{text.forgot}</Link></p>}
          {isRegister && !pendingEmail && <div className="auth-benefits"><span><Check size={15} />{text.emailConfirmation}</span><span><Check size={15} />{text.duplicateProtection}</span><span><Check size={15} />{text.dataSaving}</span></div>}
          <p className="auth-switch">{isRegister ? text.hasAccount : text.noAccount} <Link to={isRegister ? "/login" : "/register"}>{isRegister ? text.enter : text.registerLink}</Link></p>
        </div>
      </section>
    </main>
  );
}

function Language({ value, setValue }: { value: Language; setValue: (language: Language) => void }) {
  return <label className="auth-language"><Globe2 size={15} /><select value={value} aria-label="Language" onChange={(e) => setValue(e.target.value as Language)}><option value="ru">RU</option><option value="tj">TJ</option><option value="en">EN</option></select></label>;
}

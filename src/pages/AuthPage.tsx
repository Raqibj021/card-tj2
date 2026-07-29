import { ArrowRight, Check, Eye, EyeOff, Gift, Globe2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import BrandLogo from "../components/BrandLogo";
import { useApp } from "../context/AppContext";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Language } from "../types/card";

const authCopy = {
  ru: {
    registerHero: "Создайте свою цифровую визитку",
    loginHero: "С возвращением в Vizora",
    heroText: "Один подтверждённый аккаунт — одна настоящая личность и одна персональная визитка.",
    launch: "Стартовая акция",
    launchText: "Первые 50 подтверждённых пользователей — бесплатно на 1 год",
    newAccount: "Новый аккаунт",
    cabinet: "Личный кабинет",
    register: "Регистрация",
    login: "Вход",
    registerIntro: "Заполните настоящие данные. Позже их можно будет подтвердить.",
    loginIntro: "Введите данные своего аккаунта.",
    fullName: "Имя и фамилия *",
    fullNamePlaceholder: "Ваше полное имя",
    email: "Электронная почта *",
    password: "Пароль *",
    passwordPlaceholder: "Минимум 8 символов",
    consent: "Я принимаю правила платформы и подтверждаю, что регистрирую собственные данные.",
    wait: "Подождите…",
    create: "Создать аккаунт",
    enter: "Войти",
    emailConfirmation: "Подтверждение email",
    duplicateProtection: "Защита от дубликатов",
    dataSaving: "Сохранение данных",
    hasAccount: "Уже есть аккаунт?",
    noAccount: "Ещё нет аккаунта?",
    registerLink: "Зарегистрироваться",
    checkEmail: "Проверьте электронную почту и подтвердите регистрацию.",
    databaseUnavailable: "Регистрация временно недоступна. Попробуйте ещё раз позднее."
  },
  tj: {
    registerHero: "Варақаи рақамии худро созед",
    loginHero: "Хуш омадед ба Vizora",
    heroText: "Як ҳисоби тасдиқшуда — як шахсияти воқеӣ ва як варақаи шахсӣ.",
    launch: "Иқдоми оғози платформа",
    launchText: "Барои 50 корбари аввал пас аз тасдиқ — 1 сол ройгон",
    newAccount: "Ҳисоби нав",
    cabinet: "Утоқи шахсӣ",
    register: "Бақайдгирӣ",
    login: "Воридшавӣ",
    registerIntro: "Маълумоти воқеии худро ворид намоед. Баъдан онро тасдиқ кардан мумкин аст.",
    loginIntro: "Маълумоти ҳисоби худро ворид намоед.",
    fullName: "Ному насаб *",
    fullNamePlaceholder: "Ному насаби пурраи шумо",
    email: "Почтаи электронӣ *",
    password: "Рамз *",
    passwordPlaceholder: "На камтар аз 8 аломат",
    consent: "Ман қоидаҳои платформаро қабул мекунам ва дурустии маълумоти худро тасдиқ менамоям.",
    wait: "Интизор шавед…",
    create: "Сохтани ҳисоб",
    enter: "Ворид шудан",
    emailConfirmation: "Тасдиқи почта",
    duplicateProtection: "Муҳофизат аз такрор",
    dataSaving: "Нигоҳдории маълумот",
    hasAccount: "Аллакай ҳисоб доред?",
    noAccount: "Ҳоло ҳисоб надоред?",
    registerLink: "Бақайдгирӣ",
    checkEmail: "Почтаи электронии худро санҷида, бақайдгириро тасдиқ намоед.",
    databaseUnavailable: "Бақайдгирӣ муваққатан дастнорас аст. Баъдтар кӯшиш кунед."
  },
  en: {
    registerHero: "Create your digital business card",
    loginHero: "Welcome back to Vizora",
    heroText: "One verified account — one real identity and one personal business card.",
    launch: "Launch offer",
    launchText: "The first 50 verified users receive one year free",
    newAccount: "New account",
    cabinet: "Personal account",
    register: "Registration",
    login: "Sign in",
    registerIntro: "Enter your real details. You can verify them later.",
    loginIntro: "Enter your account details.",
    fullName: "Full name *",
    fullNamePlaceholder: "Your full name",
    email: "Email *",
    password: "Password *",
    passwordPlaceholder: "At least 8 characters",
    consent: "I accept the platform rules and confirm that I am registering my own details.",
    wait: "Please wait…",
    create: "Create account",
    enter: "Sign in",
    emailConfirmation: "Email confirmation",
    duplicateProtection: "Duplicate protection",
    dataSaving: "Secure data storage",
    hasAccount: "Already have an account?",
    noAccount: "Don’t have an account?",
    registerLink: "Register",
    checkEmail: "Check your email and confirm your registration.",
    databaseUnavailable: "Registration is temporarily unavailable. Please try again later."
  }
} as const;

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const { language, setLanguage } = useApp();
  const text = authCopy[language];
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
      setMessage(text.databaseUnavailable);
      return;
    }

    setBusy(true);
    setMessage("");
    const result = isRegister
      ? await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`
          }
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (isRegister) {
      setMessage(text.checkEmail);
    } else {
      navigate("/dashboard");
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-side">
        <div className="auth-topbar">
          <Link to="/" aria-label="Vizora"><BrandLogo light /></Link>
          <label className="auth-language">
            <Globe2 size={15} />
            <select
              value={language}
              aria-label="Language"
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              <option value="ru">RU</option>
              <option value="tj">TJ</option>
              <option value="en">EN</option>
            </select>
          </label>
        </div>
        <div>
          <span className="section-label">VIZORA.TJ</span>
          <h1>{isRegister ? text.registerHero : text.loginHero}</h1>
          <p>{text.heroText}</p>
          {isRegister && (
            <div className="auth-gift">
              <Gift size={22} />
              <div><strong>{text.launch}</strong><span>{text.launchText}</span></div>
            </div>
          )}
        </div>
        <small>© {new Date().getFullYear()} Vizora.tj</small>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-mobile-topbar">
          <Link to="/" className="auth-mobile-logo"><BrandLogo /></Link>
          <label className="auth-language auth-language-mobile">
            <Globe2 size={15} />
            <select
              value={language}
              aria-label="Language"
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              <option value="ru">RU</option>
              <option value="tj">TJ</option>
              <option value="en">EN</option>
            </select>
          </label>
        </div>
        <div className="auth-form-card">
          <span className="section-label">{isRegister ? text.newAccount : text.cabinet}</span>
          <h2>{isRegister ? text.register : text.login}</h2>
          <p>{isRegister ? text.registerIntro : text.loginIntro}</p>
          <form className="platform-form" onSubmit={handleSubmit}>
            {isRegister && (
              <label><span>{text.fullName}</span><div className="auth-input"><UserRound size={18} /><input name="fullName" required autoComplete="name" placeholder={text.fullNamePlaceholder} /></div></label>
            )}
            <label><span>{text.email}</span><div className="auth-input"><Mail size={18} /><input name="email" type="email" required autoComplete="email" placeholder="name@example.com" /></div></label>
            <label><span>{text.password}</span><div className="auth-input"><LockKeyhole size={18} /><input name="password" type={showPassword ? "text" : "password"} required minLength={8} autoComplete={isRegister ? "new-password" : "current-password"} placeholder={text.passwordPlaceholder} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={text.password}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
            {isRegister && (
              <label className="consent-row"><input type="checkbox" required /><span>{text.consent}</span></label>
            )}
            {message && <div className={`auth-message ${isSupabaseConfigured ? "" : "auth-message-note"}`}>{message}</div>}
            <button type="submit" className="button button-primary button-large w-full" disabled={busy}>
              {busy ? text.wait : isRegister ? text.create : text.enter} <ArrowRight size={18} />
            </button>
          </form>
          {isRegister && <div className="auth-benefits"><span><Check size={15} /> {text.emailConfirmation}</span><span><Check size={15} /> {text.duplicateProtection}</span><span><Check size={15} /> {text.dataSaving}</span></div>}
          <p className="auth-switch">
            {isRegister ? text.hasAccount : text.noAccount}{" "}
            <Link to={isRegister ? "/login" : "/register"}>{isRegister ? text.enter : text.registerLink}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

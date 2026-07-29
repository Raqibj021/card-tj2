import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function AdminLoginPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && user && profile?.role === "admin") return <Navigate to="/admin" replace />;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return setError("Сервер авторизации недоступен.");
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password"))
    });
    if (signInError || !data.user) {
      setBusy(false);
      return setError("Неверная почта или пароль.");
    }
    const { data: account } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (account?.role !== "admin") {
      await supabase.auth.signOut();
      setBusy(false);
      return setError("Этот аккаунт не имеет доступа к администрированию.");
    }
    navigate("/admin", { replace: true });
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <BrandLogo light />
        <span className="admin-login-mark"><ShieldCheck size={18} /> ЗАЩИЩЁННЫЙ ДОСТУП</span>
        <h1>Кабинет администратора</h1>
        <p>Вход доступен только главному администратору Vizora.</p>
        <form onSubmit={submit}>
          <label><span>Электронная почта</span><input name="email" type="email" autoComplete="username" required /></label>
          <label><span>Пароль</span><input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
          {error && <div className="admin-login-error">{error}</div>}
          <button type="submit" disabled={busy}><LockKeyhole size={18} />{busy ? "Проверяем…" : "Войти в кабинет"}</button>
        </form>
        <small>Пользовательские аккаунты здесь войти не могут.</small>
      </section>
    </main>
  );
}

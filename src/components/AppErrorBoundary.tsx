import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { failed: boolean }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Vizora interface error", error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#07111f", color: "#f8fafc", fontFamily: "Inter, system-ui, sans-serif" }}>
        <section style={{ width: "min(520px, 100%)", padding: 32, border: "1px solid #26364c", borderRadius: 24, background: "#0e1b2d", boxShadow: "0 24px 80px rgba(0,0,0,.3)" }}>
          <div style={{ color: "#2dd4bf", fontSize: 13, fontWeight: 800, letterSpacing: ".12em" }}>VIZORA.TJ</div>
          <h1 style={{ margin: "14px 0 10px", fontSize: 30, lineHeight: 1.15 }}>Страница не смогла загрузиться</h1>
          <p style={{ margin: "0 0 24px", color: "#a9b7ca", lineHeight: 1.65 }}>Ваш аккаунт и данные сохранены. Перезагрузите страницу — система безопасно повторит загрузку.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button type="button" onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 12, padding: "13px 18px", background: "#0f8b7f", color: "white", fontWeight: 800, cursor: "pointer" }}>Перезагрузить</button>
            <a href="/" style={{ border: "1px solid #34455d", borderRadius: 12, padding: "12px 18px", color: "white", fontWeight: 700, textDecoration: "none" }}>На главную</a>
          </div>
        </section>
      </main>
    );
  }
}

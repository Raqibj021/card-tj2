import {
  AlertTriangle, BadgeCheck, Check, ExternalLink, FileSearch, History,
  RefreshCw, ShieldAlert, ShieldCheck, X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import AdminShell from "../components/admin/AdminShell";
import {
  moderationRepository, type ModerationCard, type ModerationReport,
  type ModerationVerification, type ModerationWorkspace
} from "../lib/moderationRepository";
import "./ModerationPage.css";

type Tab = "cards" | "documents" | "reports" | "history";

export default function ModerationPage() {
  const [tab, setTab] = useState<Tab>("cards");
  const [data, setData] = useState<ModerationWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const refresh = async () => {
    setLoading(true);
    try { setData(await moderationRepository.workspace()); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось загрузить проверки."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const note = (title: string, initial: string) => window.prompt(title, initial)?.trim() ?? "";
  const reviewCard = async (card: ModerationCard, decision: "approved" | "changes_requested" | "rejected") => {
    const comment = decision === "approved" ? "Данные проверены главным администратором" :
      note("Комментарий владельцу визитки", decision === "rejected" ? "Публикация отклонена" : "Исправьте указанные данные");
    if (decision !== "approved" && !comment) return;
    await run(() => moderationRepository.reviewCard(card.id, decision, comment), "Решение по визитке сохранено.");
  };
  const reviewVerification = async (item: ModerationVerification, decision: "approved" | "changes_requested" | "rejected") => {
    const comment = decision === "approved" ? "Документы подтверждены" :
      note("Комментарий пользователю", decision === "rejected" ? "Документы не подтверждают профессию" : "Нужны дополнительные документы");
    if (decision !== "approved" && !comment) return;
    await run(() => moderationRepository.reviewVerification(item.id, decision, comment), "Результат проверки документов сохранён.");
  };
  const resolveReport = async (item: ModerationReport, action: "dismiss" | "hide_card" | "restore_card") => {
    const comment = note("Комментарий к решению", action === "dismiss" ? "Нарушение не подтверждено" : "Решение принято по результатам жалобы");
    if (!comment) return;
    await run(() => moderationRepository.resolveReport(item.id, action, comment), "Жалоба обработана.");
  };
  const run = async (action: () => Promise<void>, success: string) => {
    try { await action(); await refresh(); setNotice(success); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Операция не выполнена."); }
  };
  const openDocument = async (path: string) => {
    try { window.open(await moderationRepository.documentUrl(path), "_blank", "noopener,noreferrer"); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Документ не открылся."); }
  };

  const workspace = data ?? { stats: { cards: 0, documents: 0, reports: 0, riskSignals: 0 }, cards: [], verifications: [], reports: [], audit: [] };
  return (
    <AdminShell title="Проверки и безопасность" description="Автоматические сигналы собираются в очередь. Окончательное решение принимает только главный администратор."
      actions={<button className="admin-toolbar-button" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={17} /> Обновить</button>}>
      {notice && <div className="admin-workspace-notice">{notice}</div>}
      <section className="moderation-stats">
        <Stat icon={BadgeCheck} label="Визитки" value={workspace.stats.cards} />
        <Stat icon={FileSearch} label="Документы" value={workspace.stats.documents} />
        <Stat icon={ShieldAlert} label="Жалобы" value={workspace.stats.reports} />
        <Stat icon={AlertTriangle} label="Сигналы риска" value={workspace.stats.riskSignals} warning />
      </section>
      <section className="moderation-console">
        <header className="moderation-tabs">
          <TabButton active={tab === "cards"} onClick={() => setTab("cards")} icon={BadgeCheck} text="Визитки" count={workspace.cards.length} />
          <TabButton active={tab === "documents"} onClick={() => setTab("documents")} icon={FileSearch} text="Документы" count={workspace.verifications.length} />
          <TabButton active={tab === "reports"} onClick={() => setTab("reports")} icon={ShieldAlert} text="Жалобы" count={workspace.reports.length} />
          <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={History} text="История" count={workspace.audit.length} />
        </header>
        {tab === "cards" && <div className="moderation-list">{workspace.cards.map(card => (
          <article key={card.id}>
            <div className="moderation-main"><span className="moderation-avatar">{card.name?.[0] || "V"}</span><div><strong>{card.name}</strong><p>{card.position || "Должность не указана"} · {card.organization || "Без организации"}</p><small>{card.phone || card.email || "Контакт не указан"}</small></div></div>
            <div className="moderation-flags">{card.riskSignals.map(signal => <span key={signal}><AlertTriangle size={14} /> {signal}</span>)}{!card.riskSignals.length && <span className="safe"><ShieldCheck size={14} /> Автопроверка пройдена</span>}</div>
            <div className="moderation-actions"><Link to={`/card/${card.slug}`} target="_blank"><ExternalLink size={16} /></Link><button className="approve" onClick={() => void reviewCard(card, "approved")}><Check size={16} /> Одобрить</button><button onClick={() => void reviewCard(card, "changes_requested")}>Исправить</button><button className="reject" onClick={() => void reviewCard(card, "rejected")}><X size={16} /> Отклонить</button></div>
          </article>
        ))}{!workspace.cards.length && <Empty text="Новых визиток для проверки нет." />}</div>}
        {tab === "documents" && <div className="moderation-list">{workspace.verifications.map(item => (
          <article key={item.id}>
            <div className="moderation-main"><span className="moderation-avatar document"><FileSearch size={20} /></span><div><strong>{item.name}</strong><p>{item.profession || "Категория не указана"}{item.requiresLicense ? " · требуется лицензия" : ""}</p><small>{item.email} · файлов: {item.documentPaths.length}</small></div></div>
            <div className="moderation-documents">{item.documentPaths.map((path, index) => <button key={path} onClick={() => void openDocument(path)}><FileSearch size={15} /> Документ {index + 1}</button>)}</div>
            <div className="moderation-actions"><button className="approve" onClick={() => void reviewVerification(item, "approved")}><Check size={16} /> Подтвердить</button><button onClick={() => void reviewVerification(item, "changes_requested")}>Запросить ещё</button><button className="reject" onClick={() => void reviewVerification(item, "rejected")}><X size={16} /> Отклонить</button></div>
          </article>
        ))}{!workspace.verifications.length && <Empty text="Заявок с документами нет." />}</div>}
        {tab === "reports" && <div className="moderation-list">{workspace.reports.map(item => (
          <article key={item.id}>
            <div className="moderation-main"><span className="moderation-avatar report"><ShieldAlert size={20} /></span><div><strong>{item.cardName}</strong><p>{item.reason}</p><small>{item.reporter} · {new Date(item.createdAt).toLocaleString("ru-RU")}</small></div></div>
            <p className="moderation-report-text">{item.details || "Дополнительное описание не указано."}</p>
            <div className="moderation-actions"><Link to={`/card/${item.cardSlug}`} target="_blank"><ExternalLink size={16} /></Link><button className="approve" onClick={() => void resolveReport(item, "dismiss")}>Отклонить жалобу</button><button className="reject" onClick={() => void resolveReport(item, "hide_card")}>Скрыть визитку</button></div>
          </article>
        ))}{!workspace.reports.length && <Empty text="Необработанных жалоб нет." />}</div>}
        {tab === "history" && <div className="moderation-history">{workspace.audit.map(item => <article key={item.id}><span><History size={16} /></span><div><strong>{actionLabel(item.action)}</strong><p>{String(item.details.note ?? item.details.reason ?? "Решение администратора")}</p><small>{new Date(item.createdAt).toLocaleString("ru-RU")}</small></div></article>)}{!workspace.audit.length && <Empty text="История решений пока пуста." />}</div>}
      </section>
    </AdminShell>
  );
}

function Stat({ icon: Icon, label, value, warning=false }: { icon: typeof BadgeCheck; label: string; value: number; warning?: boolean }) {
  return <article className={warning ? "warning" : ""}><span><Icon size={20} /></span><div><strong>{value}</strong><small>{label}</small></div></article>;
}
function TabButton({ active, onClick, icon: Icon, text, count }: { active: boolean; onClick: () => void; icon: typeof BadgeCheck; text: string; count: number }) {
  return <button className={active ? "active" : ""} onClick={onClick}><Icon size={17} /> {text}<b>{count}</b></button>;
}
function Empty({ text }: { text: string }) { return <div className="moderation-empty"><ShieldCheck size={25} /><p>{text}</p></div>; }
function actionLabel(action: string) {
  if (action.includes("card")) return "Решение по визитке";
  if (action.includes("verification")) return "Проверка документов";
  if (action.includes("report")) return "Решение по жалобе";
  return "Действие администратора";
}

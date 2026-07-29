import {
  Activity,
  BadgeCheck,
  Banknote,
  BellRing,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ContactRound,
  MailCheck,
  RefreshCw,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  UsersRound,
  WalletCards
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { Link } from "react-router";
import AdminShell from "../components/admin/AdminShell";
import { adminRepository, type AdminSnapshot, type LaunchPreview } from "../lib/adminRepository";

const empty: AdminSnapshot = {
  status: "prelaunch", officialLaunchAt: null, promotionLimit: 50, promotionClaimed: 0,
  users: 0, cards: 0, publicCards: 0, organizations: 0, employees: 0, pendingReviews: 0,
  pendingPayments: 0, leads: 0, openTickets: 0, serviceOrders: 0, contracts: 0,
  queuedEmails: 0, views: 0, revenue: 0, recentCards: [], recentOrganizations: [],
  recentPayments: [], recentTickets: []
};

export default function AdminPage() {
  const [data, setData] = useState(empty);
  const [preview, setPreview] = useState<LaunchPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [confirmText, setConfirmText] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const [snapshot, cleanup] = await Promise.all([
        adminRepository.snapshot(),
        adminRepository.launchPreview().catch(() => null)
      ]);
      setData(snapshot);
      setPreview(cleanup);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось загрузить панель.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const attention = data.pendingPayments + data.pendingReviews + data.openTickets;
  const actions = [
    { title: "Проверить оплаты", text: "Код тарифа создаётся только после вашего подтверждения.", count: data.pendingPayments, to: "/admin/payments", icon: Banknote, tone: "amber" },
    { title: "Проверить визитки", text: "Документы, профессия и данные перед публикацией.", count: data.pendingReviews, to: "/admin/moderation", icon: BadgeCheck, tone: "violet" },
    { title: "Ответить пользователям", text: "Открытые вопросы, жалобы и запросы поддержки.", count: data.openTickets, to: "/admin/support", icon: BellRing, tone: "blue" },
    { title: "Обработать заказы", text: "Печать, QR, NFC, дизайн и договоры.", count: data.serviceOrders, to: "/admin/commerce", icon: ShoppingBag, tone: "green" }
  ];

  return (
    <AdminShell
      title="Центр управления"
      description="Автоматические процессы работают сами. Здесь собраны только решения, которые требуют вашего подтверждения."
      actions={<button className="admin-toolbar-button" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={16} /> Обновить</button>}
    >
      {notice && <div className="admin-workspace-notice">{notice}</div>}
      <section className="admin-command-hero">
        <div>
          <span className={data.status === "live" ? "live" : ""}><ShieldCheck size={14} /> {data.status === "live" ? "ПЛАТФОРМА ЗАПУЩЕНА" : "РЕЖИМ ПОДГОТОВКИ"}</span>
          <h2>{attention ? `${attention} решений ожидают вас` : "Срочных решений нет"}</h2>
          <p>Система сама сохраняет заявки, ставит письма в очередь, считает показатели и готовит проверки.</p>
        </div>
        <div className="admin-command-promo"><small>Стартовая акция</small><strong>{data.promotionClaimed} / {data.promotionLimit}</strong><span>бесплатных визиток занято</span></div>
      </section>

      <section className="admin-command-stats">
        <Stat label="Пользователи" value={data.users} icon={UsersRound} detail={`${data.organizations} организаций`} />
        <Stat label="Визитки" value={data.cards} icon={WalletCards} detail={`${data.publicCards} опубликовано`} />
        <Stat label="Просмотры" value={data.views} icon={Activity} detail="по всем профилям" />
        <Stat label="Доход" value={`${data.revenue.toLocaleString("ru-RU")} с.`} icon={Banknote} detail="подтверждённые оплаты" />
      </section>

      <div className="admin-command-layout">
        <section className="admin-command-panel">
          <header><div><small>РУЧНЫЕ РЕШЕНИЯ</small><h2>Требуют внимания</h2></div><strong>{attention}</strong></header>
          <div className="admin-command-actions">
            {actions.map(({ title, text, count, to, icon: Icon, tone }) => (
              <Link to={to} key={to}>
                <span className={tone}><Icon size={20} /></span>
                <div><strong>{title}</strong><small>{text}</small></div>
                <b>{count}</b><ChevronRight size={17} />
              </Link>
            ))}
          </div>
        </section>

        <section className="admin-command-panel automation">
          <header><div><small>АВТОМАТИЗАЦИЯ</small><h2>Система выполняет сама</h2></div><CheckCircle2 size={22} /></header>
          <AutoRow icon={MailCheck} title="Служебные письма" text={`${data.queuedEmails} в очереди на отправку`} />
          <AutoRow icon={ContactRound} title="Лиды и CRM" text={`${data.leads} обращений сохранено`} />
          <AutoRow icon={Building2} title="Организации" text={`${data.employees} сотрудников учтено`} />
          <AutoRow icon={Clock3} title="Контроль сроков" text="Черновики, тарифы и статусы отслеживаются" />
        </section>
      </div>

      <section className="admin-command-panel admin-launch">
        <header><div><small>ОФИЦИАЛЬНЫЙ ЗАПУСК</small><h2>{data.status === "live" ? "Vizora уже запущена" : "Очистка тестовых данных и старт"}</h2></div><Rocket size={22} /></header>
        {data.status === "live" ? (
          <p>Дата запуска: {data.officialLaunchAt ? new Date(data.officialLaunchAt).toLocaleString("ru-RU") : "зафиксирована системой"}.</p>
        ) : (
          <>
            <p>Перед запуском можно удалить тестовые записи. Администраторский аккаунт, настройки и справочники сохраняются.</p>
            <div className="admin-launch-counts">
              <span>Пользователи <b>{preview?.users ?? 0}</b></span><span>Визитки <b>{preview?.cards ?? 0}</b></span>
              <span>Организации <b>{preview?.organizations ?? 0}</b></span><span>Заявки <b>{preview?.orders ?? 0}</b></span>
            </div>
            <label>Для критического действия введите <b>ЗАПУСК VIZORA</b><input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} /></label>
            <div className="admin-launch-actions">
              <button type="button" className="danger" disabled={confirmText !== "ЗАПУСК VIZORA"} onClick={async () => {
                if (!window.confirm("Удалить тестовые данные? Отменить действие будет невозможно.")) return;
                try { await adminRepository.clearPrelaunchData(confirmText); setNotice("Тестовые данные удалены."); await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "Ошибка очистки."); }
              }}>Удалить тестовые данные</button>
              <button type="button" disabled={confirmText !== "ЗАПУСК VIZORA"} onClick={async () => {
                if (!window.confirm("Начать официальный запуск платформы?")) return;
                try { await adminRepository.startOfficialLaunch(confirmText); setNotice("Официальный запуск выполнен."); await refresh(); } catch (error) { setNotice(error instanceof Error ? error.message : "Ошибка запуска."); }
              }}>Начать официальный запуск</button>
            </div>
          </>
        )}
      </section>
    </AdminShell>
  );
}

function Stat({ label, value, icon: Icon, detail }: { label: string; value: string | number; icon: ComponentType<{ size?: number }>; detail: string }) {
  return <article><span><Icon size={20} /></span><div><small>{label}</small><strong>{typeof value === "number" ? value.toLocaleString("ru-RU") : value}</strong><p>{detail}</p></div></article>;
}

function AutoRow({ icon: Icon, title, text }: { icon: ComponentType<{ size?: number }>; title: string; text: string }) {
  return <div className="admin-auto-row"><span><Icon size={18} /></span><div><strong>{title}</strong><small>{text}</small></div><i><CheckCircle2 size={16} /> Активно</i></div>;
}

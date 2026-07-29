import {
  Activity, BadgeCheck, Banknote, BellRing, Building2, CheckCircle2, ChevronRight,
  CircleDollarSign, ContactRound, CreditCard, FileCheck2, FileSignature, HelpCircle,
  LayoutDashboard, Mail, Megaphone, RefreshCw, Rocket, Search, ShieldAlert,
  ShieldCheck, ShoppingBag, TicketCheck, Trash2, UserRoundCheck, Users, WalletCards
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { Link } from "react-router";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";
import { adminRepository, type AdminSnapshot, type LaunchPreview } from "../lib/adminRepository";

type Section = "overview" | "users" | "content" | "business" | "messages" | "launch";
const initial: AdminSnapshot = {
  status: "prelaunch", officialLaunchAt: null, promotionLimit: 50, promotionClaimed: 0,
  users: 0, cards: 0, publicCards: 0, organizations: 0, employees: 0, pendingReviews: 0,
  pendingPayments: 0, leads: 0, openTickets: 0, serviceOrders: 0, contracts: 0,
  queuedEmails: 0, views: 0, revenue: 0, recentCards: [], recentOrganizations: [],
  recentPayments: [], recentTickets: []
};

const nav: Array<{ id: Section; label: string; icon: ComponentType<{ size?: number }> }> = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "users", label: "Пользователи", icon: Users },
  { id: "content", label: "Визитки и проверки", icon: WalletCards },
  { id: "business", label: "Оплаты и заказы", icon: Banknote },
  { id: "messages", label: "Поддержка и письма", icon: BellRing },
  { id: "launch", label: "Официальный запуск", icon: Rocket }
];

const number = (value: number) => value.toLocaleString("ru-RU");
const date = (value: string) => new Date(value).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" });

export default function AdminPage() {
  const { profile, signOut } = useAuth();
  const [section, setSection] = useState<Section>("overview");
  const [snapshot, setSnapshot] = useState(initial);
  const [preview, setPreview] = useState<LaunchPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [search, setSearch] = useState("");
  const visibleNav = profile?.role === "admin" ? nav : nav.filter((item) => item.id !== "launch");

  const refresh = async () => {
    setLoading(true);
    try {
      const [next, cleanup] = await Promise.all([
        adminRepository.snapshot(),
        adminRepository.launchPreview().catch(() => null)
      ]);
      setSnapshot(next);
      setPreview(cleanup);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось загрузить данные.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);

  const promotionPercent = Math.min(100, snapshot.promotionLimit ? snapshot.promotionClaimed / snapshot.promotionLimit * 100 : 0);
  const quickStats = [
    ["Пользователи", snapshot.users, Users, "Все зарегистрированные аккаунты"],
    ["Визитки", snapshot.cards, WalletCards, `${snapshot.publicCards} опубликовано`],
    ["Организации", snapshot.organizations, Building2, `${snapshot.employees} сотрудников`],
    ["Просмотры", snapshot.views, Activity, "Суммарно по визиткам"]
  ] as const;
  const filteredCards = useMemo(() => snapshot.recentCards.filter((item) =>
    `${item.name} ${item.slug}`.toLowerCase().includes(search.toLowerCase())), [snapshot.recentCards, search]);

  return <main className="admin-console">
    <aside className="admin-console-sidebar">
      <Link to="/" className="admin-console-logo"><BrandLogo light /></Link>
      <div className="admin-console-badge"><ShieldCheck size={15} /><span><b>Панель управления</b><small>{snapshot.status === "live" ? "Платформа запущена" : "Режим подготовки"}</small></span></div>
      <nav>{visibleNav.map(({ id, label, icon: Icon }) => <button className={section === id ? "active" : ""} onClick={() => setSection(id)} key={id}><Icon size={18} />{label}{id === "launch" && snapshot.status === "prelaunch" && <i />}</button>)}</nav>
      <div className="admin-console-profile"><span>{profile?.fullName?.slice(0, 1) || "A"}</span><div><b>{profile?.fullName || "Администратор"}</b><small>{profile?.email}</small></div><button onClick={() => void signOut()}>Выйти</button></div>
    </aside>

    <section className="admin-console-main">
      <header className="admin-console-header">
        <div><span>VIZORA CONTROL CENTER</span><h1>{visibleNav.find((item) => item.id === section)?.label}</h1></div>
        <div><label><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск в панели" /></label><button className="admin-refresh" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={17} /> Обновить</button><Link to="/" className="admin-site-link">Открыть сайт <ChevronRight size={16} /></Link></div>
      </header>
      {notice && <div className="admin-console-alert"><ShieldAlert size={18} />{notice}</div>}

      {section === "overview" && <>
        <section className="admin-welcome">
          <div><span className={snapshot.status === "live" ? "live" : ""}>{snapshot.status === "live" ? "LIVE" : "PRE-LAUNCH"}</span><h2>Добро пожаловать, {profile?.fullName?.split(" ")[0] || "администратор"}</h2><p>Все ключевые процессы платформы собраны в одном защищённом рабочем пространстве.</p></div>
          <div><small>Первые 50 бесплатных визиток</small><strong>{snapshot.promotionClaimed} / {snapshot.promotionLimit}</strong><i><b style={{ width: `${promotionPercent}%` }} /></i></div>
        </section>
        <div className="admin-kpi-grid">{quickStats.map(([label, value, Icon, detail]) => <article key={label}><span><Icon size={20} /></span><div><small>{label}</small><strong>{number(value)}</strong><p>{detail}</p></div></article>)}</div>
        <div className="admin-console-columns">
          <Panel title="Требуют внимания" subtitle="Очереди, где необходимо решение администратора">
            <ActionRow icon={BadgeCheck} label="Проверка визиток и документов" value={snapshot.pendingReviews} to="/admin/moderation" tone="purple" />
            <ActionRow icon={CreditCard} label="Подтверждение оплат" value={snapshot.pendingPayments} to="/admin/payments" tone="amber" />
            <ActionRow icon={HelpCircle} label="Открытые обращения поддержки" value={snapshot.openTickets} to="/admin/support" tone="blue" />
            <ActionRow icon={Mail} label="Письма в очереди" value={snapshot.queuedEmails} tone="green" />
          </Panel>
          <Panel title="Бизнес-показатели" subtitle="Заявки, услуги, договоры и поступления">
            <div className="admin-business-grid"><Metric label="Лиды" value={snapshot.leads} icon={ContactRound} /><Metric label="Заказы" value={snapshot.serviceOrders} icon={ShoppingBag} /><Metric label="Договоры" value={snapshot.contracts} icon={FileSignature} /><Metric label="Оплачено" value={`${number(snapshot.revenue)} c.`} icon={CircleDollarSign} /></div>
            <Link className="admin-panel-link" to="/admin/commerce">Управление заказами и договорами <ChevronRight size={16} /></Link>
          </Panel>
        </div>
      </>}

      {section === "users" && <>
        <SectionHead title="Пользователи и организации" text="Аккаунты, роли, организации, сотрудники и доступы." />
        <div className="admin-kpi-grid"><MetricCard label="Физические лица" value={snapshot.users} icon={Users} /><MetricCard label="Организации" value={snapshot.organizations} icon={Building2} /><MetricCard label="Сотрудники" value={snapshot.employees} icon={UserRoundCheck} /><MetricCard label="Активные визитки" value={snapshot.publicCards} icon={CheckCircle2} /></div>
        <Panel title="Последние организации" subtitle="Новые корпоративные аккаунты и состояние проверки">
          <DataTable heads={["Организация", "Сотрудники", "Статус", "Дата"]} rows={snapshot.recentOrganizations.map((item) => [item.name, number(item.employees), <Status value={item.status} />, date(item.createdAt)])} empty="Организации ещё не зарегистрированы." />
        </Panel>
      </>}

      {section === "content" && <>
        <SectionHead title="Визитки, каталог и модерация" text="Контроль публикаций, документов, жалоб и запрещённых профессий." actions={<Link to="/admin/moderation" className="admin-primary-action">Открыть очередь проверки</Link>} />
        <div className="admin-kpi-grid"><MetricCard label="Всего визиток" value={snapshot.cards} icon={WalletCards} /><MetricCard label="Опубликовано" value={snapshot.publicCards} icon={CheckCircle2} /><MetricCard label="Ожидают проверки" value={snapshot.pendingReviews} icon={FileCheck2} /><MetricCard label="Просмотры" value={snapshot.views} icon={Activity} /></div>
        <Panel title="Последние визитки" subtitle="Недавно созданные и обновлённые профили">
          <DataTable heads={["Владелец", "Ссылка", "Статус", "Создано"]} rows={filteredCards.map((item) => [item.name, <Link to={`/card/${item.slug}`}>/{item.slug}</Link>, <Status value={item.status} />, date(item.createdAt)])} empty="Визитки не найдены." />
        </Panel>
      </>}

      {section === "business" && <>
        <SectionHead title="Оплаты, тарифы и производство" text="Проверка переводов, активационные коды, заказы услуг и договоры." actions={<><Link to="/admin/payments" className="admin-primary-action">Проверить оплаты</Link><Link to="/admin/commerce" className="admin-secondary-action">Заказы и договоры</Link></>} />
        <div className="admin-kpi-grid"><MetricCard label="Ожидают оплаты" value={snapshot.pendingPayments} icon={CreditCard} /><MetricCard label="Заказы услуг" value={snapshot.serviceOrders} icon={ShoppingBag} /><MetricCard label="Договоры" value={snapshot.contracts} icon={FileSignature} /><MetricCard label="Выручка" value={`${number(snapshot.revenue)} c.`} icon={Banknote} /></div>
        <Panel title="Последние платежи" subtitle="Ручная проверка переводов на банковские реквизиты">
          <DataTable heads={["Номер", "Заказчик", "Сумма", "Статус", "Дата"]} rows={snapshot.recentPayments.map((item) => [item.number, item.customer, `${number(item.amount)} c.`, <Status value={item.status} />, date(item.createdAt)])} empty="Заявок на оплату пока нет." />
        </Panel>
      </>}

      {section === "messages" && <>
        <SectionHead title="Коммуникации" text="Поддержка, автоматические письма, уведомления, новости и акции." actions={<Link to="/admin/support" className="admin-primary-action">Ответить пользователям</Link>} />
        <div className="admin-kpi-grid"><MetricCard label="Открытые обращения" value={snapshot.openTickets} icon={TicketCheck} /><MetricCard label="Письма в очереди" value={snapshot.queuedEmails} icon={Mail} /><MetricCard label="Лиды" value={snapshot.leads} icon={ContactRound} /><MetricCard label="Рассылки" value="Ручные" icon={Megaphone} /></div>
        <Panel title="Последние обращения" subtitle="Запросы пользователей и ответы службы поддержки">
          <DataTable heads={["Номер", "Тема", "Статус", "Дата"]} rows={snapshot.recentTickets.map((item) => [item.number, item.subject, <Status value={item.status} />, date(item.createdAt)])} empty="Новых обращений нет." />
        </Panel>
      </>}

      {section === "launch" && <LaunchCenter snapshot={snapshot} preview={preview} confirmText={confirmText} setConfirmText={setConfirmText} busy={loading} onNotice={setNotice} onRefresh={refresh} />}
    </section>
  </main>;
}

function LaunchCenter({ snapshot, preview, confirmText, setConfirmText, busy, onNotice, onRefresh }: { snapshot: AdminSnapshot; preview: LaunchPreview | null; confirmText: string; setConfirmText: (value: string) => void; busy: boolean; onNotice: (value: string) => void; onRefresh: () => Promise<void> }) {
  const [working, setWorking] = useState(false);
  const run = async (action: "clear" | "launch") => {
    setWorking(true);
    try {
      if (action === "clear") { await adminRepository.clearPrelaunchData(confirmText); onNotice("Тестовые данные удалены. Администраторы и модераторы сохранены."); }
      else { const started = await adminRepository.startOfficialLaunch(confirmText); onNotice(`Официальный запуск подтверждён: ${date(started)}`); }
      setConfirmText(""); await onRefresh();
    } catch (error) { onNotice(error instanceof Error ? error.message : "Операция не выполнена."); }
    finally { setWorking(false); }
  };
  if (snapshot.status === "live") return <div className="launch-live-card"><span><Rocket size={28} /></span><h2>Vizora официально запущена</h2><p>Дата запуска: {snapshot.officialLaunchAt ? date(snapshot.officialLaunchAt) : "зафиксирована"}. Очистка данных до запуска заблокирована навсегда.</p><div><CheckCircle2 size={18} /> Регистрации и акция для первых {snapshot.promotionLimit} пользователей активны.</div></div>;
  const total = preview ? Object.values(preview).reduce((sum, value) => sum + value, 0) : 0;
  return <>
    <SectionHead title="Центр официального запуска" text="Безопасная подготовка базы и однократный перевод платформы в рабочий режим." />
    <div className="launch-warning"><ShieldAlert size={22} /><div><strong>Платформа находится в режиме подготовки</strong><p>До запуска можно очищать тестовые регистрации. После официального запуска эта операция будет автоматически заблокирована.</p></div></div>
    <div className="launch-grid">
      <article><span className="launch-step">01</span><h3>Проверить тестовые данные</h3><p>Будут удалены только обычные аккаунты и связанные с ними записи, созданные до запуска. Администраторы и модераторы сохраняются.</p><div className="cleanup-preview"><b>{preview?.users ?? 0}<small>аккаунтов</small></b><b>{preview?.cards ?? 0}<small>визиток</small></b><b>{preview?.organizations ?? 0}<small>организаций</small></b><b>{total}<small>всего записей</small></b></div></article>
      <article><span className="launch-step">02</span><h3>Очистить тестовую базу</h3><p>Введите точную фразу <b>ОЧИСТИТЬ ТЕСТОВЫЕ ДАННЫЕ</b>. Операция фиксируется в журнале безопасности.</p><input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder="Введите контрольную фразу" /><button className="launch-danger" disabled={working || busy || confirmText !== "ОЧИСТИТЬ ТЕСТОВЫЕ ДАННЫЕ"} onClick={() => void run("clear")}><Trash2 size={17} /> Очистить тестовые данные</button></article>
      <article className="launch-final"><span className="launch-step">03</span><h3>Начать официальный запуск</h3><p>После финальной проверки введите <b>ЗАПУСТИТЬ VIZORA</b>. Будет зафиксирована дата запуска и включён отсчёт первых 50 бесплатных регистраций.</p><input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder="Введите контрольную фразу" /><button disabled={working || busy || confirmText !== "ЗАПУСТИТЬ VIZORA"} onClick={() => void run("launch")}><Rocket size={17} /> Запустить платформу</button></article>
    </div>
  </>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="admin-console-panel"><header><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</section>; }
function SectionHead({ title, text, actions }: { title: string; text: string; actions?: React.ReactNode }) { return <div className="admin-section-head"><div><h2>{title}</h2><p>{text}</p></div>{actions && <div>{actions}</div>}</div>; }
function ActionRow({ icon: Icon, label, value, tone, to }: { icon: ComponentType<{ size?: number }>; label: string; value: number; tone: string; to?: string }) { const content = <><span className={tone}><Icon size={18} /></span><div><b>{label}</b><small>{value ? `${value} требуют внимания` : "Очередь пуста"}</small></div><strong>{value}</strong><ChevronRight size={16} /></>; return to ? <Link className="admin-action-row" to={to}>{content}</Link> : <div className="admin-action-row">{content}</div>; }
function Metric({ label, value, icon: Icon }: { label: string; value: number | string; icon: ComponentType<{ size?: number }> }) { return <div className="admin-mini-metric"><Icon size={17} /><small>{label}</small><strong>{typeof value === "number" ? number(value) : value}</strong></div>; }
function MetricCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: ComponentType<{ size?: number }> }) { return <article><span><Icon size={20} /></span><div><small>{label}</small><strong>{typeof value === "number" ? number(value) : value}</strong></div></article>; }
function Status({ value }: { value: string }) { return <span className={`admin-record-status status-${value}`}>{value.replaceAll("_", " ")}</span>; }
function DataTable({ heads, rows, empty }: { heads: string[]; rows: React.ReactNode[][]; empty: string }) { return <div className="admin-console-table"><table><thead><tr>{heads.map((head) => <th key={head}>{head}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table>{!rows.length && <div>{empty}</div>}</div>; }

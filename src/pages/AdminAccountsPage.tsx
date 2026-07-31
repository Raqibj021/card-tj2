import {
  Ban, Building2, CheckCircle2, ChevronRight, ContactRound, FilePenLine,
  RefreshCw, Search, ShieldAlert, Undo2, UsersRound, WalletCards, X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/admin/AdminShell";
import {
  adminRepository, type AdminAccount, type AdminOrganization, type AdminOrganizationDetail
} from "../lib/adminRepository";
import "./AdminAccountsPage.css";

type View = "users" | "organizations";

export default function AdminAccountsPage() {
  const [view, setView] = useState<View>("users");
  const [search, setSearch] = useState("");
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [organizations, setOrganizations] = useState<AdminOrganization[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<AdminAccount | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<AdminOrganizationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  const refresh = async (query = search) => {
    setLoading(true);
    try {
      const result = await adminRepository.accounts(query);
      setAccounts(result.accounts);
      setOrganizations(result.organizations);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось загрузить аккаунты.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const stats = useMemo(() => ({
    users: accounts.length,
    blocked: accounts.filter((item) => item.status === "blocked").length,
    duplicates: accounts.filter((item) => item.duplicateSignals > 0).length,
    organizations: organizations.length
  }), [accounts, organizations]);

  const openOrganization = async (item: AdminOrganization) => {
    setNotice("");
    try {
      setSelectedOrganization(await adminRepository.organizationDetail(item.id));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось открыть организацию.");
    }
  };

  const changeStatus = async (account: AdminAccount) => {
    const blocking = account.status !== "blocked";
    const reason = blocking
      ? window.prompt("Причина блокировки. Она попадёт в журнал администратора:", "Проверка безопасности")
      : "Восстановлено главным администратором";
    if (!reason) return;
    if (blocking && !window.confirm(`Заблокировать аккаунт ${account.email}? Вход будет отключён, публикации скрыты.`)) return;
    try {
      await adminRepository.setAccountStatus(account.id, blocking ? "blocked" : "active", reason);
      setSelectedAccount(null);
      setNotice(blocking ? "Аккаунт заблокирован, его публикации скрыты." : "Доступ к аккаунту восстановлен.");
      await refresh();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось изменить статус.");
    }
  };

  const reviewOrganization = async (
    organization: AdminOrganizationDetail,
    decision: "approved" | "rejected" | "changes_requested"
  ) => {
    const approving = decision === "approved";
    const label = approving ? "одобрить" : decision === "changes_requested" ? "вернуть на исправление" : "отклонить";
    const defaultNote = decision === "changes_requested"
        ? "Уточните данные организации и отправьте заявку повторно."
        : "";
    const note = approving ? "" : window.prompt("Комментарий пользователю (обязательно):", defaultNote);
    if (!approving && (note === null || !note.trim())) return;
    if (!window.confirm(`${label[0].toUpperCase()}${label.slice(1)} организацию «${organization.name}»?`)) return;
    setLoading(true);
    try {
      await adminRepository.reviewOrganization(organization.id, decision, note ?? "");
      const detail = await adminRepository.organizationDetail(organization.id);
      setSelectedOrganization(detail);
      await refresh();
      setNotice(
        approving
          ? "Организация одобрена. Пользователь получил уведомление и доступ к рабочему кабинету."
          : decision === "changes_requested"
            ? "Заявка возвращена на исправление. Комментарий отправлен пользователю."
            : "Заявка отклонена. Причина отправлена пользователю."
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось сохранить решение.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell
      title="Пользователи и организации"
      description="Контроль аккаунтов, корпоративных структур, сотрудников и связанных визиток. Система автоматически отмечает подозрительные совпадения."
      actions={<button className="admin-toolbar-button" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={16} /> Обновить</button>}
    >
      {notice && <div className="admin-workspace-notice">{notice}</div>}
      <section className="admin-account-stats">
        <AccountStat icon={UsersRound} label="Аккаунты" value={stats.users} />
        <AccountStat icon={Building2} label="Организации" value={stats.organizations} />
        <AccountStat icon={ShieldAlert} label="Совпадения" value={stats.duplicates} warning={stats.duplicates > 0} />
        <AccountStat icon={Ban} label="Заблокированы" value={stats.blocked} warning={stats.blocked > 0} />
      </section>

      <section className="admin-accounts-console">
        <header>
          <div className="admin-account-tabs">
            <button className={view === "users" ? "active" : ""} onClick={() => setView("users")}><ContactRound size={16} /> Пользователи</button>
            <button className={view === "organizations" ? "active" : ""} onClick={() => setView("organizations")}><Building2 size={16} /> Организации</button>
          </div>
          <label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Имя, почта, телефон или организация" /></label>
        </header>

        <div className={`admin-account-list ${view === "organizations" ? "organizations" : ""}`}>
          {view === "users" ? accounts.map((item) => (
            <button key={item.id} onClick={() => setSelectedAccount(item)}>
              <span className="admin-account-avatar">{item.fullName?.slice(0, 1).toUpperCase() || "U"}</span>
              <span className="admin-account-person"><strong>{item.fullName || "Без имени"}</strong><small>{item.email || item.phone || "Контакт не указан"}</small></span>
              <span><small>Визитки</small><b>{item.cards}</b></span>
              <span><small>Организации</small><b>{item.organizations}</b></span>
              <span className={item.duplicateSignals ? "admin-risk risk" : "admin-risk"}>{item.duplicateSignals ? <ShieldAlert size={14} /> : <CheckCircle2 size={14} />}{item.duplicateSignals ? `${item.duplicateSignals} совп.` : "Чисто"}</span>
              <span className={`admin-account-status ${item.status}`}>{item.status === "blocked" ? "Заблокирован" : "Активен"}</span>
              <ChevronRight size={17} />
            </button>
          )) : organizations.map((item) => (
            <button key={item.id} onClick={() => void openOrganization(item)}>
              <span className="admin-account-avatar organization"><Building2 size={18} /></span>
              <span className="admin-account-person"><strong>{item.name}</strong><small>{item.ownerName} · {item.ownerEmail}</small></span>
              <span><small>Отделы</small><b>{item.departments}</b></span>
              <span><small>Сотрудники</small><b>{item.employees}</b></span>
              <span><small>Визитки</small><b>{item.cards}</b></span>
              <span className={`admin-account-status ${item.status}`}>{item.status}</span>
              <ChevronRight size={17} />
            </button>
          ))}
          {!loading && ((view === "users" && !accounts.length) || (view === "organizations" && !organizations.length)) && <div className="table-empty">Ничего не найдено.</div>}
        </div>
      </section>

      {selectedAccount && (
        <aside className="admin-detail-drawer">
          <button className="admin-drawer-close" onClick={() => setSelectedAccount(null)}><X size={18} /></button>
          <small>АККАУНТ</small><h2>{selectedAccount.fullName || "Без имени"}</h2><p>{selectedAccount.email}</p>
          <div className="admin-drawer-grid">
            <span><small>Телефон</small><strong>{selectedAccount.phone || "—"}</strong></span>
            <span><small>Создан</small><strong>{new Date(selectedAccount.createdAt).toLocaleDateString("ru-RU")}</strong></span>
            <span><small>Визитки</small><strong>{selectedAccount.cards}</strong></span>
            <span><small>Организации</small><strong>{selectedAccount.organizations}</strong></span>
          </div>
          {selectedAccount.duplicateSignals > 0 && <div className="admin-drawer-warning"><ShieldAlert size={18} /><div><strong>Найдены совпадения</strong><span>Проверьте повторяющийся телефон или e-mail перед решением.</span></div></div>}
          {selectedAccount.statusReason && <div className="admin-drawer-reason"><small>Последняя причина изменения</small><p>{selectedAccount.statusReason}</p></div>}
          <button className={selectedAccount.status === "blocked" ? "restore" : "block"} onClick={() => void changeStatus(selectedAccount)}>
            {selectedAccount.status === "blocked" ? <><Undo2 size={17} /> Восстановить доступ</> : <><Ban size={17} /> Заблокировать аккаунт</>}
          </button>
        </aside>
      )}

      {selectedOrganization && (
        <aside className="admin-detail-drawer wide">
          <button className="admin-drawer-close" onClick={() => setSelectedOrganization(null)}><X size={18} /></button>
          <small>ОРГАНИЗАЦИЯ</small><h2>{selectedOrganization.name}</h2><p>{selectedOrganization.legalName}</p>
          <div className="admin-drawer-grid">
            <span><small>Владелец</small><strong>{selectedOrganization.ownerName}</strong></span>
            <span><small>Статус</small><strong>{selectedOrganization.status}</strong></span>
            <span><small>Отделы</small><strong>{selectedOrganization.departments}</strong></span>
            <span><small>Сотрудники</small><strong>{selectedOrganization.employees}</strong></span>
            {selectedOrganization.organizationType && <span><small>Тип</small><strong>{selectedOrganization.organizationType}</strong></span>}
            {selectedOrganization.planCode && <span><small>Тариф</small><strong>{selectedOrganization.planCode} · {selectedOrganization.employeeLimit ?? "—"} сотрудников</strong></span>}
          </div>
          {["pending", "changes_requested", "rejected"].includes(selectedOrganization.status) && (
            <section className="admin-organization-review">
              <small>РЕШЕНИЕ ПО ЗАЯВКЕ</small>
              <h3>Проверка организации</h3>
              <p>Комментарий автоматически появится у владельца в разделе «Уведомления».</p>
              <div>
                <button className="approve" disabled={loading} onClick={() => void reviewOrganization(selectedOrganization, "approved")}><CheckCircle2 size={17} /> Одобрить</button>
                <button className="changes" disabled={loading} onClick={() => void reviewOrganization(selectedOrganization, "changes_requested")}><FilePenLine size={17} /> На исправление</button>
                <button className="reject" disabled={loading} onClick={() => void reviewOrganization(selectedOrganization, "rejected")}><X size={17} /> Отклонить</button>
              </div>
            </section>
          )}
          {selectedOrganization.status === "approved" && (
            <div className="admin-organization-approved"><CheckCircle2 size={18} /><span>Организация одобрена. Владелец управляет структурой и визитками сотрудников.</span></div>
          )}
          <h3>Структура организации</h3>
          <div className="admin-structure-list">
            {selectedOrganization.structure.map((item) => <div key={item.id} className={item.parentId ? "child" : ""}><Building2 size={15} /><span>{item.name}</span><b>{item.employees}</b></div>)}
            {!selectedOrganization.structure.length && <p>Отделы пока не созданы.</p>}
          </div>
          <h3>Сотрудники и визитки</h3>
          <div className="admin-member-list">
            {selectedOrganization.members.map((item) => <div key={item.id}><span><strong>{item.name}</strong><small>{item.position || item.department || item.email}</small></span><span><WalletCards size={14} /> {item.cardSlug ? item.cardStatus : "Нет визитки"}</span></div>)}
            {!selectedOrganization.members.length && <p>Сотрудники пока не добавлены.</p>}
          </div>
        </aside>
      )}
      {(selectedAccount || selectedOrganization) && <button aria-label="Закрыть карточку" className="admin-drawer-backdrop" onClick={() => { setSelectedAccount(null); setSelectedOrganization(null); }} />}
    </AdminShell>
  );
}

function AccountStat({ icon: Icon, label, value, warning = false }: { icon: typeof UsersRound; label: string; value: number; warning?: boolean }) {
  return <article className={warning ? "warning" : ""}><span><Icon size={19} /></span><div><strong>{value.toLocaleString("ru-RU")}</strong><small>{label}</small></div></article>;
}

import { Banknote, CheckCircle2, ChevronRight, Clock3, MessageSquareText, PhoneCall, Search, UserRoundCheck, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { leadRepository, type Lead, type LeadStatus, type PaymentLeadStatus } from "../lib/leadRepository";

const statusLabels: Record<LeadStatus, string> = {
  new: "Новый",
  contacted: "Связался",
  in_progress: "В работе",
  completed: "Завершён"
};

const paymentLabels: Record<PaymentLeadStatus, string> = {
  not_required: "Не требуется",
  pending: "Ожидается",
  paid: "Оплачено"
};

export default function CrmPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LeadStatus | "all">("all");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const selected = leads.find((lead) => lead.id === selectedId);
  const filtered = useMemo(() => leads.filter((lead) => {
    const matches = `${lead.clientName} ${lead.phone} ${lead.service}`.toLowerCase().includes(query.toLowerCase());
    return matches && (filter === "all" || lead.status === filter);
  }), [leads, query, filter]);
  const refreshRemote = async () => {
    const items = await leadRepository.listRemote();
    setLeads(items);
    setSelectedId((current) =>
      items.some((lead) => lead.id === current) ? current : items[0]?.id ?? ""
    );
  };

  const saveChanges = async (
    id: string,
    changes: Partial<Pick<Lead, "status" | "paymentStatus" | "notes" | "service">>
  ) => {
    setBusy(true);
    setNotice("");
    try {
      await leadRepository.update(id, changes);
      await refreshRemote();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось сохранить изменения.");
      try { await refreshRemote(); } catch { /* Keep the current screen and error. */ }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    void leadRepository.listRemote()
      .then((items) => {
        if (!active) return;
        setLeads(items);
        setSelectedId(items[0]?.id ?? "");
      })
      .catch((error) => {
        if (active) setNotice(error instanceof Error ? error.message : "Не удалось загрузить обращения.");
      });
    return () => { active = false; };
  }, []);

  const stats = [
    { title: "Все клиенты", value: leads.length, icon: UsersRound },
    { title: "Новые заявки", value: leads.filter((x) => x.status === "new").length, icon: MessageSquareText },
    { title: "В работе", value: leads.filter((x) => x.status === "in_progress").length, icon: Clock3 },
    { title: "Завершено", value: leads.filter((x) => x.status === "completed").length, icon: CheckCircle2 }
  ];

  return (
    <main className="crm-page">
      <div className="site-container py-10 md:py-14">
        <div><span className="section-label">Мини-CRM</span><h1 className="page-title">Клиенты и обращения</h1><p className="page-copy">Лиды из ваших публичных визиток автоматически появляются здесь.</p></div>
        {notice && <div className="form-error mt-5" role="alert">{notice}</div>}
        <div className="crm-stats">{stats.map(({ title, value, icon: Icon }) => <article key={title}><Icon size={20} /><div><strong>{value}</strong><span>{title}</span></div></article>)}</div>
        <div className="crm-layout">
          <section className="crm-list-panel">
            <div className="crm-toolbar"><div className="org-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск клиента" /></div><select value={filter} onChange={(e) => setFilter(e.target.value as LeadStatus | "all")}><option value="all">Все статусы</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className="crm-list">
              {filtered.map((lead) => <button key={lead.id} className={selectedId === lead.id ? "active" : ""} onClick={() => setSelectedId(lead.id)}><span className="crm-avatar">{lead.clientName.slice(0, 1).toUpperCase()}</span><div><strong>{lead.clientName}</strong><small>{lead.service || "Услуга не выбрана"}</small><em>{new Date(lead.createdAt).toLocaleDateString("ru-RU")}</em></div><span className={`lead-status lead-status-${lead.status}`}>{statusLabels[lead.status]}</span><ChevronRight size={16} /></button>)}
              {!filtered.length && <div className="table-empty">Обращений пока нет.</div>}
            </div>
          </section>
          <section className="crm-detail">
            {selected ? (
              <>
                <div className="crm-client-head"><span className="crm-avatar crm-avatar-large">{selected.clientName.slice(0, 1).toUpperCase()}</span><div><h2>{selected.clientName}</h2><p>{selected.phone}{selected.email ? ` · ${selected.email}` : ""}</p></div></div>
                <div className="crm-fields">
                  <label><span>Статус обращения</span><select disabled={busy} value={selected.status} onChange={(e) => void saveChanges(selected.id, { status: e.target.value as LeadStatus })}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label><span>Статус оплаты</span><select disabled={busy} value={selected.paymentStatus} onChange={(e) => void saveChanges(selected.id, { paymentStatus: e.target.value as PaymentLeadStatus })}>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="crm-field-wide"><span>Выбранная услуга</span><input disabled={busy} maxLength={120} value={selected.service} onChange={(e) => setLeads((items) => items.map((lead) => lead.id === selected.id ? { ...lead, service: e.target.value } : lead))} onBlur={(e) => void saveChanges(selected.id, { service: e.target.value })} /></label>
                  <label className="crm-field-wide"><span>Заметки</span><textarea disabled={busy} rows={4} maxLength={4000} value={selected.notes} onChange={(e) => setLeads((items) => items.map((lead) => lead.id === selected.id ? { ...lead, notes: e.target.value } : lead))} onBlur={(e) => void saveChanges(selected.id, { notes: e.target.value })} placeholder="Внутренняя заметка о клиенте" /></label>
                </div>
                <div className="crm-message"><MessageSquareText size={18} /><div><strong>Сообщение клиента</strong><p>{selected.message || "Клиент запросил обратную связь."}</p></div></div>
                <div className="crm-history"><h3>История</h3>{selected.history.map((item) => <div key={item.id}><span /><p>{item.text}<small>{new Date(item.createdAt).toLocaleString("ru-RU")}</small></p></div>)}</div>
                <div className="crm-actions"><a className="button button-primary" href={`tel:${selected.phone}`}><PhoneCall size={17} /> Позвонить</a><button className="button button-secondary" disabled={busy} onClick={async () => { setBusy(true); setNotice(""); try { await leadRepository.addHistory(selected.id, "Добавлена ручная запись"); await refreshRemote(); } catch (error) { setNotice(error instanceof Error ? error.message : "Не удалось добавить запись."); } finally { setBusy(false); } }}><UserRoundCheck size={17} /> Добавить запись</button><span><Banknote size={16} /> {paymentLabels[selected.paymentStatus]}</span></div>
              </>
            ) : <div className="empty-state"><UsersRound size={30} /><h2>Выберите клиента</h2><p>Здесь появятся данные обращения и история работы.</p></div>}
          </section>
        </div>
      </div>
    </main>
  );
}

import { ArrowLeft, CheckCircle2, Mail, MessageSquareReply, RefreshCw, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../lib/supabase";

interface SupportTicket {
  id: string;
  ticket_number: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  staff_reply: string;
  created_at: string;
  contact_snapshot: { name?: string; phone?: string; email?: string } | null;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id,ticket_number,category,subject,message,status,staff_reply,created_at,contact_snapshot")
      .order("created_at", { ascending: false })
      .limit(100);
    setBusy(false);
    if (error) setNotice(error.message);
    else setTickets((data ?? []) as SupportTicket[]);
  };

  useEffect(() => { void refresh(); }, []);

  const sendReply = async (closed: boolean) => {
    if (!supabase || !selected || reply.trim().length < 2) return;
    setBusy(true);
    const { error } = await supabase.rpc("reply_support_ticket", {
      target_ticket_id: selected.id,
      reply_text: reply.trim(),
      close_ticket: closed
    });
    setBusy(false);
    if (error) return setNotice(error.message);
    setNotice("Ответ сохранён и добавлен в очередь автоматической отправки.");
    setSelected(null);
    setReply("");
    await refresh();
  };

  return <main className="admin-page">
    <div className="site-container py-10 md:py-14">
      <div className="platform-section-head">
        <div><span className="section-label">VIZORA SUPPORT</span><h1 className="page-title">Обращения пользователей</h1><p className="page-copy">Ответ сохраняется в кабинете и автоматически отправляется пользователю по электронной почте.</p></div>
        <div className="flex flex-wrap gap-2"><Link to="/admin" className="button button-secondary"><ArrowLeft size={16} /> Админ-панель</Link><button className="button button-secondary" onClick={() => void refresh()}><RefreshCw className={busy ? "spin" : ""} size={16} /> Обновить</button></div>
      </div>
      {notice && <div className="admin-notice mt-6"><Mail size={18} />{notice}</div>}
      <section className="admin-panel mt-6">
        <div className="admin-panel-heading"><div><h2>Очередь поддержки</h2><p>{tickets.filter((item) => !["closed","resolved"].includes(item.status)).length} открытых обращений</p></div><MessageSquareReply size={21} /></div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Номер</th><th>Пользователь</th><th>Тема</th><th>Статус</th><th>Дата</th><th /></tr></thead>
            <tbody>{tickets.map((ticket) => <tr key={ticket.id}>
              <td><strong>{ticket.ticket_number}</strong></td>
              <td>{ticket.contact_snapshot?.name || "Пользователь"}<br /><small>{ticket.contact_snapshot?.phone || ticket.contact_snapshot?.email || "—"}</small></td>
              <td>{ticket.subject}<br /><small>{ticket.message.slice(0, 90)}</small></td>
              <td><span className={`status-pill ${ticket.status === "closed" ? "" : "status-review"}`}>{ticket.status}</span></td>
              <td>{new Date(ticket.created_at).toLocaleDateString("ru-RU")}</td>
              <td><button className="admin-secondary-action" onClick={() => { setSelected(ticket); setReply(ticket.staff_reply || ""); }}>Ответить</button></td>
            </tr>)}</tbody>
          </table>
          {!tickets.length && <div className="table-empty">Обращений пока нет.</div>}
        </div>
      </section>
    </div>
    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
      <section className="modal-card" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head"><div><span className="section-label">{selected.ticket_number}</span><h2>Ответ службы поддержки</h2></div><button type="button" onClick={() => setSelected(null)}>×</button></div>
        <p className="modal-note">{selected.message}</p>
        <label className="form-field"><span className="form-label">Ответ пользователю</span><textarea className="form-input min-h-36 resize-y" value={reply} onChange={(event) => setReply(event.target.value)} autoFocus /></label>
        <div className="mt-5 flex flex-wrap justify-end gap-2"><button className="button button-secondary" disabled={busy || reply.trim().length < 2} onClick={() => void sendReply(false)}><Send size={17} /> Отправить</button><button className="button button-primary" disabled={busy || reply.trim().length < 2} onClick={() => void sendReply(true)}><CheckCircle2 size={17} /> Ответить и закрыть</button></div>
      </section>
    </div>}
  </main>;
}

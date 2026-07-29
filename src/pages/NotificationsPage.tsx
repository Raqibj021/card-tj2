import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../lib/supabase";

interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const refresh = async () => {
    if (!supabase) return;
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as NotificationItem[]);
  };
  useEffect(() => { void refresh(); }, []);
  return <main className="dashboard-page"><section className="site-container py-10 md:py-14"><div className="platform-section-head"><div><span className="section-label">VIZORA.TJ</span><h1 className="page-title">Уведомления</h1><p className="page-copy">Оплата, проверка, приглашения, тарифы и ответы поддержки.</p></div><button className="button button-secondary" onClick={async () => { if (supabase) await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null); await refresh(); }}><CheckCheck size={17} /> Прочитать все</button></div><div className="notification-list">{items.map((item) => <article key={item.id} className={item.read_at ? "" : "unread"}><span><Bell size={18} /></span><div><small>{item.kind}</small><h2>{item.title}</h2><p>{item.body}</p><time>{new Date(item.created_at).toLocaleString("ru-RU")}</time></div>{item.action_url && <Link to={item.action_url}>Открыть</Link>}</article>)}{!items.length && <div className="empty-state"><Bell size={30} /><h2>Новых уведомлений нет</h2></div>}</div></section></main>;
}

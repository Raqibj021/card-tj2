import { Bell, CheckCheck, CreditCard, Headphones, IdCard, ShoppingBag, Building2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { useNotificationCounts } from "../hooks/useNotificationCounts";
import {
  notificationChangedEvent, notificationSection, notificationSectionLabel,
  signalNotificationsChanged, type NotificationSection
} from "../lib/notificationCenter";
import { supabase } from "../lib/supabase";

interface NotificationItem {
  id: string; kind: string; title: string; body: string; action_url: string | null;
  read_at: string | null; created_at: string;
}

const sections: NotificationSection[] = ["all", "organization", "payments", "cards", "services", "support", "account"];
const sectionIcons = { organization: Building2, payments: CreditCard, cards: IdCard, services: ShoppingBag, support: Headphones, account: Bell };

export default function NotificationsPage() {
  const { language } = useApp();
  const { user } = useAuth();
  const { counts } = useNotificationCounts();
  const [params, setParams] = useSearchParams();
  const requested = params.get("section") as NotificationSection | null;
  const activeSection = sections.includes(requested ?? "all") ? requested ?? "all" : "all";
  const [items, setItems] = useState<NotificationItem[]>([]);
  const copy = {
    ru: { title: "Уведомления", text: "Решения и сообщения разделены по темам — ничего не потеряется.", all: "Все", read: "Прочитать в разделе", open: "Открыть", empty: "В этом разделе уведомлений нет" },
    tj: { title: "Огоҳиномаҳо", text: "Қарорҳо ва паёмҳо аз рӯи мавзӯъ ҷудо шудаанд.", all: "Ҳама", read: "Хондани бахш", open: "Кушодан", empty: "Дар ин бахш огоҳинома нест" },
    en: { title: "Notifications", text: "Decisions and messages are separated by topic, so nothing gets lost.", all: "All", read: "Mark section read", open: "Open", empty: "No notifications in this section" }
  }[language];

  const refresh = useCallback(async () => {
    if (!supabase || !user) return;
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(300);
    setItems((data ?? []) as NotificationItem[]);
  }, [user]);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(notificationChangedEvent, onChange);
    // Keep every effect instance isolated. In development/StrictMode the
    // previous channel may still be closing when this effect subscribes again.
    const channelTopic = user
      ? `notifications-page-${user.id}-${crypto.randomUUID()}`
      : null;
    const channel = supabase && user && channelTopic
      ? supabase.channel(channelTopic)
          .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, onChange)
          .subscribe()
      : null;
    return () => {
      window.removeEventListener(notificationChangedEvent, onChange);
      if (channel && supabase) void supabase.removeChannel(channel);
    };
  }, [refresh, user]);

  const visibleItems = useMemo(() => items.filter((item) => activeSection === "all" || notificationSection(item.kind) === activeSection), [items, activeSection]);
  const markVisibleRead = async () => {
    if (!supabase) return;
    const ids = visibleItems.filter((item) => !item.read_at).map((item) => item.id);
    if (!ids.length) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", ids);
    await refresh(); signalNotificationsChanged();
  };
  const markOneRead = async (item: NotificationItem) => {
    if (!supabase || item.read_at) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", item.id);
    setItems((current) => current.map((value) => value.id === item.id ? { ...value, read_at: new Date().toISOString() } : value));
    signalNotificationsChanged();
  };

  return <main className="dashboard-page"><section className="site-container py-10 md:py-14">
    <div className="platform-section-head"><div><span className="section-label">VIZORA.TJ</span><h1 className="page-title">{copy.title}</h1><p className="page-copy">{copy.text}</p></div><button className="button button-secondary" onClick={() => void markVisibleRead()}><CheckCheck size={17} /> {copy.read}</button></div>
    <div className="notification-tabs" role="tablist">
      {sections.map((section) => {
        const count = counts[section];
        const label = section === "all" ? copy.all : notificationSectionLabel(section, language);
        return <button key={section} className={activeSection === section ? "active" : ""} onClick={() => setParams(section === "all" ? {} : { section })}>{label}{count > 0 && <b>{count > 99 ? "99+" : count}</b>}</button>;
      })}
    </div>
    <div className="notification-list">{visibleItems.map((item) => {
      const section = notificationSection(item.kind); const Icon = sectionIcons[section];
      return <article key={item.id} className={item.read_at ? "" : "unread"}><span><Icon size={18} /></span><div><small>{notificationSectionLabel(section, language)}</small><h2>{item.title}</h2><p>{item.body}</p><time>{new Date(item.created_at).toLocaleString(language === "en" ? "en-US" : "ru-RU")}</time></div>{item.action_url && <Link to={item.action_url} onClick={() => void markOneRead(item)}>{copy.open}</Link>}</article>;
    })}{!visibleItems.length && <div className="empty-state"><Bell size={30} /><h2>{copy.empty}</h2></div>}</div>
  </section></main>;
}

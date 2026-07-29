import { BadgeCheck, Check, RefreshCw, ShieldAlert, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../lib/supabase";
import AdminShell from "../components/admin/AdminShell";

interface ReviewCard {
  id: string;
  full_name: string;
  position: string;
  organization_name: string;
  slug: string;
  review_status: string;
  updated_at: string;
}

export default function ModerationPage() {
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [message, setMessage] = useState("");

  const refresh = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("cards")
      .select("id, full_name, position, organization_name, slug, review_status, updated_at")
      .in("review_status", ["pending", "changes_requested", "suspended"])
      .order("updated_at", { ascending: false });
    setCards((data ?? []) as ReviewCard[]);
  };

  useEffect(() => { void refresh(); }, []);

  const review = async (id: string, decision: "approved" | "changes_requested" | "rejected") => {
    if (!supabase) return;
    const note = decision === "approved"
      ? "Данные проверены"
      : window.prompt("Комментарий для владельца", decision === "rejected" ? "Публикация отклонена" : "Требуются изменения") ?? "";
    const { error } = await supabase.rpc("review_card", {
      target_card_id: id,
      decision,
      note
    });
    setMessage(error ? error.message : "Решение сохранено.");
    if (!error) await refresh();
  };

  return (
    <AdminShell title="Проверка визиток" description="Система собирает подозрительные и новые профили в одну очередь. Администратор принимает итоговое решение." actions={<button className="admin-toolbar-button" onClick={() => void refresh()}><RefreshCw size={16} /> Обновить</button>}>
      <div className="admin-subpage">
        {message && <div className="admin-notice mt-6"><ShieldAlert size={18} /><span>{message}</span></div>}
        <section className="admin-panel mt-6">
          <div className="admin-panel-heading"><div><h2>Очередь проверки</h2><p>{cards.length} профилей ожидают решения</p></div><BadgeCheck size={21} /></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Владелец</th><th>Должность</th><th>Организация</th><th>Статус</th><th /></tr></thead>
              <tbody>{cards.map((card) => (
                <tr key={card.id}>
                  <td><Link to={`/card/${card.slug}`} target="_blank"><strong>{card.full_name}</strong><br /><small>/{card.slug}</small></Link></td>
                  <td>{card.position || "—"}</td>
                  <td>{card.organization_name || "—"}</td>
                  <td><span className="status-pill status-review">{card.review_status}</span></td>
                  <td><div className="payment-actions">
                    <button title="Подтвердить" onClick={() => void review(card.id, "approved")}><Check size={17} /></button>
                    <button title="Запросить изменения" onClick={() => void review(card.id, "changes_requested")}><ShieldAlert size={17} /></button>
                    <button title="Отклонить" onClick={() => void review(card.id, "rejected")}><X size={17} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
            {!cards.length && <div className="table-empty">Очередь проверки пуста.</div>}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

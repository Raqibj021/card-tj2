import { Layers, Link2, Unlink } from "lucide-react";
import { useEffect, useState } from "react";
import { adminSupabase } from "../../lib/supabase";

type Row = { group_id: string; slug: string; full_name: string; card_position: string; sort: number };

const cleanSlug = (v: string) => v.trim().replace(/^https?:\/\/(www\.)?vizora\.tj\//i, "").replace(/^\/+|\/+$/g, "").toLowerCase();

/** Admin tool: show several cards as one card with a switcher (one QR for all). */
export default function CardGroupsPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!adminSupabase) return;
    const { data, error } = await adminSupabase.rpc("admin_list_card_groups");
    if (!error) setRows((data ?? []) as Row[]);
  };
  useEffect(() => { void load(); }, []);

  const link = async () => {
    if (!adminSupabase) return;
    const slugs = [cleanSlug(a), cleanSlug(b)].filter(Boolean);
    if (slugs.length < 2) { setMsg("Укажите две визитки"); return; }
    setBusy(true);
    const { error } = await adminSupabase.rpc("admin_link_cards", { p_slugs: slugs });
    setBusy(false);
    if (error) { setMsg(error.message.includes("card_not_found") ? "Визитка не найдена — проверьте адрес" : `Ошибка: ${error.message}`); return; }
    setA(""); setB(""); setMsg(`Готово: vizora.tj/${slugs[0]} и vizora.tj/${slugs[1]} теперь одна визитка с переключателем. QR — от первой.`);
    void load();
  };

  const unlink = async (group: string) => {
    if (!adminSupabase || !window.confirm("Разъединить визитки?")) return;
    await adminSupabase.rpc("admin_unlink_group", { p_group: group });
    void load();
  };

  const groups = rows.reduce<Record<string, Row[]>>((acc, r) => ({ ...acc, [r.group_id]: [...(acc[r.group_id] ?? []), r] }), {});

  return (
    <section className="card-groups-panel">
      <div className="cgp-head"><Layers size={18} /><b>Несколько визиток в одной</b><small>Один QR — внутри переключатель между визитками</small></div>
      <div className="cgp-form">
        <input value={a} onChange={(e) => setA(e.target.value)} placeholder="Основная: vizora.tj/имя" />
        <input value={b} onChange={(e) => setB(e.target.value)} placeholder="Вторая: vizora.tj/имя-2" />
        <button type="button" disabled={busy} onClick={() => void link()}><Link2 size={16} /> Объединить</button>
      </div>
      {msg && <p className="cgp-msg">{msg}</p>}
      {Object.entries(groups).map(([id, list]) => (
        <div key={id} className="cgp-group">
          <span>{list.map((r, i) => (<a key={r.slug} href={`/${r.slug}`} target="_blank" rel="noreferrer">{i === 0 ? "★ " : ""}{r.card_position || r.full_name} <small>/{r.slug}</small></a>))}</span>
          <button type="button" onClick={() => void unlink(id)}><Unlink size={15} /> Разъединить</button>
        </div>
      ))}
    </section>
  );
}

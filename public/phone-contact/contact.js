// Real contact file for "Сохранить контакт": the phone opens it straight in Contacts.
// Let the browser hand the contact to its registered viewer.
const SB = "https://kzyjkvztucihkbhitrvu.supabase.co";
const KEY = "sb_publishable_QqJRxSp98Et-OkZn356Pmg_PZiu_L4q";

const esc = (v) => String(v ?? "").replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
const tel = (v) => String(v ?? "").replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
const url = (v) => !v ? "" : /^https?:\/\//i.test(v) ? v : `https://${v}`;
const social = (kind, v) => {
  const s = String(v ?? "").trim(); if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const c = s.replace(/^@/, "");
  if (/^(?:www\.)?(?:t\.me|instagram\.com|facebook\.com)\//i.test(c)) return url(c);
  return { telegram: `https://t.me/${c}`, instagram: `https://instagram.com/${c}`, facebook: `https://facebook.com/${c}` }[kind];
};
// vCard lines must be folded at 75 octets.
const fold = (line) => { const out = []; let cur = ""; for (const ch of line) { if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = " " + ch; } else cur += ch; } out.push(cur); return out.join("\r\n"); };

async function photoLine(path) {
  if (!path) return "";
  const src = /^https?:/i.test(path) ? path : `${SB}/storage/v1/object/public/card-assets/${path}`;
  try {
    const imageUrl = new URL(src);
    if (imageUrl.origin !== SB || !imageUrl.pathname.startsWith("/storage/v1/object/public/card-assets/")) return "";
    const r = await fetch(src, { redirect: "error" });
    if (!r.ok) return "";
    const type = (r.headers.get("content-type") || "").toLowerCase();
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length > 350000) return "";
    let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    const t = type.includes("png") ? "PNG" : "JPEG";
    if (!/jpe?g|png/.test(type)) return "";
    return `PHOTO;ENCODING=b;TYPE=${t}:${btoa(bin)}`;
  } catch { return ""; }
}

export async function onRequestGet({ request }) {
  const slug = String(new URL(request.url).searchParams.get("s") || "").toLowerCase();
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return new Response("Not found", { status: 404 });
  const r = await fetch(`${SB}/rest/v1/cards?slug=eq.${slug}&select=slug,full_name,position,organization_name,description,contacts,photo_path,pending_claim,review_status&limit=1`, { headers: { apikey: KEY } });
  if (!r.ok) return new Response("Contact temporarily unavailable", { status: 503 });
  let row = (await r.json())[0];
  if (!row) {
    const response = await fetch(`${SB}/rest/v1/rpc/get_public_organization_employee`, {
      method: "POST", headers: { apikey: KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ target_slug: slug })
    });
    const employee = response.ok ? await response.json() : null;
    if (employee?.slug === slug && employee.fullName) {
      row = { slug, full_name: employee.fullName, organization_name: employee.organization,
        position: employee.position, description: employee.description, contacts: employee,
        photo_path: employee.photo, review_status: "approved" };
    }
  }
  if (!row || row.pending_claim || row.review_status !== "approved") return Response.redirect(`https://vizora.tj/card/${slug}`, 302);
  const c = row.contacts || {};
  const parts = String(row.full_name || "").trim().split(/\s+/);
  const last = parts.length > 1 ? parts.pop() : ""; const first = parts.join(" ");
  const card = `https://vizora.tj/card/${row.slug}`;
  const lines = [
    "BEGIN:VCARD", "VERSION:3.0",
    `N:${esc(last)};${esc(first)};;;`, `FN:${esc(row.full_name)}`,
    row.organization_name && `ORG:${esc(row.organization_name)}`,
    row.position && `TITLE:${esc(row.position)}`,
    c.phone && `TEL;TYPE=CELL,VOICE:${tel(c.phone)}`,
    c.secondPhone && `TEL;TYPE=WORK,VOICE:${tel(c.secondPhone)}`,
    c.email && `EMAIL;TYPE=INTERNET:${String(c.email).trim()}`,
    c.website && `URL:${url(c.website)}`,
    `URL;TYPE=Vizora:${card}`,
    c.address && `ADR;TYPE=WORK:;;${esc(c.address)};;;;`,
    c.whatsapp && `X-SOCIALPROFILE;TYPE=whatsapp:https://wa.me/${tel(c.whatsapp).replace("+", "")}`,
    c.telegram && `X-SOCIALPROFILE;TYPE=telegram:${social("telegram", c.telegram)}`,
    c.instagram && `X-SOCIALPROFILE;TYPE=instagram:${social("instagram", c.instagram)}`,
    c.facebook && `X-SOCIALPROFILE;TYPE=facebook:${social("facebook", c.facebook)}`,
    `NOTE:${esc([row.description, card].filter(Boolean).join("\n"))}`,
    await photoLine(row.photo_path),
    "END:VCARD"
  ].filter(Boolean).map(fold).join("\r\n") + "\r\n";
  const name = `${row.slug}.vcf`;
  return new Response(lines, { headers: {
    "content-type": "text/vcard; charset=utf-8",
    "content-disposition": `inline; filename="${name}"`,
    "cache-control": "no-store"
  } });
}

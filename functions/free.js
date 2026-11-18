// Shared link-preview rewriter: switches to the post-promo image/text
// once the "first 50" launch places are taken.
const SB = "https://kzyjkvztucihkbhitrvu.supabase.co";
const KEY = "sb_publishable_QqJRxSp98Et-OkZn356Pmg_PZiu_L4q";

const PROMO = {
  title: "🎁 Визиткаи электронии ройгон — 1 дақиқа | Vizora",
  desc: "Телефон, WhatsApp, Telegram ва Instagram — дар як пайванд. Ройгон, дар 1 дақиқа.",
  image: "https://vizora.tj/og-free.jpg"
};
const AFTER = {
  title: "✨ Визиткаи электронии худро созед — 1 дақиқа | Vizora",
  desc: "Телефон, WhatsApp, Telegram ва Instagram — дар як пайванд. QR-код ва корти NFC.",
  image: "https://vizora.tj/og-after.jpg"
};

async function promoOpen() {
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/get_launch_promo_status`, {
      method: "POST",
      headers: { apikey: KEY, "content-type": "application/json" },
      body: "{}",
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    if (!r.ok) return true;
    const d = await r.json();
    return Number(d?.remaining ?? 1) > 0;
  } catch { return true; }
}

const set = (value) => ({ element(el) { el.setAttribute("content", value); } });

async function rewrite(context, url) {
  const response = await context.next();
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  const m = (await promoOpen()) ? PROMO : AFTER;
  return new HTMLRewriter()
    .on('meta[property="og:title"]', set(m.title))
    .on('meta[property="og:description"]', set(m.desc))
    .on('meta[name="description"]', set(m.desc))
    .on('meta[property="og:image"]', set(m.image))
    .on('meta[property="og:url"]', set(url))
    .on('meta[property="og:locale"]', set("tg_TJ"))
    .on('meta[name="twitter:title"]', set(m.title))
    .on('meta[name="twitter:description"]', set(m.desc))
    .on('meta[name="twitter:image"]', set(m.image))
    .on('link[rel="manifest"]', { element(el) { el.setAttribute("href", "/free.webmanifest"); } })
    .on('link[rel="apple-touch-icon"]', { element(el) { el.setAttribute("href", "/icons/free-192.png"); } })
    .on("title", { element(el) { el.setInnerContent(m.title); } })
    .transform(response);
}
export const onRequest = (context) => rewrite(context, "https://vizora.tj/free");

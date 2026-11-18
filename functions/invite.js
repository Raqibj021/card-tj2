// Link preview for vizora.tj/free (WhatsApp, Telegram, Instagram read these tags).
const TITLE = "🎁 Визиткаи электронии ройгон — 1 дақиқа | Vizora";
const DESC = "Телефон, WhatsApp, Telegram ва Instagram — дар як пайванд. Ройгон, дар 1 дақиқа.";
const IMAGE = "https://vizora.tj/og-free.jpg";

const set = (value) => ({ element(el) { el.setAttribute("content", value); } });

export async function onRequest(context) {
  const response = await context.next();
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return response;
  return new HTMLRewriter()
    .on('meta[property="og:title"]', set(TITLE))
    .on('meta[property="og:description"]', set(DESC))
    .on('meta[name="description"]', set(DESC))
    .on('meta[property="og:image"]', set(IMAGE))
    .on('meta[property="og:url"]', set("https://vizora.tj/invite"))
    .on('meta[property="og:locale"]', set("tg_TJ"))
    .on('meta[name="twitter:title"]', set(TITLE))
    .on('meta[name="twitter:description"]', set(DESC))
    .on('meta[name="twitter:image"]', set(IMAGE))
    .on("title", { element(el) { el.setInnerContent(TITLE); } })
    .transform(response);
}

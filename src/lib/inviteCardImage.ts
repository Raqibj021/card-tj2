import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import FreeCover from "../components/FreeCover";
import { findFreeCardDesign } from "./freeCardDesigns";
import type { CardInvite } from "./inviteRepository";

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const coverSvg = (design: string) => {
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() => root.render(createElement(FreeCover, { design })));
  const svg = host.querySelector("svg");
  const markup = svg ? new XMLSerializer().serializeToString(svg) : "";
  root.unmount();
  return markup.replace("<svg", '<svg width="1080" height="420"');
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** Draws a 1080×1350 picture of the specialist's ready card to send with the WhatsApp message. */
export async function renderInviteCardImage(inv: CardInvite, slug: string, placesLeft: number | null) {
  const design = findFreeCardDesign(inv.design);
  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  await document.fonts.ready;

  const bg = ctx.createRadialGradient(200, 0, 50, 540, 600, 1100);
  bg.addColorStop(0, design.c2); bg.addColorStop(.55, design.c1); bg.addColorStop(1, "#020617");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // card window
  const cx = 90, cy = 150, cw = 900, ch = 1030;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
  roundRect(ctx, cx, cy, cw, ch, 56); ctx.fillStyle = "#0f1729"; ctx.fill();
  ctx.restore();
  ctx.save(); roundRect(ctx, cx, cy, cw, ch, 56); ctx.clip();
  const svg = coverSvg(design.key);
  if (svg) {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try { const img = await loadImage(url); ctx.drawImage(img, cx, cy, cw, 350); } finally { URL.revokeObjectURL(url); }
  }
  const fade = ctx.createLinearGradient(0, cy + 180, 0, cy + 350);
  fade.addColorStop(0, "rgba(15,23,41,0)"); fade.addColorStop(1, "#0f1729");
  ctx.fillStyle = fade; ctx.fillRect(cx, cy + 180, cw, 171);
  ctx.restore();

  // avatar
  const ax = W / 2, ay = cy + 350, ar = 120;
  ctx.beginPath(); ctx.arc(ax, ay, ar + 14, 0, Math.PI * 2); ctx.fillStyle = design.accent; ctx.fill();
  ctx.beginPath(); ctx.arc(ax, ay, ar + 8, 0, Math.PI * 2); ctx.fillStyle = "#0f1729"; ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.clip();
  if (inv.photo_data) {
    try { const p = await loadImage(inv.photo_data); ctx.drawImage(p, ax - ar, ay - ar, ar * 2, ar * 2); } catch { /* ignore */ }
  } else {
    ctx.fillStyle = "#dbeafe"; ctx.fillRect(ax - ar, ay - ar, ar * 2, ar * 2);
    ctx.fillStyle = "#1e3a8a"; ctx.font = "900 92px Inter, Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(inv.full_name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase(), ax, ay + 4);
  }
  ctx.restore();

  ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#fff"; ctx.font = "900 64px Inter, Arial, sans-serif";
  ctx.fillText(inv.full_name, W / 2, ay + ar + 110, cw - 80);
  ctx.fillStyle = design.accent; ctx.font = "800 42px Inter, Arial, sans-serif";
  ctx.fillText(inv.profession + (inv.city ? ` · ${inv.city}` : ""), W / 2, ay + ar + 172, cw - 80);

  // contact pills
  const pills = [["📞", "+" + inv.phone], ["💬", "WhatsApp"]];
  if (inv.telegram) pills.push(["✈️", "Telegram"]);
  if (inv.instagram) pills.push(["📸", "Instagram"]);
  const py = ay + ar + 230, ph = 88, gap = 16;
  const cols = Math.min(pills.length, 2);
  const pw = (cw - 80 - gap * (cols - 1)) / cols;
  pills.forEach(([ico, label], i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = cx + 40 + col * (pw + gap), y = py + row * (ph + gap);
    roundRect(ctx, x, y, pw, ph, 24); ctx.fillStyle = "#18233d"; ctx.fill();
    ctx.fillStyle = "#e2e8f0"; ctx.font = "800 34px Inter, Arial, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${ico}  ${label}`, x + pw / 2, y + 57, pw - 20);
  });

  // url bar
  const uy = cy + ch - 120;
  roundRect(ctx, cx + 40, uy, cw - 80, 88, 24); ctx.fillStyle = design.accent; ctx.fill();
  ctx.fillStyle = "#0b1430"; ctx.font = "900 40px Inter, Arial, sans-serif";
  ctx.fillText(`vizora.tj/${slug}`, W / 2, uy + 58, cw - 120);

  // header + NFC gift ribbon
  ctx.fillStyle = "#fff"; ctx.font = "900 44px Inter, Arial, sans-serif"; ctx.textAlign = "left";
  ctx.fillText("VIZORA.TJ", 90, 100);
  if (placesLeft) {
    const label = inv.language === "ru" ? "🎁 + NFC-карта в подарок" : inv.language === "en" ? "🎁 + free NFC card" : "🎁 + корти NFC тӯҳфа";
    ctx.font = "900 34px Inter, Arial, sans-serif";
    const w = ctx.measureText(label).width + 56;
    roundRect(ctx, W - 90 - w, 52, w, 70, 35); ctx.fillStyle = "#fbbf24"; ctx.fill();
    ctx.fillStyle = "#0b1430"; ctx.textAlign = "center"; ctx.fillText(label, W - 90 - w / 2, 99);
  }
  ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.font = "700 32px Inter, Arial, sans-serif"; ctx.textAlign = "center";
  ctx.fillText(inv.language === "ru" ? "Ваша электронная визитка готова" : inv.language === "en" ? "Your digital card is ready" : "Визиткаи электронии шумо омода шуд", W / 2, H - 60);

  return new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92));
}

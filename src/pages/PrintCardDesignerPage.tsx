import { Download, Facebook, Globe2, ImagePlus, Instagram, Mail, MapPin, MessageCircle, Phone, Printer, QrCode as QrIcon, Send, Shapes } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import Footer from "../components/layout/Footer";

type Side = "front" | "back";
type TemplateId = "executive" | "modern" | "minimal" | "ribbon" | "orbit" | "goldwave" | "prism" | "mono" | "chevron";
type LogoId = "orbit" | "peak" | "link" | "spark" | "frame" | "leaf" | "monogram" | "diamond";
type MoveKey = "brand" | "person" | "company" | "contacts" | "socials" | "qr" | "photo";
type Positions = Record<MoveKey, { x: number; y: number }>;

const templates: { id: TemplateId; name: string; source?: string }[] = [
  { id: "executive", name: "Деловой" },
  { id: "modern", name: "Современный" },
  { id: "minimal", name: "Минимализм" },
  { id: "ribbon", name: "Красная лента", source: "1046" },
  { id: "orbit", name: "Динамика", source: "1047" },
  { id: "goldwave", name: "Золотая волна", source: "1048" },
  { id: "prism", name: "Призма", source: "1049" },
  { id: "mono", name: "Монолит", source: "1050" },
  { id: "chevron", name: "Шеврон", source: "1051" }
];

const palettes = [
  { id: "emerald", name: "Изумруд", bg: "#073d35", accent: "#d4af67", light: "#ffffff", ink: "#ffffff" },
  { id: "midnight", name: "Ночной синий", bg: "#071a3d", accent: "#8b5cf6", light: "#ffffff", ink: "#ffffff" },
  { id: "ruby", name: "Рубин", bg: "#201c1d", accent: "#d20b48", light: "#ffffff", ink: "#ffffff" },
  { id: "amber", name: "Янтарь", bg: "#171414", accent: "#e09518", light: "#ffffff", ink: "#ffffff" },
  { id: "graphite", name: "Графит", bg: "#111318", accent: "#f4bd25", light: "#f7f7f7", ink: "#ffffff" },
  { id: "ivory", name: "Светлый", bg: "#f6f4ef", accent: "#a47a35", light: "#ffffff", ink: "#121722" }
];

const logoIds: LogoId[] = ["orbit", "peak", "link", "spark", "frame", "leaf", "monogram", "diamond"];
const defaultPositions = (right: boolean): Positions => ({
  brand: { x: right ? 67 : 10, y: 17 },
  person: { x: right ? 67 : 10, y: 20 },
  company: { x: right ? 67 : 10, y: 48 },
  contacts: { x: right ? 67 : 10, y: 62 },
  socials: { x: right ? 67 : 10, y: 84 },
  qr: { x: right ? 13 : 76, y: 66 },
  photo: { x: right ? 12 : 67, y: 12 }
});

const readImage = (file?: File) => new Promise<string>((resolve, reject) => {
  if (!file) return reject();
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.fill();
};

const drawLogoMark = (ctx: CanvasRenderingContext2D, id: LogoId, x: number, y: number, size: number, color: string) => {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = Math.max(5, size * .08); ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (id === "orbit") { ctx.beginPath(); ctx.arc(size / 2, size / 2, size * .35, .35, 5.6); ctx.stroke(); ctx.beginPath(); ctx.moveTo(size * .22, size * .72); ctx.lineTo(size * .78, size * .28); ctx.stroke(); }
  if (id === "peak") { ctx.beginPath(); ctx.moveTo(size * .12, size * .78); ctx.lineTo(size * .48, size * .2); ctx.lineTo(size * .62, size * .46); ctx.lineTo(size * .86, size * .18); ctx.lineTo(size * .86, size * .78); ctx.stroke(); }
  if (id === "link") { ctx.beginPath(); ctx.arc(size * .38, size * .5, size * .25, -.8, .8); ctx.stroke(); ctx.beginPath(); ctx.arc(size * .62, size * .5, size * .25, 2.35, 3.95); ctx.stroke(); }
  if (id === "spark") { ctx.beginPath(); ctx.moveTo(size * .5, size * .08); ctx.lineTo(size * .61, size * .39); ctx.lineTo(size * .92, size * .5); ctx.lineTo(size * .61, size * .61); ctx.lineTo(size * .5, size * .92); ctx.lineTo(size * .39, size * .61); ctx.lineTo(size * .08, size * .5); ctx.lineTo(size * .39, size * .39); ctx.closePath(); ctx.fill(); }
  if (id === "frame") { ctx.strokeRect(size * .15, size * .15, size * .7, size * .7); ctx.beginPath(); ctx.moveTo(size * .15, size * .62); ctx.lineTo(size * .62, size * .15); ctx.stroke(); }
  if (id === "leaf") { ctx.beginPath(); ctx.moveTo(size * .18, size * .78); ctx.bezierCurveTo(size * .2, size * .2, size * .65, size * .08, size * .84, size * .16); ctx.bezierCurveTo(size * .9, size * .55, size * .58, size * .82, size * .18, size * .78); ctx.fill(); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = size * .04; ctx.beginPath(); ctx.moveTo(size * .25, size * .7); ctx.lineTo(size * .7, size * .28); ctx.stroke(); }
  if (id === "monogram") { ctx.font = `800 ${size * .62}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("V", size / 2, size / 2); ctx.strokeRect(size * .08, size * .08, size * .84, size * .84); }
  if (id === "diamond") { ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate(Math.PI / 4); ctx.strokeRect(-size * .28, -size * .28, size * .56, size * .56); ctx.restore(); ctx.beginPath(); ctx.arc(size / 2, size / 2, size * .12, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
};

const drawDecor = (ctx: CanvasRenderingContext2D, layout: TemplateId, side: Side, bg: string, accent: string, light: string) => {
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1004, 650);
  ctx.fillStyle = accent;
  if (layout === "executive") ctx.fillRect(0, 0, 42, 650);
  if (layout === "modern") { ctx.beginPath(); ctx.arc(900, 80, 250, 0, Math.PI * 2); ctx.fill(); }
  if (layout === "minimal") ctx.fillRect(0, 0, 1004, 14);
  if (layout === "ribbon") {
    ctx.fillStyle = light; ctx.fillRect(590, 0, 414, 650); ctx.fillStyle = accent;
    ctx.beginPath(); ctx.moveTo(320, 0); ctx.bezierCurveTo(430, 170, 390, 320, 610, 650); ctx.lineTo(760, 650); ctx.bezierCurveTo(520, 290, 570, 150, 470, 0); ctx.closePath(); ctx.fill();
  }
  if (layout === "orbit") {
    ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(side === "front" ? 120 : 755, 320, 300, 500, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 42; ctx.beginPath(); ctx.ellipse(450, 325, 185, 420, -.55, 0, Math.PI * 2); ctx.stroke();
  }
  if (layout === "goldwave") {
    ctx.fillStyle = light; ctx.beginPath(); ctx.moveTo(1004, 90); ctx.bezierCurveTo(700, 130, 700, 510, 430, 650); ctx.lineTo(1004, 650); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = accent; [0, 1, 2].forEach((n) => { ctx.lineWidth = 26 - n * 6; ctx.beginPath(); ctx.moveTo(0, 480 + n * 45); ctx.bezierCurveTo(400, 700 - n * 30, 590, 180 + n * 45, 1004, 100 + n * 60); ctx.stroke(); });
  }
  if (layout === "prism") {
    ctx.fillStyle = light; ctx.fillRect(650, 0, 354, 650); ctx.fillStyle = accent;
    [0, 1, 2].forEach((n) => { ctx.globalAlpha = .22 + n * .16; ctx.beginPath(); ctx.moveTo(500 + n * 55, 0); ctx.lineTo(710 + n * 55, 325); ctx.lineTo(500 + n * 55, 650); ctx.lineTo(430 + n * 55, 650); ctx.lineTo(640 + n * 55, 325); ctx.lineTo(430 + n * 55, 0); ctx.closePath(); ctx.fill(); }); ctx.globalAlpha = 1;
  }
  if (layout === "mono") {
    ctx.fillStyle = light; ctx.fillRect(side === "front" ? 0 : 0, 0, side === "front" ? 1004 : 540, 650);
    ctx.fillStyle = accent; roundedRect(ctx, side === "front" ? 0 : 500, 190, 90, 270, 28);
  }
  if (layout === "chevron") {
    ctx.fillStyle = accent; [0, 1, 2].forEach((n) => { ctx.globalAlpha = 1 - n * .27; ctx.beginPath(); ctx.moveTo(650 + n * 70, 0); ctx.lineTo(860 + n * 70, 325); ctx.lineTo(650 + n * 70, 650); ctx.lineTo(570 + n * 70, 650); ctx.lineTo(780 + n * 70, 325); ctx.lineTo(570 + n * 70, 0); ctx.closePath(); ctx.fill(); }); ctx.globalAlpha = 1;
  }
};

export default function PrintCardDesignerPage() {
  const cardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ key: MoveKey; offsetX: number; offsetY: number } | null>(null);
  const [layout, setLayout] = useState<TemplateId>("executive");
  const [palette, setPalette] = useState(palettes[0]);
  const [colors, setColors] = useState({ bg: palettes[0].bg, accent: palettes[0].accent, light: palettes[0].light, ink: palettes[0].ink });
  const [side, setSide] = useState<Side>("front");
  const [logo, setLogo] = useState("");
  const [photo, setPhoto] = useState("");
  const [logoMark, setLogoMark] = useState<LogoId>("orbit");
  const [data, setData] = useState({ name: "Фируз Саидов", position: "Архитектор и основатель", organization: "FORMA Studio", phone: "+992 93 555 21 21", email: "hello@forma.tj", website: "forma.tj", address: "Душанбе, проспект Рудаки, 70", instagram: "@forma.tj", facebook: "forma.tj", telegram: "@forma_tj", whatsapp: "+992 93 555 21 21", qr: "https://raqibj021.github.io/card-tj2/#/card/demo" });
  const [positions, setPositions] = useState<Positions>(() => defaultPositions(false));
  const [sizes, setSizes] = useState<Record<MoveKey, number>>({ brand: 1, person: 1, company: 1, contacts: 1, socials: 1, qr: 1, photo: 1 });
  const [selected, setSelected] = useState<MoveKey>("person");

  const choosePalette = (item: typeof palettes[number]) => { setPalette(item); setColors({ bg: item.bg, accent: item.accent, light: item.light, ink: item.ink }); };
  const useRightPanel = ["ribbon", "orbit", "goldwave", "prism", "mono"].includes(layout);
  useEffect(() => setPositions(defaultPositions(useRightPanel)), [layout, useRightPanel]);

  const startMove = (key: MoveKey, event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = cardRef.current?.getBoundingClientRect(); if (!rect) return;
    dragRef.current = { key, offsetX: event.clientX - rect.left - rect.width * positions[key].x / 100, offsetY: event.clientY - rect.top - rect.height * positions[key].y / 100 };
    setSelected(key);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current; const rect = cardRef.current?.getBoundingClientRect(); if (!drag || !rect) return;
    const x = Math.max(2, Math.min(88, (event.clientX - rect.left - drag.offsetX) / rect.width * 100));
    const y = Math.max(2, Math.min(88, (event.clientY - rect.top - drag.offsetY) / rect.height * 100));
    setPositions((value) => ({ ...value, [drag.key]: { x, y } }));
  };
  const stopMove = () => { dragRef.current = null; };
  const moveStyle = (key: MoveKey): CSSProperties => ({ left: `${positions[key].x}%`, top: `${positions[key].y}%`, transform: `scale(${sizes[key]})` });
  const dragProps = (key: MoveKey) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => startMove(key, event),
    onPointerMove: move,
    onPointerUp: stopMove,
    onPointerCancel: stopMove,
    style: moveStyle(key),
    className: `print-movable ${selected === key ? "selected" : ""}`
  });
  const movableProps = (key: MoveKey, className: string) => ({ ...dragProps(key), className: `${dragProps(key).className} ${className}` });

  const renderCanvas = async () => {
    const canvas = document.createElement("canvas"); canvas.width = 1004; canvas.height = 650;
    const ctx = canvas.getContext("2d"); if (!ctx) return null;
    drawDecor(ctx, layout, side, colors.bg, colors.accent, colors.light);
    const textColor = useRightPanel ? "#15171c" : colors.ink;
    const point = (key: MoveKey) => ({ x: positions[key].x / 100 * 1004, y: positions[key].y / 100 * 650, scale: sizes[key] });
    const drawUploadedPhoto = async () => {
      if (!photo) return;
      const image = new Image(); image.src = photo; await image.decode();
      const target = point("photo"); const size = 150 * target.scale;
      ctx.save(); ctx.beginPath(); ctx.arc(target.x + size / 2, target.y + size / 2, size / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(image, target.x, target.y, size, size); ctx.restore();
      ctx.strokeStyle = colors.accent; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(target.x + size / 2, target.y + size / 2, size / 2, 0, Math.PI * 2); ctx.stroke();
    };
    if (side === "front") {
      const brand = point("brand");
      if (logo) { const image = new Image(); image.src = logo; await image.decode(); ctx.drawImage(image, brand.x, brand.y, 120 * brand.scale, 75 * brand.scale); }
      else drawLogoMark(ctx, logoMark, brand.x, brand.y, 72 * brand.scale, useRightPanel ? colors.accent : colors.ink);
      ctx.fillStyle = textColor; ctx.font = `700 ${34 * brand.scale}px Arial`; ctx.fillText(data.organization, brand.x + 90 * brand.scale, brand.y + 34 * brand.scale);
      ctx.fillStyle = colors.accent; ctx.font = `600 ${17 * brand.scale}px Arial`; ctx.fillText(data.website, brand.x + 90 * brand.scale, brand.y + 61 * brand.scale);
      await drawUploadedPhoto();
      const qr = await QRCode.toDataURL(data.qr, { width: 190, margin: 1, color: { dark: textColor, light: useRightPanel ? colors.light : colors.bg } });
      const qrImage = new Image(); qrImage.src = qr; await qrImage.decode(); const qrPoint = point("qr"); ctx.drawImage(qrImage, qrPoint.x, qrPoint.y, 150 * qrPoint.scale, 150 * qrPoint.scale);
    } else {
      const person = point("person"); ctx.fillStyle = textColor; ctx.font = `700 ${43 * person.scale}px Arial`; ctx.fillText(data.name, person.x, person.y + 38 * person.scale); ctx.fillStyle = colors.accent; ctx.font = `600 ${21 * person.scale}px Arial`; ctx.fillText(data.position, person.x, person.y + 70 * person.scale);
      const company = point("company");
      if (logo) { const image = new Image(); image.src = logo; await image.decode(); ctx.drawImage(image, company.x, company.y, 72 * company.scale, 55 * company.scale); } else drawLogoMark(ctx, logoMark, company.x, company.y, 55 * company.scale, colors.accent);
      ctx.fillStyle = textColor; ctx.font = `700 ${17 * company.scale}px Arial`; ctx.fillText(data.organization, company.x + 70 * company.scale, company.y + 34 * company.scale);
      const contacts = point("contacts"); ctx.font = `18px Arial`; const contactLines = [`☎  ${data.phone}`, `✉  ${data.email}`, `●  ${data.website}`, `⌖  ${data.address}`]; contactLines.forEach((line, index) => ctx.fillText(line, contacts.x, contacts.y + index * 35 * contacts.scale));
      const social = point("socials"); ["I", "f", "T", "W"].forEach((letter, index) => { ctx.fillStyle = colors.accent; ctx.beginPath(); ctx.arc(social.x + index * 47 * social.scale, social.y, 16 * social.scale, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = `700 ${15 * social.scale}px Arial`; ctx.textAlign = "center"; ctx.fillText(letter, social.x + index * 47 * social.scale, social.y + 5 * social.scale); }); ctx.textAlign = "left";
      await drawUploadedPhoto();
      const qr = await QRCode.toDataURL(data.qr, { width: 160, margin: 1, color: { dark: textColor, light: useRightPanel ? colors.light : colors.bg } });
      const qrImage = new Image(); qrImage.src = qr; await qrImage.decode(); const qrPoint = point("qr"); ctx.drawImage(qrImage, qrPoint.x, qrPoint.y, 140 * qrPoint.scale, 140 * qrPoint.scale);
    }
    return canvas;
  };
  const download = async () => { const canvas = await renderCanvas(); if (!canvas) return; const link = document.createElement("a"); link.download = `vizora-${layout}-${side}-85x55.png`; link.href = canvas.toDataURL("image/png"); link.click(); };

  return <><main className="commerce-page"><section className="site-container print-editor">
    <div className="print-form no-print">
      <span className="section-label"><QrIcon size={15} /> 85 × 55 мм</span><h1>Конструктор печатной визитки</h1><p>Девять редактируемых дизайнов. Меняйте цвета, данные и логотип; PNG создаётся в размере 1004 × 650 px при 300 dpi.</p>
      <div className="template-picker">{templates.map((item) => <button className={layout === item.id ? "active" : ""} onClick={() => setLayout(item.id)} key={item.id}><span className={`template-mini mini-${item.id}`} style={{ "--mini-bg": colors.bg, "--mini-accent": colors.accent, "--mini-light": colors.light } as CSSProperties}><i /><b /></span><strong>{item.name}</strong></button>)}</div>
      <h2 className="editor-subtitle">Готовые палитры</h2>
      <div className="color-options">{palettes.map((item) => <button className={palette.id === item.id ? "active" : ""} onClick={() => choosePalette(item)} key={item.id}><i style={{ background: item.bg, borderColor: item.accent }} />{item.name}</button>)}</div>
      <div className="custom-colors"><label>Фон<input type="color" value={colors.bg} onChange={(e) => setColors({ ...colors, bg: e.target.value })} /></label><label>Акцент<input type="color" value={colors.accent} onChange={(e) => setColors({ ...colors, accent: e.target.value })} /></label><label>Светлая зона<input type="color" value={colors.light} onChange={(e) => setColors({ ...colors, light: e.target.value })} /></label><label>Текст<input type="color" value={colors.ink} onChange={(e) => setColors({ ...colors, ink: e.target.value })} /></label></div>
      <h2 className="editor-subtitle"><Shapes size={16} /> Знак вместо логотипа</h2>
      <div className="logo-library">{logoIds.map((id) => <button className={!logo && logoMark === id ? "active" : ""} onClick={() => { setLogo(""); setLogoMark(id); }} key={id}><LogoMark id={id} /></button>)}</div>
      <div className="asset-upload-pair"><label className="logo-upload"><ImagePlus size={17} /> Собственный логотип<input hidden type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => void readImage(e.target.files?.[0]).then(setLogo)} /></label><label className="logo-upload"><ImagePlus size={17} /> Фотография<input hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => void readImage(e.target.files?.[0]).then(setPhoto)} /></label></div>
      <div className="element-size-control"><div><strong>Размер выбранного элемента</strong><span>{({ brand: "Логотип и компания", person: "ФИО и должность", company: "Логотип", contacts: "Контакты", socials: "Социальные сети", qr: "QR-код", photo: "Фотография" } as Record<MoveKey,string>)[selected]}</span></div><input type="range" min=".5" max="2" step=".05" value={sizes[selected]} onChange={(e) => setSizes((value) => ({ ...value, [selected]: Number(e.target.value) }))} /><b>{Math.round(sizes[selected] * 100)}%</b></div>
      {Object.entries(data).map(([key, value]) => <label key={key}><span>{({ name: "ФИО", position: "Должность", organization: "Организация", phone: "Телефон", email: "E-mail", website: "Сайт", address: "Адрес", instagram: "Instagram", facebook: "Facebook", telegram: "Telegram", whatsapp: "WhatsApp", qr: "Ссылка QR" } as Record<string,string>)[key]}</span><input value={value} onChange={(e) => setData({ ...data, [key]: e.target.value })} /></label>)}
    </div>
    <div className="print-preview-column">
      <div className="side-switch no-print"><button className={side === "front" ? "active" : ""} onClick={() => setSide("front")}>Лицевая сторона</button><button className={side === "back" ? "active" : ""} onClick={() => setSide("back")}>Обратная сторона</button></div>
      <div ref={cardRef} className={`physical-card physical-${layout} card-side-${side}`} style={{ "--card-bg": colors.bg, "--card-accent": colors.accent, "--card-light": colors.light, "--card-ink": colors.ink } as CSSProperties}>
        <CardDecor layout={layout} />
        {side === "front" ? <div className="physical-content physical-front-content">
          <div {...movableProps("brand", "physical-brand")}>{logo ? <img src={logo} alt="" /> : <LogoMark id={logoMark} />}<span><strong>{data.organization}</strong><small>{data.website}</small></span></div>
          {photo && <div {...movableProps("photo", "print-photo")}><img src={photo} alt="" /></div>}
          <div {...movableProps("qr", "qr-movable")}><QRCodePreview value={data.qr} dark={useRightPanel ? "#15171c" : colors.ink} light={useRightPanel ? colors.light : colors.bg} /></div>
        </div>
        : <div className="physical-content physical-back-content">
          <div {...movableProps("person", "physical-person")}><h2>{data.name}</h2><h3>{data.position}</h3></div>
          <div {...movableProps("company", "physical-contact-brand")}>{logo ? <img src={logo} alt="" /> : <LogoMark id={logoMark} />}<strong>{data.organization}</strong></div>
          {photo && <div {...movableProps("photo", "print-photo")}><img src={photo} alt="" /></div>}
          <div {...movableProps("contacts", "print-contact-list")}><span><Phone />{data.phone}</span><span><Mail />{data.email}</span><span><Globe2 />{data.website}</span><span><MapPin />{data.address}</span></div>
          <div {...movableProps("socials", "print-social-list")}><span title={data.instagram}><Instagram /></span><span title={data.facebook}><Facebook /></span><span title={data.telegram}><Send /></span><span title={data.whatsapp}><MessageCircle /></span></div>
          <div {...movableProps("qr", "qr-movable")}><QRCodePreview value={data.qr} dark={useRightPanel ? "#15171c" : colors.ink} light={useRightPanel ? colors.light : colors.bg} /></div>
        </div>}
      </div>
      <p className="print-safe-note">Нажмите на текст, логотип, фото, контакты или QR и перетащите. Выбранный элемент можно увеличить или уменьшить ползунком.</p>
      <div className="print-buttons no-print"><button className="button button-primary" onClick={download}><Download size={17} /> Скачать PNG</button><button className="button button-secondary" onClick={() => window.print()}><Printer size={17} /> Печать / PDF</button></div>
    </div>
  </section></main><div className="no-print"><Footer /></div></>;
}

function CardDecor({ layout }: { layout: TemplateId }) {
  return <div className={`card-decor decor-${layout}`} aria-hidden="true"><i /><i /><i /><b /><b /></div>;
}

function LogoMark({ id }: { id: LogoId }) {
  if (id === "monogram") return <svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="12" /><text x="50" y="69">V</text></svg>;
  if (id === "leaf") return <svg viewBox="0 0 100 100"><path d="M16 82C18 24 65 8 86 16c4 42-29 70-70 66Z" /><path className="cut" d="M25 72 72 28" /></svg>;
  if (id === "spark") return <svg viewBox="0 0 100 100"><path d="m50 6 12 32 32 12-32 12-12 32-12-32L6 50l32-12Z" /></svg>;
  if (id === "peak") return <svg viewBox="0 0 100 100"><path d="m10 82 38-62 14 27 27-29v64" /></svg>;
  if (id === "link") return <svg viewBox="0 0 100 100"><path d="M46 34 35 23a20 20 0 0 0-28 28l12 12a20 20 0 0 0 28 0l9-9M54 66l11 11a20 20 0 0 0 28-28L81 37a20 20 0 0 0-28 0l-9 9" /></svg>;
  if (id === "frame") return <svg viewBox="0 0 100 100"><rect x="14" y="14" width="72" height="72" /><path d="M15 67 67 15" /></svg>;
  if (id === "diamond") return <svg viewBox="0 0 100 100"><rect x="22" y="22" width="56" height="56" transform="rotate(45 50 50)" /><circle cx="50" cy="50" r="11" /></svg>;
  return <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" /><path d="m22 74 56-48" /></svg>;
}

function QRCodePreview({ value, dark, light }: { value: string; dark: string; light: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { let active = true; void QRCode.toDataURL(value || "https://vizora.tj", { width: 240, margin: 1, color: { dark, light } }).then((result) => { if (active) setSrc(result); }); return () => { active = false; }; }, [value, dark, light]);
  return <img className="physical-qr" src={src} alt="QR" />;
}

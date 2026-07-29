import { Download, ImagePlus, Printer, QrCode as QrIcon } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import Footer from "../components/layout/Footer";

const palettes = [
  { id: "emerald", name: "Изумруд", bg: "#073d35", accent: "#d4af67", ink: "#ffffff" },
  { id: "midnight", name: "Ночной синий", bg: "#071a3d", accent: "#8b5cf6", ink: "#ffffff" },
  { id: "ivory", name: "Слоновая кость", bg: "#f8f6f1", accent: "#aa8547", ink: "#101826" },
  { id: "graphite", name: "Графит", bg: "#121826", accent: "#22c7b8", ink: "#ffffff" }
];

const readImage = (file?: File) => new Promise<string>((resolve, reject) => {
  if (!file) return reject();
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

export default function PrintCardDesignerPage() {
  const preview = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState("executive");
  const [palette, setPalette] = useState(palettes[0]);
  const [side, setSide] = useState<"front" | "back">("front");
  const [photo, setPhoto] = useState("");
  const [logo, setLogo] = useState("");
  const [data, setData] = useState({ name: "Фируз Саидов", position: "Архитектор и основатель", organization: "FORMA Studio", phone: "+992 93 555 21 21", email: "hello@forma.tj", website: "forma.tj", qr: "https://raqibj021.github.io/card-tj2/#/card/demo" });

  const renderCanvas = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1004; canvas.height = 650;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = palette.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = palette.accent;
    if (layout === "executive") ctx.fillRect(0, 0, 42, canvas.height);
    if (layout === "modern") { ctx.beginPath(); ctx.arc(900, 80, 250, 0, Math.PI * 2); ctx.fill(); }
    if (layout === "minimal") ctx.fillRect(0, 0, canvas.width, 14);
    ctx.fillStyle = palette.ink;
    if (side === "front") {
      const x = layout === "executive" ? 390 : 90;
      ctx.font = "700 55px Arial"; ctx.fillText(data.name, x, 220);
      ctx.fillStyle = palette.accent; ctx.font = "600 28px Arial"; ctx.fillText(data.position, x, 274);
      ctx.fillStyle = palette.ink; ctx.font = "600 25px Arial"; ctx.fillText(data.organization, x, 335);
      ctx.font = "22px Arial"; ctx.fillText(data.phone, x, 430); ctx.fillText(data.email, x, 474); ctx.fillText(data.website, x, 518);
      if (photo) {
        const image = new Image(); image.src = photo; await image.decode();
        ctx.save(); ctx.beginPath(); ctx.arc(220, 265, 135, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(image, 85, 130, 270, 270); ctx.restore();
      }
      if (logo) {
        const image = new Image(); image.src = logo; await image.decode(); ctx.drawImage(image, 765, 45, 170, 90);
      }
    } else {
      const qr = await QRCode.toDataURL(data.qr, { margin: 1, width: 300, color: { dark: palette.ink, light: palette.bg } });
      const qrImage = new Image(); qrImage.src = qr; await qrImage.decode(); ctx.drawImage(qrImage, 352, 100, 300, 300);
      ctx.textAlign = "center"; ctx.fillStyle = palette.ink; ctx.font = "700 38px Arial"; ctx.fillText(data.organization, 502, 470);
      ctx.fillStyle = palette.accent; ctx.font = "22px Arial"; ctx.fillText("Наведите камеру, чтобы открыть визитку", 502, 520);
    }
    return canvas;
  };
  const download = async () => {
    const canvas = await renderCanvas();
    if (!canvas) return;
    const link = document.createElement("a"); link.download = `vizora-${side}-85x55.png`; link.href = canvas.toDataURL("image/png"); link.click();
  };

  return (
    <>
      <main className="commerce-page">
        <section className="site-container print-editor">
          <div className="print-form no-print">
            <span className="section-label"><QrIcon size={15} /> 85 × 55 мм</span><h1>Дизайн печатной визитки</h1><p>Настройте обе стороны. PNG создаётся в размере 1004 × 650 px — подходит для печати 300 dpi.</p>
            <div className="segmented">{["executive", "modern", "minimal"].map((value, index) => <button className={layout === value ? "active" : ""} onClick={() => setLayout(value)} key={value}>Шаблон {index + 1}</button>)}</div>
            <div className="color-options">{palettes.map((item) => <button className={palette.id === item.id ? "active" : ""} onClick={() => setPalette(item)} key={item.id}><i style={{ background: item.bg, borderColor: item.accent }} />{item.name}</button>)}</div>
            {Object.entries(data).map(([key, value]) => <label key={key}><span>{({ name: "ФИО", position: "Должность", organization: "Организация", phone: "Телефон", email: "E-mail", website: "Сайт", qr: "Ссылка QR" } as Record<string,string>)[key]}</span><input value={value} onChange={(e) => setData({ ...data, [key]: e.target.value })} /></label>)}
            <div className="upload-pair"><label><ImagePlus size={17} /> Фотография<input hidden type="file" accept="image/*" onChange={(e) => void readImage(e.target.files?.[0]).then(setPhoto)} /></label><label><ImagePlus size={17} /> Логотип<input hidden type="file" accept="image/*" onChange={(e) => void readImage(e.target.files?.[0]).then(setLogo)} /></label></div>
          </div>
          <div className="print-preview-column">
            <div className="side-switch no-print"><button className={side === "front" ? "active" : ""} onClick={() => setSide("front")}>Лицевая сторона</button><button className={side === "back" ? "active" : ""} onClick={() => setSide("back")}>Обратная сторона</button></div>
            <div ref={preview} className={`physical-card physical-${layout}`} style={{ "--card-bg": palette.bg, "--card-accent": palette.accent, "--card-ink": palette.ink } as CSSProperties}>
              {side === "front" ? <><div className="physical-accent" />{photo ? <img className="physical-photo" src={photo} alt="" /> : <div className="physical-photo-placeholder">Фото</div>}<div className="physical-copy"><h2>{data.name}</h2><h3>{data.position}</h3><strong>{data.organization}</strong><p>{data.phone}<br />{data.email}<br />{data.website}</p></div>{logo && <img className="physical-logo" src={logo} alt="" />}</> : <div className="physical-back"><QRCodePreview value={data.qr} dark={palette.ink} light={palette.bg} /><h2>{data.organization}</h2><p>Наведите камеру, чтобы открыть визитку</p></div>}
            </div>
            <p className="print-safe-note">Пунктир показывает безопасную зону. Важные элементы не должны выходить за неё.</p>
            <div className="print-buttons no-print"><button className="button button-primary" onClick={download}><Download size={17} /> Скачать PNG</button><button className="button button-secondary" onClick={() => window.print()}><Printer size={17} /> Печать / PDF</button></div>
          </div>
        </section>
      </main>
      <div className="no-print"><Footer /></div>
    </>
  );
}

function QRCodePreview({ value, dark, light }: { value: string; dark: string; light: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let active = true;
    void QRCode.toDataURL(value || "https://vizora.tj", { width: 240, margin: 1, color: { dark, light } }).then((result) => {
      if (active) setSrc(result);
    });
    return () => { active = false; };
  }, [value, dark, light]);
  return <img src={src} alt="QR" />;
}

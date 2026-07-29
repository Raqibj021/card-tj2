import { Badge, Contact, CreditCard, Download, FileSignature, Printer, QrCode, ScanLine, ShoppingBag, Sparkles } from "lucide-react";
import { Link } from "react-router";
import Footer from "../components/layout/Footer";
import { useApp } from "../context/AppContext";

export default function ServicesPage() {
  const { language } = useApp();
  const copy = {
    ru: {
      label: "Дополнительные услуги", title: "Всё для визиток и QR-кодов", text: "Только профильные решения Vizora — без посторонней полиграфии", calculate: "Рассчитать стоимость", request: "Оставить заявку",
      items: [["Визитка под ключ", "Менеджер полностью оформит личную или организационную визитку."], ["Индивидуальный дизайн", "Макет электронной и печатной визитки 85 × 55 мм."], ["Подготовка к печати", "Лицевая и обратная стороны, QR-код, экспорт в PDF и PNG."], ["NFC-визитка", "Физическая карта с быстрым открытием цифрового профиля."], ["QR-карты и бейджи", "Персональные карточки сотрудников и пропуска с QR-кодом."], ["QR-таблички", "Настольные таблички, наклейки и общий QR организации."]]
    },
    tj: {
      label: "Хизматҳои иловагӣ", title: "Ҳама чиз барои варақаҳо ва QR-кодҳо", text: "Танҳо хизматҳои соҳавии Vizora — бе маҳсулоти чопии бегона", calculate: "Ҳисоб кардани арзиш", request: "Дархост фиристодан",
      items: [["Варақаи омода", "Менеҷер варақаи шахсӣ ё ташкилотиро пурра омода мекунад."], ["Дизайни инфиродӣ", "Тарҳи варақаи электронӣ ва чопии 85 × 55 мм."], ["Омодагӣ ба чоп", "Тарафҳои пешу қафо, QR-код ва содирот ба PDF ва PNG."], ["Варақаи NFC", "Корти ҷисмонӣ барои зуд кушодани профили рақамӣ."], ["QR-кортҳо ва бейҷҳо", "Кортҳои шахсии кормандон ва иҷозатномаҳо бо QR-код."], ["QR-лавҳаҳо", "Лавҳаҳои рӯимизӣ, часпакҳо ва QR-и умумии ташкилот."]]
    },
    en: {
      label: "Additional services", title: "Everything for business cards and QR codes", text: "Dedicated Vizora solutions without unrelated print services", calculate: "Calculate cost", request: "Send request",
      items: [["Turnkey business card", "A manager will fully prepare a personal or organization card."], ["Custom design", "Digital and printed business card layout in 85 × 55 mm."], ["Print preparation", "Front and back sides, QR code, PDF and PNG export."], ["NFC card", "A physical card that instantly opens the digital profile."], ["QR cards and badges", "Personal employee cards and passes with QR codes."], ["QR signs", "Desk signs, stickers and a shared organization QR code."]]
    }
  }[language];
  const icons = [Contact, Sparkles, Download, CreditCard, Badge, ScanLine];
  const services = copy.items.map(([title, text], index) => ({ icon: icons[index], title, text }));
  return (
    <>
      <main>
        <section className="directory-hero">
          <div className="site-container py-16 text-center md:py-24">
            <span className="section-label">{copy.label}</span>
            <h1>{copy.title}</h1>
            <p>{copy.text}</p>
            <Link to="/support" className="button button-primary button-large mt-8">
              {copy.calculate}
            </Link>
            <div className="service-shortcuts">
              <Link to="/service-order"><ShoppingBag size={18} /> {copy.request}</Link>
              <Link to="/print-card"><Printer size={18} /> 85 × 55 мм</Link>
              <Link to="/contract"><FileSignature size={18} /> Договор</Link>
            </div>
          </div>
        </section>
        <section className="section">
          <div className="site-container">
            <div className="service-grid">
              {services.map(({ icon: Icon, title, text }) => (
                <article className="service-card" key={title}>
                  <div><Icon size={23} /></div>
                  <h2>{title}</h2>
                  <p>{text}</p>
                  <Link to="/service-order">{copy.request} <QrCode size={15} /></Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

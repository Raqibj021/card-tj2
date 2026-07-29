import { Badge, Contact, CreditCard, Download, QrCode, ScanLine, Sparkles } from "lucide-react";
import { Link } from "react-router";
import Footer from "../components/layout/Footer";

const services = [
  { icon: Contact, title: "Визитка под ключ", text: "Менеджер полностью оформит личную или организационную визитку." },
  { icon: Sparkles, title: "Индивидуальный дизайн", text: "Макет электронной и печатной визитки 85 × 55 мм." },
  { icon: Download, title: "Подготовка к печати", text: "Лицевая и обратная стороны, QR-код, экспорт в PDF и PNG." },
  { icon: CreditCard, title: "NFC-визитка", text: "Физическая карта с быстрым открытием цифрового профиля." },
  { icon: Badge, title: "QR-карты и бейджи", text: "Персональные карточки сотрудников и пропуска с QR-кодом." },
  { icon: ScanLine, title: "QR-таблички", text: "Настольные таблички, наклейки и общий QR организации." }
];

export default function ServicesPage() {
  return (
    <>
      <main>
        <section className="directory-hero">
          <div className="site-container py-16 text-center md:py-24">
            <span className="section-label">Дополнительные услуги</span>
            <h1>Всё для визиток и QR-кодов</h1>
            <p>Только профильные решения Vizora — без посторонней полиграфии</p>
            <Link to="/support" className="button button-primary button-large mt-8">
              Рассчитать стоимость
            </Link>
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
                  <Link to="/support">Оставить заявку <QrCode size={15} /></Link>
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

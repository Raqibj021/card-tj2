import { ArrowRight, Building2, CreditCard, Paintbrush, ScanLine } from "lucide-react";
import { Link } from "react-router";
import Footer from "../components/layout/Footer";
import { useApp } from "../context/AppContext";

const serviceIds = ["custom-design", "organization-turnkey", "nfc-cards", "nfc-qr-signs"] as const;

export default function ServicesPage() {
  const { language } = useApp();
  const copy = {
    ru: { label: "Услуги Vizora", title: "Выберите нужное решение", text: "Четыре направления для личных визиток, организаций и удобного обмена контактами.", open: "Подробнее", items: [["Индивидуальный дизайн визитки", "Уникальный электронный и печатный дизайн под ваш стиль и профессию."], ["Визитки организации под ключ", "Единое оформление, создание и подключение визиток всей команды."], ["NFC-карты", "Фирменные карты Vizora, которые открывают вашу визитку одним касанием."], ["NFC- и QR-таблички", "Настольные, настенные и компактные решения для офиса и бизнеса."]] },
    tj: { label: "Хизматҳои Vizora", title: "Хизмати лозимаро интихоб кунед", text: "Чор самт барои варақаҳои шахсӣ, ташкилотҳо ва мубодилаи осони тамос.", open: "Муфассал", items: [["Дизайни инфиродии варақа", "Дизайни нодири электронӣ ва чопӣ мувофиқи услуб ва касби шумо."], ["Варақаҳои ташкилот бо омодасозии пурра", "Тарҳи ягона, таҳия ва пайваст кардани варақаҳои тамоми даста."], ["Кортҳои NFC", "Кортҳои фирмавии Vizora, ки варақаро бо як ламс мекушоянд."], ["Лавҳаҳои NFC ва QR", "Роҳҳалҳои рӯимизӣ, деворӣ ва хурд барои идора ва тиҷорат."]] },
    en: { label: "Vizora services", title: "Choose the right solution", text: "Four focused services for personal cards, organizations and effortless contact sharing.", open: "Learn more", items: [["Custom business card design", "A unique digital and print design tailored to your style and profession."], ["Turnkey organization cards", "Unified design, setup and connection of cards for the whole team."], ["NFC cards", "Branded Vizora cards that open your profile with one tap."], ["NFC and QR signs", "Desktop, wall-mounted and compact solutions for offices and businesses."]] }
  }[language];
  const icons = [Paintbrush, Building2, CreditCard, ScanLine];

  return <><main className="services-landing"><section className="services-hero"><div className="services-orb services-orb-one" /><div className="services-orb services-orb-two" /><div className="site-container services-hero-inner"><span className="section-label">{copy.label}</span><h1>{copy.title}</h1><p>{copy.text}</p></div></section><section className="site-container services-choice-grid">{copy.items.map(([title, description], index) => { const Icon = icons[index]; return <Link className="services-choice-card" to={`/services/${serviceIds[index]}`} key={serviceIds[index]}><span className="services-choice-number">0{index + 1}</span><span className="services-choice-icon"><Icon size={27} /></span><h2>{title}</h2><p>{description}</p><strong>{copy.open}<ArrowRight size={18} /></strong></Link>; })}</section></main><Footer /></>;
}

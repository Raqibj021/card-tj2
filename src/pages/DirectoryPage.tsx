import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Camera,
  ChevronRight,
  GraduationCap,
  Languages,
  MapPin,
  Search,
  Scale,
  Stethoscope,
  Wrench
} from "lucide-react";
import { Link } from "react-router";
import Footer from "../components/layout/Footer";

const categories = [
  { name: "Врачи и клиники", icon: Stethoscope, count: 48 },
  { name: "Юристы", icon: Scale, count: 31 },
  { name: "Переводчики", icon: Languages, count: 56 },
  { name: "Преподаватели", icon: GraduationCap, count: 72 },
  { name: "Ремонт и мастера", icon: Wrench, count: 43 },
  { name: "Фото и дизайн", icon: Camera, count: 39 },
  { name: "Компании", icon: Building2, count: 27 },
  { name: "Другие специалисты", icon: BriefcaseBusiness, count: 64 }
];

const specialists = [
  { initials: "ФС", name: "Фаридун Саидов", role: "Переводчик английского языка", city: "Душанбе", color: "blue" },
  { initials: "МР", name: "Малика Рахмонова", role: "Преподаватель математики", city: "Душанбе", color: "violet" },
  { initials: "АК", name: "Азиз Каримов", role: "Специалист по ремонту техники", city: "Худжанд", color: "emerald" }
];

export default function DirectoryPage() {
  return (
    <>
      <main>
        <section className="directory-hero">
          <div className="site-container py-16 text-center md:py-24">
            <span className="section-label">Проверенный каталог</span>
            <h1>Найдите нужного специалиста</h1>
            <p>Настоящие люди и организации с подтверждёнными данными</p>
            <form className="directory-search" onSubmit={(event) => event.preventDefault()}>
              <Search size={21} />
              <input aria-label="Поиск" placeholder="Профессия, услуга или имя" />
              <span><MapPin size={17} /> Душанбе</span>
              <button type="submit" className="button button-primary">Найти</button>
            </form>
          </div>
        </section>

        <section className="section">
          <div className="site-container">
            <div className="platform-section-head">
              <div>
                <span className="section-label">Категории</span>
                <h2>Все специалисты в одном месте</h2>
              </div>
              <span className="verified-note"><BadgeCheck size={18} /> Публикация только после проверки</span>
            </div>
            <div className="category-grid">
              {categories.map(({ name, icon: Icon, count }) => (
                <button type="button" className="category-card" key={name}>
                  <span><Icon size={21} /></span>
                  <strong>{name}</strong>
                  <small>{count} профилей</small>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-muted">
          <div className="site-container">
            <div className="platform-section-head">
              <div>
                <span className="section-label">Новые профили</span>
                <h2>Проверенные специалисты</h2>
              </div>
              <Link to="/create" className="text-link">Разместить профиль <ChevronRight size={16} /></Link>
            </div>
            <div className="specialist-grid">
              {specialists.map((item) => (
                <article className="specialist-card" key={item.name}>
                  <div className={`specialist-avatar specialist-avatar-${item.color}`}>{item.initials}</div>
                  <div className="specialist-verified"><BadgeCheck size={15} /> Проверено Vizora</div>
                  <h3>{item.name}</h3>
                  <p>{item.role}</p>
                  <span><MapPin size={15} /> {item.city}</span>
                  <button type="button" className="button button-secondary w-full">Открыть визитку</button>
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

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
import { useApp } from "../context/AppContext";

export default function DirectoryPage() {
  const { language } = useApp();
  const copy = {
    ru: { label: "Проверенный каталог", title: "Найдите нужного специалиста", text: "Настоящие люди и организации с подтверждёнными данными", search: "Поиск", placeholder: "Профессия, услуга или имя", find: "Найти", categories: "Категории", all: "Все специалисты в одном месте", verifiedOnly: "Публикация только после проверки", profiles: "профилей", newProfiles: "Новые профили", verified: "Проверенные специалисты", publish: "Разместить профиль", checked: "Проверено Vizora", open: "Открыть визитку", categoryNames: ["Врачи и клиники", "Юристы", "Переводчики", "Преподаватели", "Ремонт и мастера", "Фото и дизайн", "Компании", "Другие специалисты"], roles: ["Переводчик английского языка", "Преподаватель математики", "Специалист по ремонту техники"] },
    tj: { label: "Феҳристи тасдиқшуда", title: "Мутахассиси лозимиро ёбед", text: "Шахсон ва ташкилотҳои воқеӣ бо маълумоти тасдиқшуда", search: "Ҷустуҷӯ", placeholder: "Касб, хизмат ё ном", find: "Ёфтан", categories: "Категорияҳо", all: "Ҳамаи мутахассисон дар як ҷой", verifiedOnly: "Нашр танҳо пас аз санҷиш", profiles: "профил", newProfiles: "Профилҳои нав", verified: "Мутахассисони тасдиқшуда", publish: "Ҷойгир кардани профил", checked: "Аз ҷониби Vizora тасдиқ шудааст", open: "Кушодани варақа", categoryNames: ["Табибон ва клиникаҳо", "Ҳуқуқшиносон", "Тарҷумонҳо", "Омӯзгорон", "Таъмир ва устоҳо", "Акс ва дизайн", "Ширкатҳо", "Дигар мутахассисон"], roles: ["Тарҷумони забони англисӣ", "Омӯзгори математика", "Мутахассиси таъмири техника"] },
    en: { label: "Verified directory", title: "Find the specialist you need", text: "Real people and organizations with verified information", search: "Search", placeholder: "Profession, service or name", find: "Find", categories: "Categories", all: "All specialists in one place", verifiedOnly: "Published only after verification", profiles: "profiles", newProfiles: "New profiles", verified: "Verified specialists", publish: "Publish profile", checked: "Verified by Vizora", open: "Open business card", categoryNames: ["Doctors and clinics", "Lawyers", "Translators", "Teachers", "Repair and trades", "Photography and design", "Companies", "Other specialists"], roles: ["English translator", "Mathematics teacher", "Technical repair specialist"] }
  }[language];
  const icons = [Stethoscope, Scale, Languages, GraduationCap, Wrench, Camera, Building2, BriefcaseBusiness];
  const counts = [48, 31, 56, 72, 43, 39, 27, 64];
  const categories = copy.categoryNames.map((name, index) => ({ name, icon: icons[index], count: counts[index] }));
  const specialists = [
    { initials: "ФС", name: "Фаридун Саидов", role: copy.roles[0], city: "Душанбе", color: "blue" },
    { initials: "МР", name: "Малика Рахмонова", role: copy.roles[1], city: "Душанбе", color: "violet" },
    { initials: "АК", name: "Азиз Каримов", role: copy.roles[2], city: language === "en" ? "Khujand" : "Хуҷанд", color: "emerald" }
  ];
  return (
    <>
      <main>
        <section className="directory-hero">
          <div className="site-container py-16 text-center md:py-24">
            <span className="section-label">{copy.label}</span>
            <h1>{copy.title}</h1>
            <p>{copy.text}</p>
            <form className="directory-search" onSubmit={(event) => event.preventDefault()}>
              <Search size={21} />
              <input aria-label={copy.search} placeholder={copy.placeholder} />
              <span><MapPin size={17} /> {language === "en" ? "Dushanbe" : "Душанбе"}</span>
              <button type="submit" className="button button-primary">{copy.find}</button>
            </form>
          </div>
        </section>

        <section className="section">
          <div className="site-container">
            <div className="platform-section-head">
              <div>
                <span className="section-label">{copy.categories}</span>
                <h2>{copy.all}</h2>
              </div>
              <span className="verified-note"><BadgeCheck size={18} /> {copy.verifiedOnly}</span>
            </div>
            <div className="category-grid">
              {categories.map(({ name, icon: Icon, count }) => (
                <button type="button" className="category-card" key={name}>
                  <span><Icon size={21} /></span>
                  <strong>{name}</strong>
                  <small>{count} {copy.profiles}</small>
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
                <span className="section-label">{copy.newProfiles}</span>
                <h2>{copy.verified}</h2>
              </div>
              <Link to="/create" className="text-link">{copy.publish} <ChevronRight size={16} /></Link>
            </div>
            <div className="specialist-grid">
              {specialists.map((item) => (
                <article className="specialist-card" key={item.name}>
                  <div className={`specialist-avatar specialist-avatar-${item.color}`}>{item.initials}</div>
                  <div className="specialist-verified"><BadgeCheck size={15} /> {copy.checked}</div>
                  <h3>{item.name}</h3>
                  <p>{item.role}</p>
                  <span><MapPin size={15} /> {item.city}</span>
                  <button type="button" className="button button-secondary w-full">{copy.open}</button>
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

import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Camera,
  ChevronRight,
  FileCheck2,
  GraduationCap,
  Languages,
  MapPin,
  Search,
  Sparkles,
  Scale,
  Stethoscope,
  Wrench
} from "lucide-react";
import { Link, useNavigate } from "react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import Footer from "../components/layout/Footer";
import { useApp } from "../context/AppContext";
import { useAuth } from "../context/AuthContext";
import { cardRepository } from "../lib/cardRepository";
import { directoryRepository, type DirectoryProfile } from "../lib/directoryRepository";
import { verificationRepository, type ProfessionCategory } from "../lib/verificationRepository";
import type { DigitalCard } from "../types/card";

export default function DirectoryPage() {
  const { language } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<DirectoryProfile[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [myCards, setMyCards] = useState<DigitalCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState("");
  const [professionCategories, setProfessionCategories] = useState<ProfessionCategory[]>([]);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishBusy, setPublishBusy] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const copy = {
    ru: { label: "Проверенный каталог", title: "Найдите нужного специалиста", text: "Настоящие люди и организации с подтверждёнными данными", search: "Поиск", placeholder: "Профессия, услуга или имя", find: "Найти", categories: "Категории", all: "Все специалисты в одном месте", verifiedOnly: "Публикация только после проверки", profiles: "профилей", newProfiles: "Новые профили", verified: "Проверенные специалисты", publish: "Добавить мою визитку", publishHint: "Уже есть визитка? Добавьте к ней профессию, город и услуги", checked: "Проверено Vizora", open: "Открыть визитку", modalTitle: "Визитка специалиста", modalText: "Основные контакты берутся из вашей визитки. Заполните только профессиональную информацию.", chooseCard: "Ваша визитка", chooseCategory: "Категория", specialty: "Специальность", city: "Город", tags: "Услуги и теги", tagsHint: "Например: письменный перевод, английский, нотариальное заверение", experience: "Опыт", experienceHint: "Например: 8 лет", summary: "О профессиональной деятельности", summaryHint: "Коротко расскажите, чем вы полезны клиенту", proof: "Подтверждающий документ", proofHint: "Обязателен для лицензируемых профессий. Видит только модератор.", add: "Отправить на проверку", cancel: "Отмена", noCard: "Сначала создайте личную визитку", success: "Заявка отправлена. После проверки визитка станет доступна всем в выбранной категории.", categoryNames: ["Врачи и клиники", "Юристы", "Переводчики", "Преподаватели", "Ремонт и мастера", "Фото и дизайн", "Компании", "Другие специалисты"], roles: ["Переводчик английского языка", "Преподаватель математики", "Специалист по ремонту техники"] },
    tj: { label: "Феҳристи тасдиқшуда", title: "Мутахассиси лозимиро ёбед", text: "Шахсон ва ташкилотҳои воқеӣ бо маълумоти тасдиқшуда", search: "Ҷустуҷӯ", placeholder: "Касб, хизмат ё ном", find: "Ёфтан", categories: "Категорияҳо", all: "Ҳамаи мутахассисон дар як ҷой", verifiedOnly: "Нашр танҳо пас аз санҷиш", profiles: "профил", newProfiles: "Профилҳои нав", verified: "Мутахассисони тасдиқшуда", publish: "Ҷойгир кардани профил", checked: "Аз ҷониби Vizora тасдиқ шудааст", open: "Кушодани варақа", categoryNames: ["Табибон ва клиникаҳо", "Ҳуқуқшиносон", "Тарҷумонҳо", "Омӯзгорон", "Таъмир ва устоҳо", "Акс ва дизайн", "Ширкатҳо", "Дигар мутахассисон"], roles: ["Тарҷумони забони англисӣ", "Омӯзгори математика", "Мутахассиси таъмири техника"] },
    en: { label: "Verified directory", title: "Find the specialist you need", text: "Real people and organizations with verified information", search: "Search", placeholder: "Profession, service or name", find: "Find", categories: "Categories", all: "All specialists in one place", verifiedOnly: "Published only after verification", profiles: "profiles", newProfiles: "New profiles", verified: "Verified specialists", publish: "Publish profile", checked: "Verified by Vizora", open: "Open business card", categoryNames: ["Doctors and clinics", "Lawyers", "Translators", "Teachers", "Repair and trades", "Photography and design", "Companies", "Other specialists"], roles: ["English translator", "Mathematics teacher", "Technical repair specialist"] }
  }[language];
  const publishCopy = {
    ru: { hint: "Уже есть визитка? Добавьте к ней профессию, город и услуги", modalTitle: "Визитка специалиста", modalText: "Основные контакты берутся из вашей визитки. Заполните только профессиональную информацию.", chooseCard: "Ваша визитка", chooseCategory: "Категория", specialty: "Специальность", city: "Город", tags: "Услуги и теги", tagsHint: "Например: письменный перевод, английский, нотариальное заверение", experience: "Опыт", experienceHint: "Например: 8 лет", summary: "О профессиональной деятельности", summaryHint: "Коротко расскажите, чем вы полезны клиенту", proof: "Подтверждающий документ", proofHint: "Обязателен для лицензируемых профессий. Видит только модератор.", add: "Отправить на проверку", cancel: "Отмена", noCard: "Сначала создайте личную визитку", success: "Заявка отправлена. После проверки визитка станет доступна всем в выбранной категории." },
    tj: { hint: "Варақа доред? Касб, шаҳр ва хизматҳоро илова кунед", modalTitle: "Варақаи мутахассис", modalText: "Тамосҳо аз варақаи шумо гирифта мешаванд. Танҳо маълумоти касбиро пур кунед.", chooseCard: "Варақаи шумо", chooseCategory: "Категория", specialty: "Ихтисос", city: "Шаҳр", tags: "Хизматҳо ва барчаспҳо", tagsHint: "Масалан: тарҷумаи хаттӣ, англисӣ, тасдиқи нотариалӣ", experience: "Таҷриба", experienceHint: "Масалан: 8 сол", summary: "Дар бораи фаъолияти касбӣ", summaryHint: "Кӯтоҳ нависед, ки ба муштарӣ чӣ фоида мерасонед", proof: "Ҳуҷҷати тасдиқкунанда", proofHint: "Барои касбҳои иҷозатномадор ҳатмист. Танҳо модератор мебинад.", add: "Ба санҷиш фиристодан", cancel: "Бекор кардан", noCard: "Аввал варақаи шахсӣ созед", success: "Дархост фиристода шуд. Пас аз санҷиш варақа барои ҳама дастрас мешавад." },
    en: { hint: "Already have a card? Add your profession, city and services", modalTitle: "Professional business card", modalText: "Contact details come from your existing card. Complete only the professional information.", chooseCard: "Your business card", chooseCategory: "Category", specialty: "Specialty", city: "City", tags: "Services and tags", tagsHint: "For example: written translation, English, notarisation", experience: "Experience", experienceHint: "For example: 8 years", summary: "Professional summary", summaryHint: "Briefly explain how you help clients", proof: "Supporting document", proofHint: "Required for licensed professions. Visible only to moderators.", add: "Submit for review", cancel: "Cancel", noCard: "Create a personal card first", success: "Submitted. Once approved, the card will be public in the selected category." }
  }[language];
  const icons = [Stethoscope, Scale, Languages, GraduationCap, Wrench, Camera, Building2, BriefcaseBusiness];
  const categories = copy.categoryNames.map((name, index) => ({ name, icon: icons[index] }));
  useEffect(() => {
    void directoryRepository.list().then(setProfiles);
  }, []);
  async function openPublisher() {
    if (!user) { navigate("/login?redirect=/directory"); return; }
    setPublishOpen(true);
    setPublishMessage("");
    const [cards, availableCategories] = await Promise.all([
      cardRepository.listRemote(),
      verificationRepository.categories(language)
    ]);
    const ownCards = cards.filter((card) => !card.id.startsWith("demo-"));
    setMyCards(ownCards);
    setSelectedCardId(ownCards[0]?.id ?? "");
    setProfessionCategories(availableCategories);
  }
  async function submitSpecialist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const categoryId = String(form.get("categoryId") ?? "");
    const selectedCategory = professionCategories.find((item) => item.id === categoryId);
    if (selectedCategory?.requiresLicense && !documents.length) {
      setPublishMessage(publishCopy.proofHint);
      return;
    }
    setPublishBusy(true);
    setPublishMessage("");
    try {
      await verificationRepository.submitSpecialist({
        cardId: String(form.get("cardId") ?? ""), categoryId,
        title: String(form.get("title") ?? ""), city: String(form.get("city") ?? ""),
        tags: String(form.get("tags") ?? "").split(/[,;]+/),
        experience: String(form.get("experience") ?? ""), summary: String(form.get("summary") ?? ""), files: documents
      });
      setPublishMessage(publishCopy.success);
    } catch (error) {
      setPublishMessage(error instanceof Error ? error.message : "Ошибка отправки");
    } finally { setPublishBusy(false); }
  }
  const filteredProfiles = useMemo(() => profiles.filter((profile) => {
    const matchesText = `${profile.name} ${profile.role} ${profile.organization} ${profile.address}`.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = !category || profile.categorySlug === category;
    return matchesText && matchesCategory;
  }), [profiles, query, category]);
  const categorySlugs = ["medicine", "law", "translation", "education", "repair", "photo-design", "companies", "other"];
  const selectedCard = myCards.find((card) => card.id === selectedCardId) ?? myCards[0];
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
              <input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={copy.search} placeholder={copy.placeholder} />
              <span><MapPin size={17} /> {language === "en" ? "Dushanbe" : "Душанбе"}</span>
              <button type="submit" className="button button-primary">{copy.find}</button>
            </form>
          </div>
        </section>

        <section className="section">
          <div className="site-container">
            <div className="directory-publish-banner">
              <span><Sparkles size={22} /></span>
              <div><strong>{copy.publish}</strong><small>{publishCopy.hint}</small></div>
              <button type="button" className="button button-primary" onClick={() => void openPublisher()}>{copy.publish}<ChevronRight size={17} /></button>
            </div>
            <div className="platform-section-head">
              <div>
                <span className="section-label">{copy.categories}</span>
                <h2>{copy.all}</h2>
              </div>
              <span className="verified-note"><BadgeCheck size={18} /> {copy.verifiedOnly}</span>
            </div>
            <div className="category-grid">
              {categories.map(({ name, icon: Icon }, index) => (
                <button type="button" className={`category-card category-${categorySlugs[index]} ${category === categorySlugs[index] ? "active" : ""}`} key={name} onClick={() => setCategory((current) => current === categorySlugs[index] ? "" : categorySlugs[index])}>
                  <span><Icon size={21} /></span>
                  <strong>{name}</strong>
                  <small>{profiles.filter((profile) => profile.categorySlug === categorySlugs[index]).length} {copy.profiles}</small>
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
            </div>
            <div className="specialist-grid">
              {filteredProfiles.map((item, index) => (
                <article className="specialist-card" key={item.id}>
                  {item.photo ? <img className="specialist-avatar" src={item.photo} alt="" /> : <div className={`specialist-avatar specialist-avatar-${["blue", "violet", "emerald"][index % 3]}`}>{item.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</div>}
                  <div className="specialist-verified"><BadgeCheck size={15} /> {copy.checked}</div>
                  <h3>{item.name}</h3>
                  <p>{item.specialistTitle || item.role}</p>
                  <span><MapPin size={15} /> {item.city || item.address || item.organization || "—"}</span>
                  {!!item.tags.length && <div className="specialist-tags">{item.tags.slice(0, 3).map((tag) => <small key={tag}>{tag}</small>)}</div>}
                  <Link to={`/card/${item.slug}`} className="button button-secondary w-full">{copy.open}</Link>
                </article>
              ))}
              {!filteredProfiles.length && <div className="empty-state"><BadgeCheck size={30} /><h2>{copy.verified}</h2><p>{copy.verifiedOnly}</p></div>}
            </div>
          </div>
        </section>
      </main>
      {publishOpen && <div className="directory-publish-backdrop" role="presentation" onMouseDown={() => setPublishOpen(false)}>
        <section className="directory-publish-modal" role="dialog" aria-modal="true" aria-labelledby="directory-publish-title" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><span className="section-label">VIZORA.TJ</span><h2 id="directory-publish-title">{publishCopy.modalTitle}</h2><p>{publishCopy.modalText}</p></div><button type="button" onClick={() => setPublishOpen(false)} aria-label={publishCopy.cancel}>×</button></header>
          {!myCards.length ? <div className="empty-state"><FileCheck2 size={27} /><h3>{publishCopy.noCard}</h3><Link to="/create" className="button button-primary">{publishCopy.noCard}</Link></div> : <form className="directory-specialist-form" onSubmit={(event) => void submitSpecialist(event)}>
            <label><span>{publishCopy.chooseCard}</span><select name="cardId" required value={selectedCardId} onChange={(event) => setSelectedCardId(event.target.value)}>{myCards.map((card) => <option key={card.id} value={card.id}>{card.fullName} — {card.position}</option>)}</select></label>
            <div className="directory-card-preview">{selectedCard?.photo ? <img src={selectedCard.photo} alt="" /> : <BadgeCheck size={28} />}<div><strong>{selectedCard?.fullName}</strong><span>{selectedCard?.position}</span><small>{selectedCard?.phone}</small></div></div>
            <div className="directory-specialist-grid">
              <label><span>{publishCopy.chooseCategory}</span><select name="categoryId" required><option value="" />{professionCategories.map((item) => <option key={item.id} value={item.id}>{item.name}{item.requiresLicense ? " *" : ""}</option>)}</select></label>
              <label><span>{publishCopy.specialty}</span><input name="title" required maxLength={100} placeholder={publishCopy.specialty} /></label>
              <label><span>{publishCopy.city}</span><input name="city" required maxLength={80} placeholder="Душанбе" /></label>
              <label><span>{publishCopy.experience}</span><input name="experience" maxLength={80} placeholder={publishCopy.experienceHint} /></label>
              <label className="wide"><span>{publishCopy.tags}</span><input name="tags" required placeholder={publishCopy.tagsHint} /></label>
              <label className="wide"><span>{publishCopy.summary}</span><textarea name="summary" required maxLength={500} placeholder={publishCopy.summaryHint} /></label>
              <label className="wide directory-proof"><span>{publishCopy.proof}</span><input type="file" multiple accept="image/png,image/jpeg,application/pdf" onChange={(event) => setDocuments(Array.from(event.target.files ?? []).filter((file) => file.size <= 10 * 1024 * 1024))} /><small>{publishCopy.proofHint}</small></label>
            </div>
            {publishMessage && <div className="auth-message">{publishMessage}</div>}
            <footer><button type="button" className="button button-secondary" onClick={() => setPublishOpen(false)}>{publishCopy.cancel}</button><button type="submit" className="button button-primary" disabled={publishBusy}>{publishBusy ? "…" : publishCopy.add}</button></footer>
          </form>}
        </section>
      </div>}
      <Footer />
    </>
  );
}

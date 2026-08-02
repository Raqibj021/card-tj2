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
import { Link, useNavigate, useSearchParams } from "react-router";
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
  const [searchParams] = useSearchParams();
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
  const [selectedPlan, setSelectedPlan] = useState<"" | "specialist" | "pro">("");
  const [portfolio, setPortfolio] = useState<File[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const copy = {
    ru: { label: "Проверенный каталог", title: "Найдите нужного специалиста", text: "Настоящие люди и организации с подтверждёнными данными", search: "Поиск", placeholder: "Профессия, услуга или имя", find: "Найти", categories: "Категории", all: "Все специалисты в одном месте", verifiedOnly: "Публикация только после проверки", profiles: "профилей", newProfiles: "Новые профили", verified: "Проверенные специалисты", publish: "Добавить мою визитку", publishHint: "Уже есть визитка? Добавьте к ней профессию, город и услуги", checked: "Проверено Vizora", open: "Открыть визитку", modalTitle: "Визитка специалиста", modalText: "Основные контакты берутся из вашей визитки. Заполните только профессиональную информацию.", chooseCard: "Ваша визитка", chooseCategory: "Категория", specialty: "Специальность", city: "Город", tags: "Услуги и теги", tagsHint: "Например: письменный перевод, английский, нотариальное заверение", experience: "Опыт", experienceHint: "Например: 8 лет", summary: "О профессиональной деятельности", summaryHint: "Коротко расскажите, чем вы полезны клиенту", proof: "Подтверждающий документ", proofHint: "Обязателен для лицензируемых профессий. Видит только модератор.", add: "Отправить на проверку", cancel: "Отмена", noCard: "Сначала создайте личную визитку", success: "Заявка отправлена. После проверки визитка станет доступна всем в выбранной категории.", categoryNames: ["Врачи и клиники", "Юристы", "Переводчики", "Преподаватели", "Ремонт и мастера", "Фото и дизайн", "Компании", "Другие специалисты"], roles: ["Переводчик английского языка", "Преподаватель математики", "Специалист по ремонту техники"] },
    tj: { label: "Феҳристи тасдиқшуда", title: "Мутахассиси лозимиро ёбед", text: "Шахсон ва ташкилотҳои воқеӣ бо маълумоти тасдиқшуда", search: "Ҷустуҷӯ", placeholder: "Касб, хизмат ё ном", find: "Ёфтан", categories: "Категорияҳо", all: "Ҳамаи мутахассисон дар як ҷой", verifiedOnly: "Нашр танҳо пас аз санҷиш", profiles: "профил", newProfiles: "Профилҳои нав", verified: "Мутахассисони тасдиқшуда", publish: "Ҷойгир кардани профил", checked: "Аз ҷониби Vizora тасдиқ шудааст", open: "Кушодани варақа", categoryNames: ["Табибон ва клиникаҳо", "Ҳуқуқшиносон", "Тарҷумонҳо", "Омӯзгорон", "Таъмир ва устоҳо", "Акс ва дизайн", "Ширкатҳо", "Дигар мутахассисон"], roles: ["Тарҷумони забони англисӣ", "Омӯзгори математика", "Мутахассиси таъмири техника"] },
    en: { label: "Verified directory", title: "Find the specialist you need", text: "Real people and organizations with verified information", search: "Search", placeholder: "Profession, service or name", find: "Find", categories: "Categories", all: "All specialists in one place", verifiedOnly: "Published only after verification", profiles: "profiles", newProfiles: "New profiles", verified: "Verified specialists", publish: "Publish profile", checked: "Verified by Vizora", open: "Open business card", categoryNames: ["Doctors and clinics", "Lawyers", "Translators", "Teachers", "Repair and trades", "Photography and design", "Companies", "Other specialists"], roles: ["English translator", "Mathematics teacher", "Technical repair specialist"] }
  }[language];
  const publishCopy = {
    ru: { hint: "Уже есть визитка? Добавьте к ней профессию, город и услуги", modalTitle: "Визитка специалиста", modalText: "Основные контакты берутся из вашей визитки. Заполните только профессиональную информацию.", chooseCard: "Ваша визитка", chooseCategory: "Категория", specialty: "Специальность", city: "Город", tags: "Услуги и теги", tagsHint: "Например: письменный перевод, английский, нотариальное заверение", experience: "Опыт", experienceHint: "Например: 8 лет", summary: "О профессиональной деятельности", summaryHint: "Коротко расскажите, чем вы полезны клиенту", proof: "Подтверждающий документ", proofHint: "Обязателен для лицензируемых профессий. Видит только модератор.", add: "Отправить на проверку", cancel: "Отмена", noCard: "Сначала создайте личную визитку", success: "Заявка отправлена. После проверки визитка станет доступна всем в выбранной категории.", manage: "Управление профилем специалиста", visible: "Профиль доступен всем", hidden: "Профиль временно скрыт", removed: "Профиль навсегда удалён из специалистов", hide: "Скрыть", show: "Показать снова", remove: "Удалить навсегда", removeConfirm: "Удалить профиль из «Специалистов» навсегда? Личная визитка сохранится.", top: "Поднять в TOP", topBadge: "TOP" },
    tj: { hint: "Варақа доред? Касб, шаҳр ва хизматҳоро илова кунед", modalTitle: "Варақаи мутахассис", modalText: "Тамосҳо аз варақаи шумо гирифта мешаванд. Танҳо маълумоти касбиро пур кунед.", chooseCard: "Варақаи шумо", chooseCategory: "Категория", specialty: "Ихтисос", city: "Шаҳр", tags: "Хизматҳо ва барчаспҳо", tagsHint: "Масалан: тарҷумаи хаттӣ, англисӣ, тасдиқи нотариалӣ", experience: "Таҷриба", experienceHint: "Масалан: 8 сол", summary: "Дар бораи фаъолияти касбӣ", summaryHint: "Кӯтоҳ нависед, ки ба муштарӣ чӣ фоида мерасонед", proof: "Ҳуҷҷати тасдиқкунанда", proofHint: "Барои касбҳои иҷозатномадор ҳатмист. Танҳо модератор мебинад.", add: "Ба санҷиш фиристодан", cancel: "Бекор кардан", noCard: "Аввал варақаи шахсӣ созед", success: "Дархост фиристода шуд. Пас аз санҷиш варақа барои ҳама дастрас мешавад.", manage: "Идоракунии профили мутахассис", visible: "Профил барои ҳама дастрас аст", hidden: "Профил муваққатан пинҳон аст", removed: "Профил аз мутахассисон пурра нест карда шуд", hide: "Пинҳон кардан", show: "Боз нишон додан", remove: "Пурра нест кардан", removeConfirm: "Профилро аз «Мутахассисон» пурра нест мекунед? Варақаи шахсӣ нигоҳ дошта мешавад.", top: "Ба TOP баровардан", topBadge: "TOP" },
    en: { hint: "Already have a card? Add your profession, city and services", modalTitle: "Professional business card", modalText: "Contact details come from your existing card. Complete only the professional information.", chooseCard: "Your business card", chooseCategory: "Category", specialty: "Specialty", city: "City", tags: "Services and tags", tagsHint: "For example: written translation, English, notarisation", experience: "Experience", experienceHint: "For example: 8 years", summary: "Professional summary", summaryHint: "Briefly explain how you help clients", proof: "Supporting document", proofHint: "Required for licensed professions. Visible only to moderators.", add: "Submit for review", cancel: "Cancel", noCard: "Create a personal card first", success: "Submitted. Once approved, the card will be public in the selected category.", manage: "Manage specialist profile", visible: "Profile is visible to everyone", hidden: "Profile is temporarily hidden", removed: "Profile was permanently removed from Professionals", hide: "Hide", show: "Show again", remove: "Remove permanently", removeConfirm: "Permanently remove this profile from Professionals? Your personal card will remain.", top: "Move to TOP", topBadge: "TOP" }
  }[language];
  const planCopy = language === "tj" ? {
    choose: "Тарофаи мутахассисро интихоб кунед", chooseText: "Аввал тарофаро интихоб кунед, сипас шакли мувофиқ кушода мешавад.", verified: "Мутахассиси тасдиқшуда", pro: "Мутахассиси PRO", perYear: "сомонӣ / сол", back: "Бозгашт ба тарофаҳо", serviceArea: "Минтақаи кор", consultation: "Намуди машварат", portfolio: "Портфолио (то 20 акс)", alreadyVerified: "Шумо аллакай ҳамчун мутахассиси тасдиқшуда дар феҳрист ҳастед.", alreadyPro: "Профили Мутахассиси PRO-и шумо аллакай фаъол аст.", home: "Ба саҳифаи асосӣ", features: [["Нашр дар феҳрист", "Санҷиши ҳуҷҷатҳо", "Хизматҳо ва таҷриба"], ["Ҷойи афзалиятнок", "То 20 акси портфолио", "Минтақаи кор ва машварат", "Ороиши васеъ"]]
  } : language === "en" ? {
    choose: "Choose a specialist plan", chooseText: "Choose a plan first, then complete the matching form.", verified: "Verified specialist", pro: "Specialist PRO", perYear: "somoni / year", back: "Back to plans", serviceArea: "Service area", consultation: "Consultation format", portfolio: "Portfolio (up to 20 photos)", alreadyVerified: "You are already listed as a verified specialist.", alreadyPro: "Your Specialist PRO profile is already active.", home: "Home", features: [["Directory publication", "Document verification", "Services and experience"], ["Priority placement", "Up to 20 portfolio photos", "Service area and consultations", "Enhanced presentation"]]
  } : {
    choose: "Выберите тариф специалиста", chooseText: "Сначала выберите тариф, затем заполните соответствующую ему форму.", verified: "Проверенный специалист", pro: "Специалист PRO", perYear: "сомони / год", back: "Назад к тарифам", serviceArea: "География работы", consultation: "Формат консультаций", portfolio: "Портфолио (до 20 фотографий)", alreadyVerified: "Вы уже находитесь в каталоге как проверенный специалист.", alreadyPro: "У вас уже активирован профиль Специалист PRO.", home: "На главную", features: [["Публикация в каталоге", "Проверка документов", "Услуги, теги и опыт"], ["Приоритетное место в каталоге", "До 20 фотографий портфолио", "География работы и консультации", "Расширенное оформление"]]
  };
  const icons = [Stethoscope, Scale, Languages, GraduationCap, Wrench, Camera, Building2, BriefcaseBusiness];
  const categories = copy.categoryNames.map((name, index) => ({ name, icon: icons[index] }));
  useEffect(() => {
    void directoryRepository.list().then(setProfiles);
  }, []);
  async function openPublisher(plan: "" | "specialist" | "pro" = "") {
    if (!user) { navigate(`/login?redirect=${encodeURIComponent(`/directory${plan ? `?publish=${plan}` : ""}`)}`); return; }
    setPublishOpen(true);
    setSelectedPlan(plan);
    setPublishMessage("");
    setCategoryLoading(true); setCategoryError("");
    const cards = await cardRepository.listRemote();
    let availableCategories: ProfessionCategory[] = [];
    try { availableCategories = await verificationRepository.categories(language); }
    catch (error) { setCategoryError(error instanceof Error ? error.message : "Не удалось загрузить категории."); }
    finally { setCategoryLoading(false); }
    const ownCards = cards.filter((card) => !card.id.startsWith("demo-"));
    setMyCards(ownCards);
    setSelectedCardId(ownCards[0]?.id ?? "");
    setProfessionCategories(availableCategories);
  }
  useEffect(() => {
    const requested = searchParams.get("publish");
    if (requested === "specialist" || requested === "pro") void openPublisher(requested);
  // Query-controlled modal intentionally opens once after authentication.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
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
        experience: String(form.get("experience") ?? ""), summary: String(form.get("summary") ?? ""), files: documents,
        plan: selectedPlan || "specialist", serviceArea: String(form.get("serviceArea") ?? ""), consultation: String(form.get("consultation") ?? ""), portfolio
      });
      navigate(`/payment?plan=${selectedPlan || "specialist"}`);
    } catch (error) {
      setPublishMessage(error instanceof Error ? error.message : "Ошибка отправки");
    } finally { setPublishBusy(false); }
  }
  async function manageSpecialist(action: "hide" | "show" | "remove") {
    if (!selectedCard) return;
    if (action === "remove" && !window.confirm(publishCopy.removeConfirm)) return;
    setPublishBusy(true); setPublishMessage("");
    try {
      await verificationRepository.setDirectoryVisibility(selectedCard.id, action);
      const cards = await cardRepository.listRemote();
      setMyCards(cards);
      setPublishMessage(action === "remove" ? publishCopy.removed : action === "hide" ? publishCopy.hidden : publishCopy.visible);
    } catch (error) { setPublishMessage(error instanceof Error ? error.message : "Ошибка"); }
    finally { setPublishBusy(false); }
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

        {profiles.length > 0 && <section className="section section-muted">
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
                  {item.featuredUntil && new Date(item.featuredUntil).getTime() > Date.now() && <b className="specialist-top-badge">{publishCopy.topBadge}</b>}
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
        </section>}
      </main>
      {publishOpen && <div className="directory-publish-backdrop" role="presentation" onMouseDown={() => setPublishOpen(false)}>
        <section className="directory-publish-modal" role="dialog" aria-modal="true" aria-labelledby="directory-publish-title" onMouseDown={(event) => event.stopPropagation()}>
          <header><div><span className="section-label">VIZORA.TJ</span><h2 id="directory-publish-title">{publishCopy.modalTitle}</h2><p>{publishCopy.modalText}</p></div><button type="button" onClick={() => setPublishOpen(false)} aria-label={publishCopy.cancel}>×</button></header>
          {!myCards.length ? <div className="empty-state"><FileCheck2 size={27} /><h3>{publishCopy.noCard}</h3><Link to="/create?plan=personal" className="button button-primary">{publishCopy.noCard}</Link></div> : !selectedPlan ? <div className="specialist-plan-step">
            <div className="specialist-plan-intro"><h3>{planCopy.choose}</h3><p>{planCopy.chooseText}</p></div>
            <div className="specialist-plan-grid">{(["specialist", "pro"] as const).map((plan, index) => <article className={plan === "pro" ? "specialist-plan-card pro" : "specialist-plan-card"} key={plan}><span>{plan === "pro" ? "PRO" : "VIZORA VERIFIED"}</span><h3>{plan === "pro" ? planCopy.pro : planCopy.verified}</h3><div className="specialist-plan-price"><strong>{plan === "pro" ? "100" : "50"}</strong> {planCopy.perYear}</div><ul>{planCopy.features[index].map((feature) => <li key={feature}><BadgeCheck size={17} />{feature}</li>)}</ul><button type="button" className="button button-primary" onClick={() => setSelectedPlan(plan)}>{plan === "pro" ? planCopy.pro : planCopy.verified}<ChevronRight size={17} /></button></article>)}</div>
          </div> : selectedCard?.specialistSummary && ["pending", "approved"].includes(selectedCard.reviewStatus ?? "") && selectedCard.specialistPlan === selectedPlan && !selectedCard.directoryRemovedAt ? <div className="specialist-already-state"><BadgeCheck size={42} /><h3>{selectedPlan === "pro" ? planCopy.alreadyPro : planCopy.alreadyVerified}</h3><div><Link to="/" className="button button-primary">{planCopy.home}</Link><button type="button" className="button button-secondary" onClick={() => setSelectedPlan("")}>{planCopy.back}</button></div></div> : <form className="directory-specialist-form" onSubmit={(event) => void submitSpecialist(event)}>
            <button type="button" className="specialist-plan-back" onClick={() => setSelectedPlan("")}><ChevronRight size={16} />{planCopy.back}</button>
            <label><span>{publishCopy.chooseCard}</span><select name="cardId" required value={selectedCardId} onChange={(event) => setSelectedCardId(event.target.value)}>{myCards.map((card) => <option key={card.id} value={card.id}>{card.fullName} — {card.position}</option>)}</select></label>
            <div className="directory-card-preview">{selectedCard?.photo ? <img src={selectedCard.photo} alt="" /> : <BadgeCheck size={28} />}<div><strong>{selectedCard?.fullName}</strong><span>{selectedCard?.position}</span><small>{selectedCard?.phone}</small></div></div>
            {(selectedCard?.specialistSummary || selectedCard?.directoryRemovedAt) && <div className="directory-profile-management"><div><strong>{publishCopy.manage}</strong><span>{selectedCard.directoryRemovedAt ? publishCopy.removed : selectedCard.directoryHidden ? publishCopy.hidden : publishCopy.visible}</span></div>{!selectedCard.directoryRemovedAt && <div className="directory-profile-actions"><button type="button" onClick={() => void manageSpecialist(selectedCard.directoryHidden ? "show" : "hide")} disabled={publishBusy}>{selectedCard.directoryHidden ? publishCopy.show : publishCopy.hide}</button><Link to="/payment?plan=pro">{publishCopy.top}</Link><button type="button" className="danger" onClick={() => void manageSpecialist("remove")} disabled={publishBusy}>{publishCopy.remove}</button></div>}</div>}
            <div className="directory-specialist-grid">
              <label><span>{publishCopy.chooseCategory}</span><select name="categoryId" required disabled={categoryLoading || !professionCategories.length}><option value="">{categoryLoading ? "Загрузка категорий…" : professionCategories.length ? "Выберите категорию" : "Категории недоступны"}</option>{professionCategories.map((item) => <option key={item.id} value={item.id}>{item.name}{item.requiresLicense ? " *" : ""}</option>)}</select>{categoryError && <small className="form-error">{categoryError}</small>}</label>
              <label><span>{publishCopy.specialty}</span><input name="title" required maxLength={100} placeholder={publishCopy.specialty} /></label>
              <label><span>{publishCopy.city}</span><input name="city" required maxLength={80} placeholder="Душанбе" /></label>
              <label><span>{publishCopy.experience}</span><input name="experience" maxLength={80} placeholder={publishCopy.experienceHint} /></label>
              <label className="wide"><span>{publishCopy.tags}</span><input name="tags" required placeholder={publishCopy.tagsHint} /></label>
              <label className="wide"><span>{publishCopy.summary}</span><textarea name="summary" required maxLength={500} placeholder={publishCopy.summaryHint} /></label>
              {selectedPlan === "pro" && <>
                <label><span>{planCopy.serviceArea}</span><input name="serviceArea" required maxLength={140} placeholder={language === "ru" ? "Душанбе и онлайн по Таджикистану" : planCopy.serviceArea} /></label>
                <label><span>{planCopy.consultation}</span><input name="consultation" required maxLength={140} placeholder={language === "ru" ? "Онлайн, в офисе или с выездом" : planCopy.consultation} /></label>
                <label className="wide directory-proof"><span>{planCopy.portfolio}</span><input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(event) => setPortfolio(Array.from(event.target.files ?? []).filter((file) => file.size <= 5 * 1024 * 1024).slice(0, 20))} /><small>{portfolio.length}/20 · максимум 5 МБ на фотографию</small></label>
              </>}
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

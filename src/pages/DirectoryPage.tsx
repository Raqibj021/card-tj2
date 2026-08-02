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
import "./DirectoryPage.css";

const categoryTags = {
  ru: {
    medicine: ["Терапевт", "Педиатр", "Стоматолог", "Кардиолог", "Диагностика", "Клиника"],
    law: ["Адвокат", "Юрист", "Договоры", "Суды", "Нотариус", "Консультация"],
    translation: ["Письменный перевод", "Устный перевод", "Английский", "Русский", "Таджикский", "Нотариальный перевод"],
    education: ["Репетитор", "Курсы", "Английский язык", "Математика", "Подготовка к экзаменам", "Онлайн-обучение"],
    repair: ["Ремонт техники", "Сантехник", "Электрик", "Мастер", "Установка", "Выезд"],
    "photo-design": ["Графический дизайн", "Логотипы", "Полиграфический дизайн", "Фотограф", "Видеограф", "Брендинг"],
    companies: ["B2B", "Услуги для бизнеса", "Производство", "Консалтинг", "Продажи", "Сервис"],
    other: ["Консультация", "Услуги", "Частный специалист", "Выезд", "Онлайн", "По записи"]
  },
  tj: {
    medicine: ["Терапевт", "Педиатр", "Дандонпизишк", "Кардиолог", "Ташхис", "Дармонгоҳ"],
    law: ["Адвокат", "Ҳуқуқшинос", "Шартномаҳо", "Судҳо", "Нотариус", "Машварат"],
    translation: ["Тарҷумаи хаттӣ", "Тарҷумаи шифоҳӣ", "Англисӣ", "Русӣ", "Тоҷикӣ", "Тарҷумаи нотариалӣ"],
    education: ["Омӯзгори хусусӣ", "Курсҳо", "Забони англисӣ", "Математика", "Омодагӣ ба имтиҳон", "Омӯзиши онлайн"],
    repair: ["Таъмири техника", "Сантехник", "Барқчӣ", "Усто", "Насб", "Хизмат дар маҳал"],
    "photo-design": ["Дизайни графикӣ", "Логотип", "Дизайни полиграфӣ", "Суратгир", "Наворбардор", "Брендинг"],
    companies: ["B2B", "Хизмат барои бизнес", "Истеҳсолот", "Машварат", "Фурӯш", "Хизматрасонӣ"],
    other: ["Машварат", "Хизматҳо", "Мутахассиси хусусӣ", "Хизмат дар маҳал", "Онлайн", "Бо навбат"]
  },
  en: {
    medicine: ["Therapist", "Pediatrician", "Dentist", "Cardiologist", "Diagnostics", "Clinic"],
    law: ["Attorney", "Lawyer", "Contracts", "Court", "Notary", "Consultation"],
    translation: ["Written translation", "Interpreting", "English", "Russian", "Tajik", "Notarised translation"],
    education: ["Tutor", "Courses", "English", "Mathematics", "Exam preparation", "Online learning"],
    repair: ["Device repair", "Plumber", "Electrician", "Handyman", "Installation", "On-site service"],
    "photo-design": ["Graphic design", "Logos", "Print design", "Photographer", "Videographer", "Branding"],
    companies: ["B2B", "Business services", "Manufacturing", "Consulting", "Sales", "Service"],
    other: ["Consultation", "Services", "Independent specialist", "On-site", "Online", "By appointment"]
  }
} as const;

const getCategoryTags = (slug: string, language: "ru" | "tj" | "en") => {
  const tags = categoryTags[language];
  return tags[slug as keyof typeof tags] ?? tags.other;
};

const normalizeSearch = (value: string) => value.toLocaleLowerCase("ru").replace(/ё/g, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const editDistance = (left: string, right: string) => {
  const row = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let previous = row[0];
    row[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const current = row[rightIndex];
      row[rightIndex] = Math.min(row[rightIndex] + 1, row[rightIndex - 1] + 1, previous + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[right.length];
};

const fuzzyProfileMatch = (profile: DirectoryProfile, rawQuery: string) => {
  const search = normalizeSearch(rawQuery);
  if (!search) return true;
  const haystack = normalizeSearch([profile.name, profile.role, profile.specialistTitle, profile.organization, profile.address, profile.city, profile.tags.join(" "), profile.summary, profile.experience].join(" "));
  const words = haystack.split(" ").filter(Boolean);
  return search.split(" ").every((term) => haystack.includes(term) || words.some((word) =>
    word.startsWith(term) || term.startsWith(word) || (term.length >= 5 && word.length >= 5 && Math.abs(word.length - term.length) <= 2 && editDistance(word, term) <= 2)
  ));
};

const fuzzyTermMatch = (candidate: string, rawQuery: string) => {
  const query = normalizeSearch(rawQuery);
  const normalizedCandidate = normalizeSearch(candidate);
  if (!query) return false;
  if (normalizedCandidate.includes(query) || query.includes(normalizedCandidate)) return true;
  return normalizedCandidate.split(" ").some((word) =>
    word.startsWith(query) || query.startsWith(word) ||
    (query.length >= 4 && word.length >= 4 && Math.abs(word.length - query.length) <= 3 && editDistance(word, query) <= Math.max(1, Math.floor(Math.max(word.length, query.length) * .28)))
  );
};

const specialtySeeds = {
  ru: ["Дизайнер", "Графический дизайнер", "Фотограф", "Видеограф", "Переводчик", "Юрист", "Адвокат", "Нотариус", "Врач", "Стоматолог", "Педиатр", "Преподаватель", "Репетитор", "Электрик", "Сантехник", "Мастер по ремонту", "Компания", "Консультант"],
  tj: ["Дизайнер", "Дизайнери графикӣ", "Суратгир", "Наворбардор", "Тарҷумон", "Ҳуқуқшинос", "Адвокат", "Нотариус", "Табиб", "Дандонпизишк", "Педиатр", "Омӯзгор", "Устоди хусусӣ", "Барқчӣ", "Сантехник", "Усто", "Ширкат", "Машваратчӣ"],
  en: ["Designer", "Graphic designer", "Photographer", "Videographer", "Translator", "Lawyer", "Attorney", "Notary", "Doctor", "Dentist", "Pediatrician", "Teacher", "Tutor", "Electrician", "Plumber", "Repair specialist", "Company", "Consultant"]
} as const;

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
  const [selectedProfessionCategoryId, setSelectedProfessionCategoryId] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
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
  const selectedProfessionCategory = professionCategories.find((item) => item.id === selectedProfessionCategoryId);
  const availableTags = selectedProfessionCategory ? getCategoryTags(selectedProfessionCategory.slug, language) : [];
  const searchSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    const categoryTerms = Object.values(categoryTags[language]).flat();
    const profileTerms = profiles.flatMap((profile) => [profile.specialistTitle, profile.role, ...profile.tags]).filter(Boolean);
    const unique = Array.from(new Map([...specialtySeeds[language], ...categoryTerms, ...profileTerms].map((term) => [normalizeSearch(term), term])).values());
    return unique.filter((term) => fuzzyTermMatch(term, query)).slice(0, 8);
  }, [language, profiles, query]);
  useEffect(() => {
    let active = true;
    const loadProfiles = () => void directoryRepository.list().then((items) => { if (active) setProfiles(items); });
    const refreshVisible = () => { if (document.visibilityState === "visible") loadProfiles(); };
    loadProfiles();
    const interval = window.setInterval(loadProfiles, 30_000);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, []);
  async function openPublisher(plan: "" | "specialist" | "pro" = "") {
    if (!user) { navigate(`/login?redirect=${encodeURIComponent(`/directory${plan ? `?publish=${plan}` : ""}`)}`); return; }
    setPublishOpen(true);
    setSelectedPlan(plan);
    setPublishMessage("");
    setSelectedProfessionCategoryId("");
    setSelectedTags([]);
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
        tags: [...selectedTags, ...String(form.get("tags") ?? "").split(/[,;]+/).map((tag) => tag.trim()).filter(Boolean)]
          .filter((tag, index, all) => all.findIndex((item) => item.toLocaleLowerCase() === tag.toLocaleLowerCase()) === index),
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
    const matchesText = fuzzyProfileMatch(profile, query);
    const matchesCategory = !category || profile.categorySlug === category;
    return matchesText && matchesCategory;
  }), [profiles, query, category]);
  const categorySlugs = ["medicine", "law", "translation", "education", "repair", "photo-design", "companies", "other"];
  const selectedCategoryIndex = categorySlugs.indexOf(category);
  const selectedCategoryProfiles = category ? profiles.filter((profile) => profile.categorySlug === category) : [];
  const categoryDescriptions = language === "tj"
    ? ["Табибон, клиникаҳо ва хизматрасониҳои тиббии тасдиқшуда.", "Ҳуқуқшиносон ва машваратҳои ҳуқуқӣ.", "Тарҷумонҳо ва хизматрасониҳои забонӣ.", "Омӯзгорон, мураббиён ва курсҳои таълимӣ.", "Устоҳо, таъмир ва хизматрасонии техникӣ.", "Суратгирон, дизайнерҳо ва мутахассисони эҷодӣ.", "Ширкатҳо ва хизматрасониҳои касбӣ.", "Дигар мутахассисони иҷозатшудаи платформа."]
    : language === "en"
      ? ["Verified doctors, clinics and medical services.", "Lawyers and professional legal advice.", "Translators and language services.", "Teachers, tutors and education providers.", "Repair experts and technical trades.", "Photographers, designers and creative professionals.", "Companies and professional services.", "Other permitted platform professionals."]
      : ["Проверенные врачи, клиники и медицинские услуги.", "Юристы и профессиональная правовая помощь.", "Переводчики и профессиональные языковые услуги.", "Преподаватели, репетиторы и образовательные центры.", "Мастера по ремонту и техническому обслуживанию.", "Фотографы, дизайнеры и творческие специалисты.", "Компании и профессиональные услуги для бизнеса.", "Другие разрешённые специалисты платформы."];
  const selectedCard = myCards.find((card) => card.id === selectedCardId) ?? myCards[0];
  const showResults = () => window.setTimeout(() => document.getElementById("specialist-results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  return (
    <>
      <main>
        <section className="directory-hero">
          <div className="site-container py-16 text-center md:py-24">
            <span className="section-label">{copy.label}</span>
            <h1>{copy.title}</h1>
            <p>{copy.text}</p>
            <form className="directory-search" onSubmit={(event) => { event.preventDefault(); setSearchFocused(false); showResults(); }}>
              <Search size={21} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setSearchFocused(true)} onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)} onKeyDown={(event) => { if (event.key === "Escape") setSearchFocused(false); }} autoComplete="off" aria-label={copy.search} aria-expanded={searchFocused && !!query.trim()} aria-controls="directory-search-suggestions" placeholder={copy.placeholder} />
              <span><MapPin size={17} /> {language === "en" ? "Dushanbe" : "Душанбе"}</span>
              <button type="submit" className="button button-primary">{copy.find}</button>
              {searchFocused && query.trim() && <div className="directory-search-suggestions" id="directory-search-suggestions" role="listbox">
                {searchSuggestions.length ? searchSuggestions.map((suggestion) => <button type="button" role="option" key={suggestion} onMouseDown={(event) => event.preventDefault()} onClick={() => { setQuery(suggestion); setSearchFocused(false); showResults(); }}><Search size={15} /><span>{suggestion}</span></button>) : <p>{language === "tj" ? "Калимаи наздик ёфт нашуд — ҷустуҷӯ аз рӯи матни воридшуда анҷом мешавад." : language === "en" ? "No close suggestion — search will use the entered text." : "Близкой подсказки пока нет — поиск выполнится по введённому тексту."}</p>}
              </div>}
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
                <button type="button" className={`category-card category-${categorySlugs[index]} ${category === categorySlugs[index] ? "active" : ""}`} key={name} onClick={() => setCategory(categorySlugs[index])}>
                  <span><Icon size={21} /></span>
                  <strong>{name}</strong>
                  <small>{profiles.filter((profile) => profile.categorySlug === categorySlugs[index]).length} {copy.profiles}</small>
                  <ChevronRight size={17} />
                </button>
              ))}
            </div>
          </div>
        </section>

        {profiles.length > 0 && <section className="section section-muted" id="specialist-results">
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
                  <Link to={`/card/${item.slug}?profile=specialist`} className="button button-secondary w-full">{copy.open}</Link>
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
              <label><span>{publishCopy.chooseCategory}</span><select name="categoryId" required value={selectedProfessionCategoryId} disabled={categoryLoading || !professionCategories.length} onChange={(event) => { setSelectedProfessionCategoryId(event.target.value); setSelectedTags([]); }}><option value="">{categoryLoading ? "Загрузка категорий…" : professionCategories.length ? "Выберите категорию" : "Категории недоступны"}</option>{professionCategories.map((item) => <option key={item.id} value={item.id}>{item.name}{item.requiresLicense ? " *" : ""}</option>)}</select>{categoryError && <small className="form-error">{categoryError}</small>}</label>
              <label><span>{publishCopy.specialty}</span><input name="title" required maxLength={100} placeholder={publishCopy.specialty} /></label>
              <label><span>{publishCopy.city}</span><input name="city" required maxLength={80} placeholder="Душанбе" /></label>
              <label><span>{publishCopy.experience}</span><input name="experience" maxLength={80} placeholder={publishCopy.experienceHint} /></label>
              <div className="wide directory-tag-picker">
                <span>{language === "tj" ? "Барчаспҳои омода" : language === "en" ? "Suggested tags" : "Готовые теги"}</span>
                <small>{language === "tj" ? "Якчанд барчаспро интихоб кунед, то муштариён шуморо осонтар ёбанд." : language === "en" ? "Choose several tags so clients can find you more easily." : "Выберите несколько тегов, чтобы клиентам было проще Вас найти."}</small>
                {selectedProfessionCategoryId ? <div>{availableTags.map((tag) => <button type="button" className={selectedTags.includes(tag) ? "selected" : ""} key={tag} onClick={() => setSelectedTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : current.length < 12 ? [...current, tag] : current)}>{selectedTags.includes(tag) ? "✓ " : "+ "}{tag}</button>)}</div> : <em>{language === "tj" ? "Аввал категорияро интихоб кунед" : language === "en" ? "Choose a category first" : "Сначала выберите категорию"}</em>}
              </div>
              <label className="wide"><span>{language === "tj" ? "Барчаспҳои иловагӣ" : language === "en" ? "Additional tags" : "Дополнительные теги"}</span><input name="tags" placeholder={publishCopy.tagsHint} /></label>
              <label className="wide"><span>{publishCopy.summary}</span><textarea name="summary" required maxLength={500} placeholder={publishCopy.summaryHint} /></label>
              {selectedPlan === "pro" && <>
                <label><span>{planCopy.serviceArea}</span><input name="serviceArea" required maxLength={140} placeholder={language === "ru" ? "Душанбе и онлайн по Таджикистану" : planCopy.serviceArea} /></label>
                <label><span>{planCopy.consultation}</span><input name="consultation" required maxLength={140} placeholder={language === "ru" ? "Онлайн, в офисе или с выездом" : planCopy.consultation} /></label>
                <label className="wide directory-proof"><span>{planCopy.portfolio}</span><input type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(event) => setPortfolio(Array.from(event.target.files ?? []).slice(0, 20))} /><small>{portfolio.length}/20 · сайт автоматически уменьшит вес фотографий без заметной потери качества</small></label>
              </>}
              <label className="wide directory-proof"><span>{publishCopy.proof}</span><input type="file" multiple accept="image/png,image/jpeg,application/pdf" onChange={(event) => setDocuments(Array.from(event.target.files ?? []).filter((file) => file.size <= 10 * 1024 * 1024))} /><small>{publishCopy.proofHint}</small></label>
            </div>
            {publishMessage && <div className="auth-message">{publishMessage}</div>}
            <footer><button type="button" className="button button-secondary" onClick={() => setPublishOpen(false)}>{publishCopy.cancel}</button><button type="submit" className="button button-primary" disabled={publishBusy}>{publishBusy ? "…" : publishCopy.add}</button></footer>
          </form>}
        </section>
      </div>}
      {category && selectedCategoryIndex >= 0 && <div className="category-explorer-backdrop" role="presentation" onMouseDown={() => setCategory("")}>
        <section className={`category-explorer category-${category}`} role="dialog" aria-modal="true" aria-labelledby="category-explorer-title" onMouseDown={(event) => event.stopPropagation()}>
          <header className="category-explorer-hero">
            <div className="category-explorer-orbit" aria-hidden="true"><span /><span /><span /></div>
            <button type="button" onClick={() => setCategory("")} aria-label={publishCopy.cancel}>×</button>
            <div className="category-explorer-icon">{(() => { const Icon = icons[selectedCategoryIndex]; return <Icon size={30} />; })()}</div>
            <span className="section-label">{copy.categories} · VIZORA.TJ</span>
            <h2 id="category-explorer-title">{copy.categoryNames[selectedCategoryIndex]}</h2>
            <p>{categoryDescriptions[selectedCategoryIndex]}</p>
            <div className="category-explorer-meta"><span><BadgeCheck size={17} />{copy.verifiedOnly}</span><strong>{selectedCategoryProfiles.length} {copy.profiles}</strong></div>
          </header>
          <div className="category-explorer-body">
            {selectedCategoryProfiles.length ? <div className="specialist-grid">{selectedCategoryProfiles.map((item, index) => <article className="specialist-card" key={item.id}>
              {item.photo ? <img className="specialist-avatar" src={item.photo} alt="" /> : <div className={`specialist-avatar specialist-avatar-${["blue", "violet", "emerald"][index % 3]}`}>{item.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("")}</div>}
              <div className="specialist-verified"><BadgeCheck size={15} />{copy.checked}</div><h3>{item.name}</h3><p>{item.specialistTitle || item.role}</p><span><MapPin size={15} />{item.city || item.address || "—"}</span>
              <Link to={`/card/${item.slug}?profile=specialist`} className="button button-secondary w-full">{copy.open}</Link>
            </article>)}</div> : <div className="category-explorer-empty">
              <div className="category-empty-visual"><Search size={32} /><span /><span /></div>
              <h3>{language === "ru" ? "В этой категории пока нет опубликованных специалистов" : language === "tj" ? "Дар ин категория ҳоло мутахассиси нашршуда нест" : "No published specialists in this category yet"}</h3>
              <p>{language === "ru" ? "Здесь появятся фотография, имя, специальность и город после проверки первых заявок." : language === "tj" ? "Пас аз санҷиши дархостҳои аввал дар ин ҷо акс, ном, ихтисос ва шаҳр пайдо мешаванд." : "Photo, name, specialty and city will appear here after the first profiles are verified."}</p>
              <button type="button" className="button button-primary" onClick={() => { setCategory(""); void openPublisher(); }}>{copy.publish}<ChevronRight size={17} /></button>
            </div>}
          </div>
        </section>
      </div>}
      <Footer />
    </>
  );
}

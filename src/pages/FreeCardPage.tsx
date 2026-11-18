import { ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, Phone, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { useSearchParams } from "react-router";
import BrandLogo from "../components/BrandLogo";
import WhatsAppIcon from "../components/icons/WhatsAppIcon";
import { useApp } from "../context/AppContext";
import { freeCardDesigns, freeCardImage as img } from "../lib/freeCardDesigns";
import { inviteRepository } from "../lib/inviteRepository";
import "./FreeCardPage.css";

type Lang = "tj" | "ru" | "en";

/* ---------- flags & brand icons (inline SVG, no emoji) ---------- */
const Flag = ({ code }: { code: Lang }) =>
  code === "tj" ? (
    <svg viewBox="0 0 30 20" aria-hidden><rect width="30" height="20" fill="#fff" /><rect width="30" height="6" fill="#cc0000" /><rect y="14" width="30" height="6" fill="#006600" /><path d="M12.6 11.2h4.8l-.4-1.6-1 .7-.6-1.5-.6 1.5-1-.7z" fill="#f8c300" /><g fill="#f8c300">{[0, 1, 2, 3, 4, 5, 6].map((i) => { const a = Math.PI * (0.95 - i * 0.15); return <circle key={i} cx={15 + Math.cos(a) * 4.2} cy={10.6 - Math.sin(a) * 3.4} r=".5" />; })}</g></svg>
  ) : code === "ru" ? (
    <svg viewBox="0 0 30 20" aria-hidden><rect width="30" height="20" fill="#fff" /><rect y="6.67" width="30" height="6.67" fill="#0039a6" /><rect y="13.33" width="30" height="6.67" fill="#d52b1e" /></svg>
  ) : (
    <svg viewBox="0 0 60 40" aria-hidden><rect width="60" height="40" fill="#012169" /><path d="M0 0l60 40M60 0L0 40" stroke="#fff" strokeWidth="8" /><path d="M0 0l60 40M60 0L0 40" stroke="#c8102e" strokeWidth="3" /><path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="12" /><path d="M30 0v40M0 20h60" stroke="#c8102e" strokeWidth="7" /></svg>
  );

const TelegramIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="12" fill="#29a9eb" /><path d="M5.4 11.7l11.2-4.3c.5-.2 1 .1.8.9l-1.9 9c-.1.6-.5.8-1 .5l-2.9-2.1-1.4 1.3c-.2.2-.3.3-.6.3l.2-3 5.4-4.9c.2-.2 0-.3-.3-.1l-6.7 4.2-2.9-.9c-.6-.2-.6-.6.1-.9z" fill="#fff" /></svg>
);
const InstagramIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <defs><radialGradient id="igg" cx="30%" cy="107%" r="150%"><stop offset="0" stopColor="#fdf497" /><stop offset=".05" stopColor="#fdf497" /><stop offset=".45" stopColor="#fd5949" /><stop offset=".6" stopColor="#d6249f" /><stop offset=".9" stopColor="#285aeb" /></radialGradient></defs>
    <rect width="24" height="24" rx="6" fill="url(#igg)" /><rect x="5" y="5" width="14" height="14" rx="4.2" fill="none" stroke="#fff" strokeWidth="1.8" /><circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" strokeWidth="1.8" /><circle cx="16.3" cy="7.7" r="1" fill="#fff" />
  </svg>
);

/* ---------- copy ---------- */
const copy = {
  tj: {
    badge: "Ройгон · 1 дақиқа", heroTitle: "Визиткаи электронии худро ройгон гиред",
    heroText: "Тарҳи дӯстдоштаатонро интихоб кунед, чанд саволро ҷавоб диҳед — мо визиткаро месозем ва ба каталоги мутахассисон илова мекунем.",
    start: "Оғоз кардан", next: "Давом", back: "Бозгашт", skip: "Гузарондан", send: "Визиткаро гирифтан", sending: "Фиристода мешавад…",
    swipe: "Тарҳро варақ занед",
    steps: [
      { q: "Шиносоӣ кунем! Номи шумо чист?", hint: "Ном ва насаб, тавре ки дар визитка бошад", ph: "Масалан: Фарҳод Каримов" },
      { q: "Шумо чӣ кор мекунед?", hint: "Касбро интихоб кунед ё нависед", ph: "Касби худро нависед" },
      { q: "Дар кадом шаҳр кор мекунед?", hint: "Мизоҷон шуморо дар каталог бо шаҳр меёбанд", ph: "Шаҳри дигар" },
      { q: "Рақами телефон", hint: "Мизоҷон бо як ламс ба шумо занг мезананд", ph: "90 000 00 00" },
      { q: "Шабакаҳои иҷтимоӣ", hint: "Ихтиёрӣ — метавонед гузаронед", ph: "" },
      { q: "Охирин қадам ✨", hint: "Як-ду ҷумла дар бораи кор ва хизматҳоятон (ихтиёрӣ)", ph: "Масалан: Таъмири хона ва офис, 8 сол таҷриба" }
    ],
    professions: ["Сартарош", "Ронанда", "Устои таъмир", "Духтур", "Муаллим", "Ҳуқуқшинос", "Дизайнер", "Фурӯшанда", "Барномасоз", "Тарҷумон", "Ошпаз", "Мушовир"],
    cities: ["Душанбе", "Хуҷанд", "Бохтар", "Кӯлоб", "Истаравшан", "Панҷакент", "Хоруғ", "Турсунзода", "Ваҳдат", "Ҳисор"],
    waSame: "WhatsApp ҳам дар ҳамин рақам", waOther: "Рақами WhatsApp",
    tgNick: "@ник", tgPhone: "Рақам", tgSame: "Telegram дар ҳамин рақам",
    consent: "Розӣ ҳастам, ки визиткаи ман дар сайти vizora.tj ва каталоги мутахассисон ҷойгир карда шавад",
    previewName: "Номи шумо", previewRole: "Касби шумо",
    doneTitle: "Офарин! Дархост қабул шуд 🎉", doneText: "Мо визиткаи шуморо бо тарҳи интихобкардаатон омода мекунем ва пайвандро ба WhatsApp мефиристем. Одатан то 24 соат.",
    doneMore: "Ба дӯстон ҳам маслиҳат диҳед — ин ройгон аст!", share: "Ба дӯстон фиристодан", shareText: "Визиткаи электронии ройгон дар Vizora гир: ",
    errors: { bad_name: "Лутфан ном ва насабро пурра нависед", bad_phone: "Рақам бояд 9 рақам бошад: 90 000 00 00", bad_whatsapp: "Рақами WhatsApp нодуруст аст", too_many_requests: "Аз ин рақам аллакай дархост фиристода шудааст", consent_required: "Лутфан розигиро қайд кунед", unknown: "Хатогӣ рӯй дод. Боз кӯшиш кунед ё ба WhatsApp нависед" }
  },
  ru: {
    badge: "Бесплатно · 1 минута", heroTitle: "Получите электронную визитку бесплатно",
    heroText: "Выберите понравившийся дизайн, ответьте на пару вопросов — мы сделаем визитку и добавим вас в каталог специалистов.",
    start: "Начать", next: "Дальше", back: "Назад", skip: "Пропустить", send: "Получить визитку", sending: "Отправляем…",
    swipe: "Листайте дизайн",
    steps: [
      { q: "Давайте знакомиться! Как вас зовут?", hint: "Имя и фамилия, как на визитке", ph: "Например: Фарход Каримов" },
      { q: "Чем вы занимаетесь?", hint: "Выберите профессию или напишите свою", ph: "Напишите профессию" },
      { q: "В каком городе работаете?", hint: "Клиенты найдут вас в каталоге по городу", ph: "Другой город" },
      { q: "Номер телефона", hint: "Клиенты позвонят вам в одно касание", ph: "90 000 00 00" },
      { q: "Соцсети", hint: "Необязательно — можно пропустить", ph: "" },
      { q: "Последний шаг ✨", hint: "Пара слов о работе и услугах (необязательно)", ph: "Например: Ремонт квартир и офисов, опыт 8 лет" }
    ],
    professions: ["Парикмахер", "Водитель", "Мастер ремонта", "Врач", "Учитель", "Юрист", "Дизайнер", "Продавец", "Программист", "Переводчик", "Повар", "Консультант"],
    cities: ["Душанбе", "Худжанд", "Бохтар", "Куляб", "Истаравшан", "Пенджикент", "Хорог", "Турсунзаде", "Вахдат", "Гиссар"],
    waSame: "WhatsApp на этом же номере", waOther: "Номер WhatsApp",
    tgNick: "@ник", tgPhone: "Номер", tgSame: "Telegram на этом же номере",
    consent: "Согласен(на) на размещение моей визитки на сайте vizora.tj и в каталоге специалистов",
    previewName: "Ваше имя", previewRole: "Ваша профессия",
    doneTitle: "Отлично! Заявка принята 🎉", doneText: "Мы подготовим визитку в выбранном дизайне и пришлём ссылку в WhatsApp. Обычно в течение 24 часов.",
    doneMore: "Посоветуйте друзьям — это бесплатно!", share: "Отправить друзьям", shareText: "Получи бесплатную электронную визитку на Vizora: ",
    errors: { bad_name: "Пожалуйста, укажите имя и фамилию полностью", bad_phone: "Номер должен быть из 9 цифр: 90 000 00 00", bad_whatsapp: "Номер WhatsApp указан неверно", too_many_requests: "С этого номера заявка уже отправлена", consent_required: "Пожалуйста, отметьте согласие", unknown: "Что-то пошло не так. Попробуйте ещё раз или напишите в WhatsApp" }
  },
  en: {
    badge: "Free · 1 minute", heroTitle: "Get your digital business card for free",
    heroText: "Pick a design you love, answer a few questions — we will build your card and add you to the Vizora specialists directory.",
    start: "Get started", next: "Next", back: "Back", skip: "Skip", send: "Get my card", sending: "Sending…",
    swipe: "Swipe designs",
    steps: [
      { q: "Nice to meet you! What's your name?", hint: "First and last name, as on the card", ph: "e.g. Farhod Karimov" },
      { q: "What do you do?", hint: "Pick a profession or type your own", ph: "Type your profession" },
      { q: "Which city do you work in?", hint: "Clients find you in the directory by city", ph: "Other city" },
      { q: "Phone number", hint: "Clients call you with one tap", ph: "90 000 00 00" },
      { q: "Social media", hint: "Optional — you can skip", ph: "" },
      { q: "Last step ✨", hint: "A sentence about your work and services (optional)", ph: "e.g. Home and office repairs, 8 years of experience" }
    ],
    professions: ["Barber", "Driver", "Repair master", "Doctor", "Teacher", "Lawyer", "Designer", "Sales", "Developer", "Translator", "Chef", "Consultant"],
    cities: ["Dushanbe", "Khujand", "Bokhtar", "Kulob", "Istaravshan", "Panjakent", "Khorog", "Tursunzoda", "Vahdat", "Hisor"],
    waSame: "WhatsApp on the same number", waOther: "WhatsApp number",
    tgNick: "@username", tgPhone: "Number", tgSame: "Telegram on the same number",
    consent: "I agree to publish my card on vizora.tj and in the specialists directory",
    previewName: "Your name", previewRole: "Your profession",
    doneTitle: "Great! Request received 🎉", doneText: "We will prepare your card in the design you chose and send the link to your WhatsApp, usually within 24 hours.",
    doneMore: "Tell your friends — it's free!", share: "Send to friends", shareText: "Get a free digital business card on Vizora: ",
    errors: { bad_name: "Please enter your full first and last name", bad_phone: "The number must have 9 digits: 90 000 00 00", bad_whatsapp: "The WhatsApp number is invalid", too_many_requests: "A request from this number was already sent", consent_required: "Please tick the consent box", unknown: "Something went wrong. Try again or message us on WhatsApp" }
  }
} as const;

const digits = (v: string) => v.replace(/\D/g, "").replace(/^992/, "").slice(0, 9);
const fmtPhone = (v: string) => { const d = digits(v); return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" "); };
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "✦";

export default function FreeCardPage() {
  const { language } = useApp();
  const [params] = useSearchParams();
  const [lang, setLang] = useState<Lang>(language === "ru" ? "ru" : language === "en" ? "en" : "tj");
  const t = copy[lang];
  const [step, setStep] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [designIdx, setDesignIdx] = useState(0);
  const [form, setForm] = useState({ fullName: "", profession: "", city: "", phone: "", waSame: true, whatsapp: "", tgMode: "nick" as "nick" | "phone", telegram: "", tgSame: true, tgPhone: "", instagram: "", about: "", consent: true });
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const swipe = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);
  const total = t.steps.length;
  const design = freeCardDesigns[designIdx];

  useEffect(() => { document.title = lang === "tj" ? "Визиткаи ройгон — Vizora" : lang === "ru" ? "Бесплатная визитка — Vizora" : "Free business card — Vizora"; }, [lang]);
  useEffect(() => { setError(""); window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 250); }, [step]);
  useEffect(() => { freeCardDesigns.forEach((d) => { const i = new Image(); i.src = img(d.img); }); }, []);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const go = (dir: number) => setDesignIdx((i) => (i + dir + freeCardDesigns.length) % freeCardDesigns.length);

  const onDown = (e: PointerEvent<HTMLDivElement>) => { swipe.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); };
  const onMove = (e: PointerEvent<HTMLDivElement>) => { if (swipe.current !== null) setDrag(e.clientX - swipe.current); };
  const onUp = () => { if (Math.abs(drag) > 45) go(drag < 0 ? 1 : -1); swipe.current = null; setDrag(0); };

  const tgDigits = digits(form.tgSame ? form.phone : form.tgPhone);
  const hasTelegram = form.tgMode === "nick" ? form.telegram.replace(/^@/, "").trim().length > 1 : tgDigits.length === 9;
  const telegramValue = form.tgMode === "nick" ? "@" + form.telegram.replace(/^@/, "").trim() : "+992" + tgDigits;

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return /\S{2,}\s+\S{2,}/.test(form.fullName.trim());
      case 1: return form.profession.trim().length >= 2;
      case 2: return form.city.trim().length >= 2;
      case 3: return digits(form.phone).length === 9 && (form.waSame || digits(form.whatsapp).length === 9);
      case 4: return form.tgMode === "nick" || form.tgSame || !form.tgPhone || digits(form.tgPhone).length === 9;
      case 5: return form.consent;
      default: return true;
    }
  }, [step, form]);

  const next = async () => {
    if (!canNext) {
      if (step === 0) setError(t.errors.bad_name);
      if (step === 3 || step === 4) setError(t.errors.bad_phone);
      if (step === 5) setError(t.errors.consent_required);
      return;
    }
    if (step < total - 1) { setStep(step + 1); return; }
    setBusy(true);
    try {
      await inviteRepository.submit({
        fullName: form.fullName, profession: form.profession, city: form.city, about: form.about,
        phone: "992" + digits(form.phone),
        whatsapp: form.waSame ? "" : "992" + digits(form.whatsapp),
        telegram: hasTelegram ? telegramValue : "",
        instagram: form.instagram.trim().replace(/^@/, ""),
        language: lang, source: (params.get("src") ?? "").slice(0, 40), design: design.key
      });
      setDone(true);
    } catch (e) {
      const code = (e as Error).message as keyof typeof t.errors;
      setError(t.errors[code] ?? t.errors.unknown);
    } finally { setBusy(false); }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement) && step >= 0 && !done) { e.preventDefault(); void next(); }
  };

  const progress = done ? 100 : step < 0 ? 0 : Math.round(((step + 1) / total) * 100);
  const pageStyle = { "--c1": design.c1, "--c2": design.c2, "--acc": design.accent } as CSSProperties;

  return (
    <main className="free-page" style={pageStyle} onKeyDown={onKey}>
      <div className="free-bg" aria-hidden>
        {freeCardDesigns.map((d, i) => <div key={d.key} className={`free-bg-photo ${i === designIdx ? "on" : ""}`} style={{ backgroundImage: `url(${img(d.img)})` }} />)}
        <i /><i />
      </div>

      <header className="free-top">
        <BrandLogo light />
        <div className="free-lang" role="group" aria-label="Language">
          {(["tj", "ru", "en"] as Lang[]).map((l) => (
            <button key={l} type="button" className={l === lang ? "on" : ""} onClick={() => setLang(l)} aria-label={l} title={l === "tj" ? "Тоҷикӣ" : l === "ru" ? "Русский" : "English"}><Flag code={l} /></button>
          ))}
        </div>
      </header>

      <div className="free-progress" aria-hidden><span style={{ width: `${progress}%` }} /></div>

      <section className="free-wrap">
        <div className="free-card-zone">
          <div className="free-card-stage" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <div className={`free-card ${done ? "done" : ""}`} style={{ transform: `translateX(${drag * 0.6}px) rotate(${-2 + drag * 0.02}deg)` }} key={design.key}>
              <img className="free-card-img" src={img(design.img)} alt="" draggable={false} />
              <div className="free-card-info">
                <div className="free-avatar">{initials(form.fullName)}</div>
                <div className="free-card-text">
                  <strong>{form.fullName.trim() || t.previewName}</strong>
                  <span>{form.profession.trim() || t.previewRole}{form.city ? ` · ${form.city}` : ""}</span>
                </div>
              </div>
              <div className="free-card-icons">
                <em className={digits(form.phone).length ? "on" : ""}><Phone size={15} /></em>
                <em className={digits(form.phone).length ? "on wa" : "wa"}><WhatsAppIcon size={16} /></em>
                <em className={hasTelegram ? "on" : ""}><TelegramIcon size={20} /></em>
                <em className={form.instagram ? "on" : ""}><InstagramIcon size={19} /></em>
              </div>
            </div>
          </div>
          {!done && (
            <div className="free-designs">
              <button type="button" onClick={() => go(-1)} aria-label="prev"><ChevronLeft size={20} /></button>
              <div className="free-design-meta">
                <b>{design.name[lang]}</b>
                <span>{t.swipe} · {designIdx + 1}/{freeCardDesigns.length}</span>
                <div className="free-dots">{freeCardDesigns.map((d, i) => <i key={d.key} className={i === designIdx ? "on" : ""} onClick={() => setDesignIdx(i)} />)}</div>
              </div>
              <button type="button" onClick={() => go(1)} aria-label="next"><ChevronRight size={20} /></button>
            </div>
          )}
        </div>

        {done ? (
          <div className="free-panel free-done">
            <div className="free-burst" aria-hidden>{Array.from({ length: 18 }).map((_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}</div>
            <h1>{t.doneTitle}</h1>
            <p>{t.doneText}</p>
            <p className="muted">{t.doneMore}</p>
            <a className="free-btn free-btn-wa" href={`https://wa.me/?text=${encodeURIComponent(t.shareText + "https://vizora.tj/free")}`} target="_blank" rel="noreferrer"><WhatsAppIcon size={18} /> {t.share}</a>
          </div>
        ) : step < 0 ? (
          <div className="free-panel free-intro">
            <span className="free-badge"><Sparkles size={15} /> {t.badge}</span>
            <h1>{t.heroTitle}</h1>
            <p>{t.heroText}</p>
            <button type="button" className="free-btn" onClick={() => setStep(0)}>{t.start} <ArrowRight size={18} /></button>
          </div>
        ) : (
          <div className="free-panel" key={step}>
            <div className="free-count">{step + 1} / {total}</div>
            <h1>{t.steps[step].q}</h1>
            <p className="free-hint">{t.steps[step].hint}</p>

            {step === 0 && <input ref={(el) => { inputRef.current = el; }} className="free-input" value={form.fullName} placeholder={t.steps[0].ph} autoComplete="name" maxLength={60} onChange={(e) => set("fullName", e.target.value)} />}

            {step === 1 && (<>
              <div className="free-chips">{t.professions.map((p) => <button type="button" key={p} className={form.profession === p ? "on" : ""} onClick={() => set("profession", p)}>{p}</button>)}</div>
              <input ref={(el) => { inputRef.current = el; }} className="free-input" value={(t.professions as readonly string[]).includes(form.profession) ? "" : form.profession} placeholder={t.steps[1].ph} maxLength={60} onChange={(e) => set("profession", e.target.value)} />
            </>)}

            {step === 2 && (<>
              <div className="free-chips">{t.cities.map((c) => <button type="button" key={c} className={form.city === c ? "on" : ""} onClick={() => set("city", c)}>{c}</button>)}</div>
              <input ref={(el) => { inputRef.current = el; }} className="free-input" value={(t.cities as readonly string[]).includes(form.city) ? "" : form.city} placeholder={t.steps[2].ph} maxLength={40} onChange={(e) => set("city", e.target.value)} />
            </>)}

            {step === 3 && (<>
              <label className="free-phone"><Phone size={18} /><span>+992</span><input ref={(el) => { inputRef.current = el; }} inputMode="tel" value={fmtPhone(form.phone)} placeholder={t.steps[3].ph} onChange={(e) => set("phone", e.target.value)} /></label>
              <button type="button" className={`free-toggle ${form.waSame ? "on" : ""}`} onClick={() => set("waSame", !form.waSame)}><i>{form.waSame && <Check size={14} />}</i>{t.waSame}</button>
              {!form.waSame && <label className="free-phone"><WhatsAppIcon size={18} /><span>+992</span><input inputMode="tel" value={fmtPhone(form.whatsapp)} placeholder={t.waOther} onChange={(e) => set("whatsapp", e.target.value)} /></label>}
            </>)}

            {step === 4 && (<>
              <div className="free-social-head"><TelegramIcon size={22} /><b>Telegram</b>
                <div className="free-seg">
                  <button type="button" className={form.tgMode === "nick" ? "on" : ""} onClick={() => set("tgMode", "nick")}>{t.tgNick}</button>
                  <button type="button" className={form.tgMode === "phone" ? "on" : ""} onClick={() => set("tgMode", "phone")}>{t.tgPhone}</button>
                </div>
              </div>
              {form.tgMode === "nick" ? (
                <label className="free-phone"><span>@</span><input ref={(el) => { inputRef.current = el; }} value={form.telegram.replace(/^@/, "")} placeholder="username" maxLength={40} onChange={(e) => set("telegram", e.target.value.replace(/\s/g, ""))} /></label>
              ) : (<>
                <button type="button" className={`free-toggle ${form.tgSame ? "on" : ""}`} onClick={() => set("tgSame", !form.tgSame)}><i>{form.tgSame && <Check size={14} />}</i>{t.tgSame}{digits(form.phone).length === 9 ? ` (+992 ${fmtPhone(form.phone)})` : ""}</button>
                {!form.tgSame && <label className="free-phone"><span>+992</span><input inputMode="tel" value={fmtPhone(form.tgPhone)} placeholder="90 000 00 00" onChange={(e) => set("tgPhone", e.target.value)} /></label>}
              </>)}
              <div className="free-social-head free-social-gap"><InstagramIcon size={22} /><b>Instagram</b></div>
              <label className="free-phone"><span>@</span><input value={form.instagram.replace(/^@/, "")} placeholder="username" maxLength={40} onChange={(e) => set("instagram", e.target.value.replace(/\s/g, ""))} /></label>
            </>)}

            {step === 5 && (<>
              <textarea ref={(el) => { inputRef.current = el; }} className="free-input free-area" value={form.about} placeholder={t.steps[5].ph} maxLength={150} onChange={(e) => set("about", e.target.value)} />
              <div className="free-left">{150 - form.about.length}</div>
              <button type="button" className={`free-toggle ${form.consent ? "on" : ""}`} onClick={() => set("consent", !form.consent)}><i>{form.consent && <Check size={14} />}</i>{t.consent}</button>
            </>)}

            {error && <div className="free-error">{error}</div>}

            <div className="free-actions">
              <button type="button" className="free-ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={18} /> {t.back}</button>
              {step === 4 && !hasTelegram && !form.instagram ? (
                <button type="button" className="free-btn" onClick={() => setStep(5)}>{t.skip} <ArrowRight size={18} /></button>
              ) : (
                <button type="button" className={`free-btn ${canNext ? "" : "dim"}`} disabled={busy} onClick={() => void next()}>
                  {step === total - 1 ? (busy ? t.sending : t.send) : t.next} <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

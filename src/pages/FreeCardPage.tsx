import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router";
import BrandLogo from "../components/BrandLogo";
import { useApp } from "../context/AppContext";
import { inviteRepository } from "../lib/inviteRepository";
import "./FreeCardPage.css";

type Lang = "ru" | "tj";

const copy = {
  tj: {
    badge: "Ройгон · 1 дақиқа",
    heroTitle: "Визиткаи электронии худро ройгон гиред",
    heroText: "Чанд саволи оддӣ — ва мо визиткаи зебои шуморо месозем ва ба каталоги мутахассисони Vizora илова мекунем.",
    start: "Оғоз кардан",
    next: "Давом",
    back: "Бозгашт",
    skip: "Гузарондан",
    send: "Визиткаро гирифтан",
    sending: "Фиристода мешавад…",
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
    waSame: "WhatsApp ҳам дар ҳамин рақам",
    waOther: "Рақами WhatsApp",
    consent: "Розӣ ҳастам, ки визиткаи ман дар сайти vizora.tj ва каталоги мутахассисон ҷойгир карда шавад",
    previewName: "Номи шумо",
    previewRole: "Касби шумо",
    doneTitle: "Офарин! Дархост қабул шуд 🎉",
    doneText: "Мо визиткаи шуморо омода мекунем ва пайвандро ба WhatsApp мефиристем. Одатан то 24 соат.",
    doneMore: "Боз ба дӯстон ҳам маслиҳат диҳед — ин ройгон аст!",
    share: "Ба дӯстон фиристодан",
    shareText: "Визиткаи электронии ройгон дар Vizora гир: ",
    errors: {
      bad_name: "Лутфан ном ва насабро пурра нависед",
      bad_phone: "Рақам бояд 9 рақам бошад: 90 000 00 00",
      bad_whatsapp: "Рақами WhatsApp нодуруст аст",
      too_many_requests: "Аз ин рақам аллакай дархост фиристода шудааст",
      consent_required: "Лутфан розигиро қайд кунед",
      unknown: "Хатогӣ рӯй дод. Боз кӯшиш кунед ё ба WhatsApp нависед"
    }
  },
  ru: {
    badge: "Бесплатно · 1 минута",
    heroTitle: "Получите электронную визитку бесплатно",
    heroText: "Несколько простых вопросов — и мы сделаем вам красивую визитку и добавим в каталог специалистов Vizora.",
    start: "Начать",
    next: "Дальше",
    back: "Назад",
    skip: "Пропустить",
    send: "Получить визитку",
    sending: "Отправляем…",
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
    waSame: "WhatsApp на этом же номере",
    waOther: "Номер WhatsApp",
    consent: "Согласен(на) на размещение моей визитки на сайте vizora.tj и в каталоге специалистов",
    previewName: "Ваше имя",
    previewRole: "Ваша профессия",
    doneTitle: "Отлично! Заявка принята 🎉",
    doneText: "Мы подготовим вашу визитку и пришлём ссылку в WhatsApp. Обычно в течение 24 часов.",
    doneMore: "Посоветуйте друзьям — это бесплатно!",
    share: "Отправить друзьям",
    shareText: "Получи бесплатную электронную визитку на Vizora: ",
    errors: {
      bad_name: "Пожалуйста, укажите имя и фамилию полностью",
      bad_phone: "Номер должен быть из 9 цифр: 90 000 00 00",
      bad_whatsapp: "Номер WhatsApp указан неверно",
      too_many_requests: "С этого номера заявка уже отправлена",
      consent_required: "Пожалуйста, отметьте согласие",
      unknown: "Что-то пошло не так. Попробуйте ещё раз или напишите в WhatsApp"
    }
  }
} as const;

const digits = (v: string) => v.replace(/\D/g, "").replace(/^992/, "").slice(0, 9);
const fmtPhone = (v: string) => {
  const d = digits(v);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ");
};
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "✦";

export default function FreeCardPage() {
  const { language } = useApp();
  const [params] = useSearchParams();
  const [lang, setLang] = useState<Lang>(language === "ru" ? "ru" : "tj");
  const t = copy[lang];
  const [step, setStep] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ fullName: "", profession: "", city: "", phone: "", waSame: true, whatsapp: "", telegram: "", instagram: "", about: "", consent: true });
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const total = t.steps.length;

  useEffect(() => { document.title = lang === "tj" ? "Визиткаи ройгон — Vizora" : "Бесплатная визитка — Vizora"; }, [lang]);
  useEffect(() => { setError(""); window.setTimeout(() => inputRef.current?.focus(), 250); }, [step]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const canNext = useMemo(() => {
    switch (step) {
      case 0: return /\S{2,}\s+\S{2,}/.test(form.fullName.trim());
      case 1: return form.profession.trim().length >= 2;
      case 2: return form.city.trim().length >= 2;
      case 3: return digits(form.phone).length === 9 && (form.waSame || digits(form.whatsapp).length === 9);
      case 5: return form.consent;
      default: return true;
    }
  }, [step, form]);

  const next = async () => {
    if (!canNext) {
      if (step === 0) setError(t.errors.bad_name);
      if (step === 3) setError(t.errors.bad_phone);
      if (step === 5) setError(t.errors.consent_required);
      return;
    }
    if (step < total - 1) { setStep(step + 1); return; }
    setBusy(true);
    try {
      await inviteRepository.submit({
        fullName: form.fullName,
        profession: form.profession,
        city: form.city,
        about: form.about,
        phone: "992" + digits(form.phone),
        whatsapp: form.waSame ? "" : "992" + digits(form.whatsapp),
        telegram: form.telegram.trim(),
        instagram: form.instagram.trim().replace(/^@/, ""),
        language: lang,
        source: (params.get("src") ?? "").slice(0, 40)
      });
      setDone(true);
    } catch (e) {
      const code = (e as Error).message as keyof typeof t.errors;
      setError(t.errors[code] ?? t.errors.unknown);
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement)) { e.preventDefault(); void next(); }
  };

  const progress = done ? 100 : step < 0 ? 0 : Math.round(((step + 1) / total) * 100);
  const shareUrl = "https://vizora.tj/free";

  return (
    <main className="free-page" onKeyDown={onKey}>
      <div className="free-bg" aria-hidden><i /><i /><i /></div>
      <header className="free-top">
        <BrandLogo />
        <div className="free-lang">
          {(["tj", "ru"] as Lang[]).map((l) => (
            <button key={l} type="button" className={l === lang ? "on" : ""} onClick={() => setLang(l)}>{l === "tj" ? "TJ" : "RU"}</button>
          ))}
        </div>
      </header>

      <div className="free-progress" aria-hidden><span style={{ width: `${progress}%` }} /></div>

      <section className="free-wrap">
        {/* live card preview */}
        <div className={`free-card ${done ? "done" : ""}`}>
          <div className="free-card-top">
            <div className="free-avatar">{initials(form.fullName)}</div>
            <div>
              <strong>{form.fullName.trim() || t.previewName}</strong>
              <span>{form.profession.trim() || t.previewRole}{form.city ? ` · ${form.city}` : ""}</span>
            </div>
          </div>
          <div className="free-card-chips">
            <em className={digits(form.phone).length ? "on" : ""}>📞</em>
            <em className={digits(form.phone).length ? "on" : ""}>💬</em>
            <em className={form.telegram ? "on" : ""}>✈️</em>
            <em className={form.instagram ? "on" : ""}>📸</em>
          </div>
          <div className="free-card-foot">vizora.tj<b>NFC · QR</b></div>
        </div>

        {done ? (
          <div className="free-panel free-done">
            <div className="free-burst" aria-hidden>{Array.from({ length: 18 }).map((_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}</div>
            <h1>{t.doneTitle}</h1>
            <p>{t.doneText}</p>
            <p className="muted">{t.doneMore}</p>
            <a className="free-btn" href={`https://wa.me/?text=${encodeURIComponent(t.shareText + shareUrl)}`} target="_blank" rel="noreferrer">{t.share} <ArrowRight size={18} /></a>
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

            {step === 0 && (
              <input ref={(el) => { inputRef.current = el; }} className="free-input" value={form.fullName} placeholder={t.steps[0].ph} autoComplete="name" maxLength={60} onChange={(e) => set("fullName", e.target.value)} />
            )}

            {step === 1 && (
              <>
                <div className="free-chips">
                  {t.professions.map((p) => <button type="button" key={p} className={form.profession === p ? "on" : ""} onClick={() => set("profession", p)}>{p}</button>)}
                </div>
                <input ref={(el) => { inputRef.current = el; }} className="free-input" value={t.professions.includes(form.profession as never) ? "" : form.profession} placeholder={t.steps[1].ph} maxLength={60} onChange={(e) => set("profession", e.target.value)} />
              </>
            )}

            {step === 2 && (
              <>
                <div className="free-chips">
                  {t.cities.map((c) => <button type="button" key={c} className={form.city === c ? "on" : ""} onClick={() => set("city", c)}>{c}</button>)}
                </div>
                <input ref={(el) => { inputRef.current = el; }} className="free-input" value={t.cities.includes(form.city as never) ? "" : form.city} placeholder={t.steps[2].ph} maxLength={40} onChange={(e) => set("city", e.target.value)} />
              </>
            )}

            {step === 3 && (
              <>
                <label className="free-phone"><span>+992</span><input ref={(el) => { inputRef.current = el; }} inputMode="tel" value={fmtPhone(form.phone)} placeholder={t.steps[3].ph} onChange={(e) => set("phone", e.target.value)} /></label>
                <button type="button" className={`free-toggle ${form.waSame ? "on" : ""}`} onClick={() => set("waSame", !form.waSame)}><i>{form.waSame && <Check size={14} />}</i>{t.waSame}</button>
                {!form.waSame && (
                  <label className="free-phone"><span>+992</span><input inputMode="tel" value={fmtPhone(form.whatsapp)} placeholder={t.waOther} onChange={(e) => set("whatsapp", e.target.value)} /></label>
                )}
              </>
            )}

            {step === 4 && (
              <>
                <label className="free-social"><span>✈️ Telegram</span><input ref={(el) => { inputRef.current = el; }} value={form.telegram} placeholder="@username" maxLength={40} onChange={(e) => set("telegram", e.target.value)} /></label>
                <label className="free-social"><span>📸 Instagram</span><input value={form.instagram} placeholder="@username" maxLength={40} onChange={(e) => set("instagram", e.target.value)} /></label>
              </>
            )}

            {step === 5 && (
              <>
                <textarea ref={(el) => { inputRef.current = el; }} className="free-input free-area" value={form.about} placeholder={t.steps[5].ph} maxLength={150} onChange={(e) => set("about", e.target.value)} />
                <div className="free-left">{150 - form.about.length}</div>
                <button type="button" className={`free-toggle ${form.consent ? "on" : ""}`} onClick={() => set("consent", !form.consent)}><i>{form.consent && <Check size={14} />}</i>{t.consent}</button>
              </>
            )}

            {error && <div className="free-error">{error}</div>}

            <div className="free-actions">
              <button type="button" className="free-ghost" onClick={() => setStep(step - 1)}><ArrowLeft size={18} /> {t.back}</button>
              {step === 4 && !form.telegram && !form.instagram ? (
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

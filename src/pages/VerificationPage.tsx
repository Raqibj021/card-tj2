import { FileCheck2, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useApp } from "../context/AppContext";
import { cardRepository } from "../lib/cardRepository";
import { verificationRepository, type ProfessionCategory } from "../lib/verificationRepository";

export default function VerificationPage() {
  const { language } = useApp();
  const [categories, setCategories] = useState<ProfessionCategory[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const cards = cardRepository.list();
  const copy = {
    ru: { label: "Публикация в каталоге", title: "Добавьте визитку в «Специалисты»", text: "Выберите визитку и профессию, затем подтвердите квалификацию. После одобрения визитка появится в каталоге автоматически.", card: "1. Выберите визитку", category: "2. Выберите профессию", docs: "3. Загрузите подтверждение", hint: "Диплом, сертификат, лицензия или другой документ. Его увидит только модератор. PDF, JPG, PNG до 10 МБ.", submit: "Отправить и добавить в каталог", success: "Готово! Заявка отправлена. После одобрения визитка автоматически появится в разделе «Специалисты».", back: "Вернуться в кабинет", noCard: "Сначала создайте визитку", noCardText: "Для публикации в каталоге нужна готовая электронная визитка.", create: "Создать визитку", steps: ["Создайте или выберите визитку", "Укажите категорию профессии", "Загрузите подтверждающий документ"] },
    tj: { label: "Нашр дар феҳрист", title: "Варақаро ба «Мутахассисон» илова кунед", text: "Варақа ва касбро интихоб намуда, тахассусро тасдиқ кунед. Пас аз тасдиқ варақа худкор дар феҳрист нашр мешавад.", card: "1. Варақаро интихоб кунед", category: "2. Касбро интихоб кунед", docs: "3. Ҳуҷҷатро бор кунед", hint: "Диплом, сертификат, иҷозатнома ё ҳуҷҷати дигар. Онро танҳо модератор мебинад. PDF, JPG, PNG то 10 МБ.", submit: "Фиристодан ва ба феҳрист илова кардан", success: "Омода! Пас аз тасдиқ варақа худкор дар «Мутахассисон» пайдо мешавад.", back: "Бозгашт ба кабинет", noCard: "Аввал варақа созед", noCardText: "Барои нашр дар феҳрист варақаи электронии омода лозим аст.", create: "Сохтани варақа", steps: ["Варақаро созед ё интихоб кунед", "Категорияи касбро нишон диҳед", "Ҳуҷҷати тасдиқкунандаро бор кунед"] },
    en: { label: "Directory publication", title: "Add your card to Professionals", text: "Choose a card and profession, then verify your qualification. Once approved, the card is published in the directory automatically.", card: "1. Choose a business card", category: "2. Choose a profession", docs: "3. Upload proof", hint: "Diploma, certificate, licence or another document. Only a moderator can see it. PDF, JPG, PNG up to 10 MB.", submit: "Submit and add to directory", success: "Done! Once approved, the card will automatically appear under Professionals.", back: "Back to dashboard", noCard: "Create a card first", noCardText: "A completed digital business card is required for directory publication.", create: "Create business card", steps: ["Create or choose a business card", "Select a profession category", "Upload a supporting document"] }
  }[language];

  useEffect(() => { void verificationRepository.categories(language).then(setCategories); }, [language]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      await verificationRepository.submit(String(data.get("cardId")), String(data.get("categoryId")), files);
      setMessage(copy.success);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="application-page">
      <div className="site-container grid gap-8 py-10 lg:grid-cols-[1fr_340px] lg:py-14">
        <section className="application-panel">
          <span className="section-label">{copy.label}</span><h1>{copy.title}</h1><p className="form-intro">{copy.text}</p>
          {!cards.length ? <div className="empty-state !mt-6"><h2>{copy.noCard}</h2><p>{copy.noCardText}</p><Link to="/create" className="button button-primary">{copy.create}</Link></div> : <form className="platform-form" onSubmit={submit}>
            <label><span>{copy.card}</span><select name="cardId" required>{cards.map((card) => <option value={card.id} key={card.id}>{card.fullName}</option>)}</select></label>
            <label><span>{copy.category}</span><select name="categoryId" required><option value="" />{categories.map((category) => <option value={category.id} key={category.id}>{category.name}{category.requiresLicense ? " *" : ""}</option>)}</select></label>
            <label className="receipt-upload"><Upload size={23} /><strong>{files.length ? `${files.length} файл(а)` : copy.docs}</strong><span>{copy.hint}</span><input type="file" multiple required accept="image/png,image/jpeg,application/pdf" onChange={(event) => setFiles(Array.from(event.target.files ?? []).filter((file) => file.size <= 10 * 1024 * 1024))} /></label>
            {message && <div className="auth-message">{message}</div>}
            <button className="button button-primary button-large" type="submit" disabled={busy || !cards.length || !files.length}><ShieldCheck size={18} /> {busy ? "…" : copy.submit}</button>
          </form>}
        </section>
        <aside className="application-aside"><FileCheck2 size={28} /><h2>{copy.label}</h2><ol>{copy.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol><p>{copy.text}</p><Link to="/dashboard" className="button button-secondary w-full">{copy.back}</Link></aside>
      </div>
    </main>
  );
}

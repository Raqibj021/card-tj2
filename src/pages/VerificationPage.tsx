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
    ru: { label: "Проверка специалиста", title: "Подтвердите профессию", text: "Документы видит только команда модерации. Они никогда не публикуются.", card: "Визитка", category: "Категория профессии", docs: "Документы", hint: "Диплом, сертификат, лицензия или другой подтверждающий документ. PDF, JPG, PNG до 10 МБ.", submit: "Отправить на проверку", success: "Документы отправлены. Результат появится после проверки.", back: "Вернуться в кабинет" },
    tj: { label: "Санҷиши мутахассис", title: "Касби худро тасдиқ кунед", text: "Ҳуҷҷатҳоро танҳо гурӯҳи санҷиш мебинад ва онҳо нашр намешаванд.", card: "Варақа", category: "Категорияи касб", docs: "Ҳуҷҷатҳо", hint: "Диплом, сертификат, иҷозатнома ё ҳуҷҷати тасдиқкунанда. PDF, JPG, PNG то 10 МБ.", submit: "Ба санҷиш фиристодан", success: "Ҳуҷҷатҳо фиристода шуданд.", back: "Бозгашт ба кабинет" },
    en: { label: "Professional verification", title: "Verify your profession", text: "Documents are visible only to the moderation team and are never published.", card: "Business card", category: "Profession category", docs: "Documents", hint: "Diploma, certificate, licence or another supporting document. PDF, JPG, PNG up to 10 MB.", submit: "Submit for review", success: "Documents submitted for review.", back: "Back to dashboard" }
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
          <form className="platform-form" onSubmit={submit}>
            <label><span>{copy.card}</span><select name="cardId" required>{cards.map((card) => <option value={card.id} key={card.id}>{card.fullName}</option>)}</select></label>
            <label><span>{copy.category}</span><select name="categoryId" required><option value="" />{categories.map((category) => <option value={category.id} key={category.id}>{category.name}{category.requiresLicense ? " *" : ""}</option>)}</select></label>
            <label className="receipt-upload"><Upload size={23} /><strong>{files.length ? `${files.length} файл(а)` : copy.docs}</strong><span>{copy.hint}</span><input type="file" multiple required accept="image/png,image/jpeg,application/pdf" onChange={(event) => setFiles(Array.from(event.target.files ?? []).filter((file) => file.size <= 10 * 1024 * 1024))} /></label>
            {message && <div className="auth-message">{message}</div>}
            <button className="button button-primary button-large" type="submit" disabled={busy || !cards.length || !files.length}><ShieldCheck size={18} /> {busy ? "…" : copy.submit}</button>
          </form>
        </section>
        <aside className="application-aside"><FileCheck2 size={28} /><h2>{copy.label}</h2><p>{copy.text}</p><Link to="/dashboard" className="button button-secondary w-full">{copy.back}</Link></aside>
      </div>
    </main>
  );
}

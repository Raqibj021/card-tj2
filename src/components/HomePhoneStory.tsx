import { BadgeCheck, Building2, ContactRound, LayoutGrid, QrCode, Search, Share2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import CardPreview from "./CardPreview";
import BrandLogo from "./BrandLogo";
import { useApp } from "../context/AppContext";
import type { DigitalCard } from "../types/card";

export default function HomePhoneStory({ card }: { card: DigitalCard }) {
  const { language } = useApp();
  const [scene, setScene] = useState(0);
  const copy = {
    ru: {
      launch: "Запускаем ваш цифровой профиль",
      launchText: "Все контакты. Одна ссылка.",
      card: "Моя визитка",
      directory: "Специалисты",
      directoryText: "Найдите нужного специалиста рядом",
      organizations: "Организации",
      organizationsText: "Команды и сотрудники в одном профиле",
      qr: "QR готов",
      saved: "Контакт сохранён"
    },
    tj: {
      launch: "Профили рақамии шумо омода мешавад",
      launchText: "Ҳамаи тамосҳо. Як пайванд.",
      card: "Варақаи ман",
      directory: "Мутахассисон",
      directoryText: "Мутахассиси лозимиро пайдо кунед",
      organizations: "Ташкилотҳо",
      organizationsText: "Гурӯҳ ва кормандон дар як профил",
      qr: "QR омода аст",
      saved: "Тамос нигоҳ дошта шуд"
    },
    en: {
      launch: "Launching your digital profile",
      launchText: "Every contact. One link.",
      card: "My business card",
      directory: "Professionals",
      directoryText: "Find the right professional nearby",
      organizations: "Organizations",
      organizationsText: "Teams and employees in one profile",
      qr: "QR ready",
      saved: "Contact saved"
    }
  }[language];

  useEffect(() => {
    const timings = [2400, 6200, 3000, 3000];
    const timer = window.setTimeout(() => setScene((current) => (current + 1) % 4), timings[scene]);
    return () => window.clearTimeout(timer);
  }, [scene]);

  return (
    <div className="hero-showcase founder-showcase phone-story" aria-label={copy.card}>
      <div className="hero-orbit hero-orbit-one" />
      <div className="hero-orbit hero-orbit-two" />
      <span className="phone-story-particle particle-one"><QrCode size={20} /></span>
      <span className="phone-story-particle particle-two"><Share2 size={18} /></span>
      <span className="phone-story-particle particle-three"><ContactRound size={19} /></span>
      <div className="phone-shell phone-shell-founder phone-shell-3d">
        <span className="iphone-side-button iphone-action-button" aria-hidden="true" />
        <span className="iphone-side-button iphone-volume-up" aria-hidden="true" />
        <span className="iphone-side-button iphone-volume-down" aria-hidden="true" />
        <span className="iphone-side-button iphone-power-button" aria-hidden="true" />
        <div className="phone-speaker" />
        <div className="phone-story-screen">
          <section className={`phone-scene phone-scene-launch${scene === 0 ? " is-active" : ""}`}>
            <div className="phone-launch-glow" />
            <BrandLogo light className="phone-launch-logo" />
            <Sparkles size={27} />
            <strong>{copy.launch}</strong>
            <p>{copy.launchText}</p>
            <i><span /></i>
          </section>
          <section className={`phone-scene phone-scene-card${scene === 1 ? " is-active" : ""}`}>
            <div className="phone-scene-bar"><span>{copy.card}</span><QrCode size={15} /></div>
            <CardPreview card={card} />
          </section>
          <section className={`phone-scene phone-scene-page${scene === 2 ? " is-active" : ""}`}>
            <div className="phone-mini-header"><BrandLogo /><LayoutGrid size={16} /></div>
            <div className="phone-page-hero">
              <Search size={21} />
              <strong>{copy.directory}</strong>
              <p>{copy.directoryText}</p>
            </div>
            <div className="phone-specialist-list">
              {[["М", "Медицина"], ["Ҳ", "Ҳуқуқ"], ["Д", "Дизайн"]].map(([letter, name]) => (
                <div key={name}><span>{letter}</span><b>{name}</b><BadgeCheck size={14} /></div>
              ))}
            </div>
          </section>
          <section className={`phone-scene phone-scene-page phone-scene-org${scene === 3 ? " is-active" : ""}`}>
            <div className="phone-mini-header"><BrandLogo /><Building2 size={16} /></div>
            <div className="phone-page-hero">
              <Building2 size={22} />
              <strong>{copy.organizations}</strong>
              <p>{copy.organizationsText}</p>
            </div>
            <div className="phone-org-visual"><span /><span /><span /><i /></div>
            <div className="phone-org-row"><b>VIZORA.TJ</b><small>12</small></div>
            <div className="phone-org-row"><b>KHURASON PRINT</b><small>24</small></div>
          </section>
        </div>
      </div>
      <div className={`floating-chip floating-chip-top${scene === 1 ? " is-highlighted" : ""}`}>
        <QrCode size={19} />
        <span>{copy.qr}</span>
      </div>
      <div className={`floating-chip floating-chip-bottom${scene === 1 ? " is-highlighted" : ""}`}>
        <BadgeCheck size={19} />
        <span>{copy.saved}</span>
      </div>
      <div className="phone-story-dots" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => <span className={scene === index ? "is-active" : ""} key={index} />)}
      </div>
    </div>
  );
}

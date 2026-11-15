import { BadgeCheck, ContactRound, QrCode, Share2 } from "lucide-react";
import "./HomePhoneStory.css";
import { useApp } from "../context/AppContext";
import type { DigitalCard } from "../types/card";


export default function HomePhoneStory(_props: { card: DigitalCard }) {
  const { language } = useApp();
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
        <span className="iphone-side-button iphone-camera-button" aria-hidden="true" />
        <div className="phone-speaker" />
        <div className="phone-story-screen">
          <video
            className="phone-story-video"
            src={`${import.meta.env.BASE_URL}videos/stories/vizora-stories.mp4`}
            poster={`${import.meta.env.BASE_URL}videos/vizora-phone-poster.webp`}
            aria-label={language === "tj" ? "Видео дар бораи Vizora" : language === "en" ? "Vizora introduction video" : "Видео о Vizora"}
            autoPlay
            loop
            muted
            playsInline
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            tabIndex={-1}
            preload="auto"
          />
        </div>
      </div>
      <div className="floating-chip floating-chip-top">
        <QrCode size={19} />
        <span>{copy.qr}</span>
      </div>
      <div className="floating-chip floating-chip-bottom">
        <BadgeCheck size={19} />
        <span>{copy.saved}</span>
      </div>

    </div>
  );
}

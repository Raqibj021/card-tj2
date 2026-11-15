import { BadgeCheck, ContactRound, QrCode, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./HomePhoneStory.css";
import { useApp } from "../context/AppContext";
import type { DigitalCard } from "../types/card";

const storyFiles = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `${import.meta.env.BASE_URL}videos/stories/story${n}.mp4`);


export default function HomePhoneStory(_props: { card: DigitalCard }) {
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    void video.play().catch(() => undefined);
  }, [storyIndex]);
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
          <div className="phone-story-progress" aria-hidden="true">
            {storyFiles.map((_, index) => (
              <span key={index} className={index < storyIndex ? "is-done" : ""}>
                <i style={{ width: index === storyIndex ? `${Math.round(storyProgress * 100)}%` : undefined }} />
              </span>
            ))}
          </div>
          <video
            ref={videoRef}
            className="phone-story-video"
            src={storyFiles[storyIndex]}
            poster={storyIndex === 0 ? `${import.meta.env.BASE_URL}videos/vizora-phone-poster.webp` : undefined}
            aria-label={language === "tj" ? "Видео дар бораи Vizora" : language === "en" ? "Vizora introduction video" : "Видео о Vizora"}
            autoPlay
            muted
            playsInline
            controls={false}
            disablePictureInPicture
            disableRemotePlayback
            tabIndex={-1}
            preload="auto"
            onTimeUpdate={(event) => {
              const video = event.currentTarget;
              setStoryProgress(video.duration ? video.currentTime / video.duration : 0);
            }}
            onEnded={() => {
              setStoryProgress(0);
              setStoryIndex((index) => (index + 1) % storyFiles.length);
            }}
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

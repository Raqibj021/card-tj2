import { BadgeCheck, ContactRound, QrCode, Share2 } from "lucide-react";
import "./HomePhoneStory.css";
import { useApp } from "../context/AppContext";
const copy = {
  ru: { card: "Пример визитки Vizora", qr: "QR готов", saved: "Контакт сохранён" },
  tj: { card: "Намунаи корти Vizora", qr: "QR омода аст", saved: "Тамос нигоҳ дошта шуд" },
  en: { card: "Vizora sample card", qr: "QR ready", saved: "Contact saved" }
};

export default function HomePhoneStory() {
  const { language } = useApp();
  const { card, qr, saved } = copy[language];
  return (
    <div className="hero-showcase phone-story" aria-label={card}>
      <div className="hero-orbit hero-orbit-one" />
      <div className="hero-orbit hero-orbit-two" />
      <span className="phone-story-particle particle-one"><QrCode size={20} /></span>
      <span className="phone-story-particle particle-two"><Share2 size={18} /></span>
      <span className="phone-story-particle particle-three"><ContactRound size={19} /></span>
      <div className="phone-shell phone-shell-3d">
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
        <span>{qr}</span>
      </div>
      <div className="floating-chip floating-chip-bottom">
        <BadgeCheck size={19} />
        <span>{saved}</span>
      </div>

    </div>
  );
}

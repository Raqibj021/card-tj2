import { useApp } from "../context/AppContext";

const copy = {
  ru: { title: "Vizora в историях", hint: "Листайте, чтобы увидеть визитки в действии" },
  tj: { title: "Vizora дар ҳикояҳо", hint: "Варақ занед ва варақаҳоро дар амал бинед" },
  en: { title: "Vizora in stories", hint: "Swipe to see business cards in action" }
};

const storyIndexes = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function MobileStories() {
  const { language } = useApp();
  const c = copy[language];
  return (
    <section className="home-stories-mobile" aria-label={c.title}>
      <div className="home-stories-head">
        <h2>{c.title}</h2>
        <p>{c.hint}</p>
      </div>
      <div className="stories-rail">
        {storyIndexes.map((index) => (
          <div key={index} className="stories-tile">
            <video
              src={`/videos/stories/story${index}.mp4`}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              aria-label={`${c.title} ${index}`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

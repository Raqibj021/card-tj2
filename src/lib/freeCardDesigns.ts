/** Tajikistan card designs offered on /free (card image + page palette). */
export const freeCardDesigns = [
  { key: "somoni", img: "vizora-tajikistan-somoni.webp", name: { tj: "Сомонӣ", ru: "Сомони", en: "Somoni" }, c1: "#2a1d05", c2: "#7a5410", accent: "#f5b82e" },
  { key: "palace", img: "vizora-tajikistan-palace.webp", name: { tj: "Кохи Миллат", ru: "Дворец нации", en: "Palace of Nation" }, c1: "#1b0f3a", c2: "#4c2a8c", accent: "#b794f6" },
  { key: "independence", img: "vizora-tajikistan-independence.webp", name: { tj: "Истиқлол", ru: "Независимость", en: "Independence" }, c1: "#062a1c", c2: "#0f6b45", accent: "#34d399" },
  { key: "hissar", img: "vizora-tajikistan-hissar.webp", name: { tj: "Қалъаи Ҳисор", ru: "Гиссарская крепость", en: "Hisor Fortress" }, c1: "#2b0b10", c2: "#7f1d2d", accent: "#fb7185" },
  { key: "arch", img: "vizora-tajikistan-arch.webp", name: { tj: "Арка", ru: "Арка", en: "Arch" }, c1: "#06142e", c2: "#123f86", accent: "#60a5fa" },
  { key: "building", img: "vizora-tajikistan-building.webp", name: { tj: "Душанбе", ru: "Душанбе", en: "Dushanbe" }, c1: "#03222b", c2: "#0e6f7e", accent: "#22d3ee" }
] as const;

export const freeCardImage = (file: string) => `${import.meta.env.BASE_URL}images/cards/${file}`;
export const findFreeCardDesign = (key: string) => freeCardDesigns.find((d) => d.key === key) ?? freeCardDesigns[0];

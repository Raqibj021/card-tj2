/** Animated nature covers offered on /free (blue–white glowing scenes drawn in code). */
export const freeCardDesigns = [
  { key: "pamir", name: { tj: "Помир", ru: "Памир", en: "Pamir" }, c1: "#04122e", c2: "#1d4ed8", accent: "#7dd3fc" },
  { key: "lake", name: { tj: "Искандаркӯл", ru: "Искандеркуль", en: "Iskanderkul" }, c1: "#031a2e", c2: "#0369a1", accent: "#67e8f9" },
  { key: "aurora", name: { tj: "Шафақ", ru: "Сияние", en: "Aurora" }, c1: "#050b24", c2: "#3730a3", accent: "#a5b4fc" },
  { key: "stars", name: { tj: "Осмони пурситора", ru: "Звёздное небо", en: "Starry sky" }, c1: "#020617", c2: "#1e3a8a", accent: "#93c5fd" },
  { key: "sunrise", name: { tj: "Субҳ", ru: "Рассвет", en: "Sunrise" }, c1: "#071a3d", c2: "#2563eb", accent: "#bae6fd" },
  { key: "river", name: { tj: "Дарё", ru: "Река", en: "River" }, c1: "#03202a", c2: "#0e7490", accent: "#5eead4" }
] as const;

export type FreeCardDesignKey = (typeof freeCardDesigns)[number]["key"];
export const findFreeCardDesign = (key: string) => freeCardDesigns.find((d) => d.key === key) ?? freeCardDesigns[0];

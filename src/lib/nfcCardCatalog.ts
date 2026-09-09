export type NfcCardDesign = {
  id: string;
  image: string;
  title: { ru: string; tj: string; en: string };
};

export const nfcCardDesigns: NfcCardDesign[] = [
  { id: "nfc-06", image: "/images/services/nfc/nfc-06.webp", title: { ru: "Классический Vizora", tj: "Vizora-и классикӣ", en: "Classic Vizora" } },
  { id: "nfc-01", image: "/images/services/nfc/nfc-01.webp", title: { ru: "Парк Рудаки", tj: "Боғи Рӯдакӣ", en: "Rudaki Park" } },
  { id: "nfc-02", image: "/images/services/nfc/nfc-02.webp", title: { ru: "Здание Правительства РТ", tj: "Бинои Ҳукумати Ҷумҳурии Тоҷикистон", en: "Government Building of Tajikistan" } },
  { id: "nfc-03", image: "/images/services/nfc/nfc-03.webp", title: { ru: "Здание Правительства РТ — синий", tj: "Бинои Ҳукумати Ҷумҳурии Тоҷикистон — кабуд", en: "Government Building of Tajikistan — blue" } },
  { id: "nfc-04", image: "/images/services/nfc/nfc-04.webp", title: { ru: "Монумент Исмоили Сомони", tj: "Муҷассамаи Исмоили Сомонӣ", en: "Ismoili Somoni Monument" } },
  { id: "nfc-05", image: "/images/services/nfc/nfc-05.webp", title: { ru: "Монумент — светлый", tj: "Муҷассама — равшан", en: "Monument — light" } },
  { id: "nfc-07", image: "/images/services/nfc/nfc-07.webp", title: { ru: "Гиссарская крепость", tj: "Қалъаи Ҳисор", en: "Hissar Fortress" } },
  { id: "nfc-08", image: "/images/services/nfc/nfc-08.webp", title: { ru: "Абуабдулло Рудаки", tj: "Абӯабдуллоҳи Рӯдакӣ", en: "Abuabdullo Rudaki" } },
  { id: "nfc-09", image: "/images/services/nfc/nfc-09.webp", title: { ru: "Национальный музей", tj: "Осорхонаи миллӣ", en: "National Museum" } },
  { id: "nfc-10", image: "/images/services/nfc/nfc-10.webp", title: { ru: "Дворец Нации", tj: "Қасри Миллат", en: "Palace of the Nation" } },
  { id: "nfc-11", image: "/images/services/nfc/nfc-11.webp", title: { ru: "Площадь Истиклол", tj: "Майдони Истиқлол", en: "Istiqlol Square" } }
];

export const getNfcCardDesign = (id?: string) => nfcCardDesigns.find((item) => item.id === id);

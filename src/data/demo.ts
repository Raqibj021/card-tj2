import type { CardDraft, DigitalCard } from "../types/card";

const now = new Date().toISOString();

export const emptyCard: CardDraft = {
  slug: "",
  photo: "",
  fullName: "",
  position: "",
  organization: "",
  description: "",
  phone: "",
  secondPhone: "",
  whatsapp: "",
  telegram: "",
  instagram: "",
  facebook: "",
  email: "",
  website: "",
  address: "",
  language: "ru",
  theme: "teal",
  template: "executive"
};

export const demoCards: DigitalCard[] = [
  {
    id: "demo-firuz",
    slug: "firuz",
    photo:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=88",
    fullName: "Фируз Саидов",
    position: "Архитектор и основатель",
    organization: "FORMA Studio",
    description:
      "Проектирую современные пространства для бизнеса и жизни. От идеи до авторского надзора.",
    phone: "+992 93 555 21 21",
    secondPhone: "",
    whatsapp: "+992935552121",
    telegram: "@firuzforma",
    instagram: "@forma.tj",
    facebook: "firuz.saidov",
    email: "hello@forma.tj",
    website: "https://forma.tj",
    address: "Душанбе, проспект Рӯдакӣ, 70",
    language: "ru",
    theme: "teal",
    template: "executive",
    views: 1248,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "demo-card",
    slug: "demo",
    photo: "",
    fullName: "Мадина Раҳимова",
    position: "Бренд-стратег",
    organization: "NOM Studio",
    description:
      "Помогаю компаниям найти сильный голос, цельный образ и понятный путь к своему клиенту.",
    phone: "+992 98 700 80 90",
    secondPhone: "+992 44 600 80 90",
    whatsapp: "+992987008090",
    telegram: "@madina_nom",
    instagram: "@nom.studio",
    facebook: "",
    email: "madina@nom.tj",
    website: "https://nom.tj",
    address: "Душанбе, улица Айни, 48",
    language: "tj",
    theme: "plum",
    template: "creative",
    views: 876,
    createdAt: now,
    updatedAt: now
  }
];

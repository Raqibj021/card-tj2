// Runs after `vite build`. GitHub Pages has no server-side rewrites, so every
// address except "/" used to answer with HTTP 404 and search engines ignored
// it. This script writes a real HTML file for each public page (with its own
// title, description and social preview tags) and generates sitemap.xml.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const SITE = "https://vizora.tj";
const DIST = process.argv[2] ?? "dist";

// file: where the page is written inside dist. url: the canonical address.
// index: false keeps the page out of search results and the sitemap.
const pages = [
  {
    file: "directory.html", url: "/directory",
    title: "Каталог специалистов Таджикистана — Vizora.tj",
    description: "Проверенные специалисты и компании Таджикистана: врачи, юристы, переводчики, преподаватели, мастера, дизайнеры. Контакты в одной электронной визитке."
  },
  {
    file: "organizations.html", url: "/organizations",
    title: "Электронные визитки для организаций — Vizora.tj",
    description: "Визитки сотрудников, структура подразделений и общий QR-код организации. Тарифы от 200 сомони в год для компаний, вузов и учреждений Таджикистана."
  },
  {
    file: "services/index.html", url: "/services/",
    title: "Услуги Vizora.tj — дизайн визиток, NFC-карты, QR-таблички",
    description: "Индивидуальный дизайн визитки, визитки организации под ключ, NFC-карты и NFC/QR-таблички для офиса и бизнеса в Таджикистане."
  },
  {
    file: "services/custom-design.html", url: "/services/custom-design",
    title: "Индивидуальный дизайн визитки — Vizora.tj",
    description: "Уникальный электронный и печатный дизайн визитки под ваш стиль и профессию."
  },
  {
    file: "services/organization-turnkey.html", url: "/services/organization-turnkey",
    title: "Визитки организации под ключ — Vizora.tj",
    description: "Единое оформление, создание и подключение электронных визиток всей команды."
  },
  {
    file: "services/nfc-cards.html", url: "/services/nfc-cards",
    title: "NFC-карты в Таджикистане — Vizora.tj",
    description: "Фирменные NFC-карты Vizora: электронная визитка открывается одним касанием телефона."
  },
  {
    file: "services/nfc-qr-signs.html", url: "/services/nfc-qr-signs",
    title: "NFC- и QR-таблички — Vizora.tj",
    description: "Настольные, настенные и компактные NFC- и QR-таблички для офиса и бизнеса."
  },
  {
    file: "about.html", url: "/about",
    title: "О Vizora.tj — история создания платформы цифровых визиток",
    description: "Как появилась Vizora.tj — платформа электронных визиток, созданная в Душанбе для специалистов, компаний и организаций Таджикистана."
  },
  {
    file: "create.html", url: "/create",
    title: "Создать электронную визитку онлайн — Vizora.tj",
    description: "Заполните данные, выберите дизайн и получите электронную визитку с персональной ссылкой и QR-кодом."
  },
  {
    file: "support.html", url: "/support",
    title: "Поддержка Vizora.tj — связь с менеджером",
    description: "Вопросы по визиткам, тарифам, оплате и регистрации организаций — напишите менеджеру Vizora.tj."
  },
  { file: "print-card.html", url: "/print-card", title: "Конструктор печатной визитки — Vizora.tj", description: "Соберите макет печатной визитки с QR-кодом на электронный профиль Vizora.", index: false },
  { file: "login.html", url: "/login", title: "Вход — Vizora.tj", description: "Вход в личный кабинет Vizora.tj.", index: false },
  { file: "register.html", url: "/register", title: "Регистрация — Vizora.tj", description: "Регистрация в Vizora.tj.", index: false },
  { file: "forgot-password.html", url: "/forgot-password", title: "Восстановление пароля — Vizora.tj", description: "Восстановление пароля Vizora.tj.", index: false },
  { file: "reset-password.html", url: "/reset-password", title: "Новый пароль — Vizora.tj", description: "Смена пароля Vizora.tj.", index: false }
];

const escapeHtml = (value) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const template = readFileSync(join(DIST, "index.html"), "utf8");

const replaceOnce = (html, pattern, replacement, label) => {
  if (!pattern.test(html)) throw new Error(`seo-postbuild: index.html has no ${label}`);
  return html.replace(pattern, () => replacement);
};

for (const page of pages) {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const url = `${SITE}${page.url}`;
  let html = template;
  html = replaceOnce(html, /<title>[\s\S]*?<\/title>/, `<title>${title}</title>`, "<title>");
  html = replaceOnce(html, /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, `<meta name="description" content="${description}" />`, "description");
  html = replaceOnce(html, /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, `<link rel="canonical" href="${url}" />`, "canonical link");
  html = replaceOnce(html, /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/, `<meta property="og:url" content="${url}" />`, "og:url");
  html = replaceOnce(html, /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${title}" />`, "og:title");
  html = replaceOnce(html, /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${description}" />`, "og:description");
  if (page.index === false) {
    html = replaceOnce(html, /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/, `<meta name="robots" content="noindex, follow" />`, "robots meta");
  }
  const target = join(DIST, page.file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html);
}

const today = new Date().toISOString().slice(0, 10);
const urls = ["/", ...pages.filter((page) => page.index !== false).map((page) => page.url)];
const sitemap = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...urls.map((url) => `  <url><loc>${SITE}${url}</loc><lastmod>${today}</lastmod></url>`),
  `</urlset>`,
  ""
].join("\n");
writeFileSync(join(DIST, "sitemap.xml"), sitemap);

console.log(`seo-postbuild: wrote ${pages.length} pages and sitemap.xml with ${urls.length} URLs`);

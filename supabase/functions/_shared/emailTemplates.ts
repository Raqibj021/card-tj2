export type MailLanguage = "ru" | "tj" | "en";

export interface OutboxMessage {
  template_key: string;
  recipient: string;
  subject?: string | null;
  payload: Record<string, unknown>;
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

const value = (payload: Record<string, unknown>, key: string, fallback = "") =>
  String(payload[key] ?? fallback);

const escapeHtml = (input: string) =>
  input.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

const languageOf = (payload: Record<string, unknown>): MailLanguage => {
  const language = String(payload.language ?? "ru");
  return language === "tj" || language === "en" ? language : "ru";
};

const common = {
  ru: { hello: "Здравствуйте", action: "Открыть Vizora", note: "Это автоматическое служебное письмо. Отвечать на него не нужно.", support: "Если Вам нужна помощь, напишите на support@vizora.tj." },
  tj: { hello: "Салом", action: "Кушодани Vizora", note: "Ин мактуби худкори хизматӣ мебошад. Ба он ҷавоб додан лозим нест.", support: "Агар ба Шумо кӯмак лозим бошад, ба support@vizora.tj нависед." },
  en: { hello: "Hello", action: "Open Vizora", note: "This is an automated service email. Please do not reply.", support: "If you need help, contact support@vizora.tj." }
} satisfies Record<MailLanguage, Record<string, string>>;

type Copy = { subject: string; heading: string; body: string; code?: string };

function copyFor(message: OutboxMessage, language: MailLanguage): Copy {
  const p = message.payload;
  const name = value(p, "fullName", value(p, "name"));
  const code = value(p, "code");
  const note = value(p, "note", value(p, "message"));
  const record = value(p, "number", value(p, "recordNumber"));
  const organization = value(p, "organization");
  const expires = value(p, "expiresAt", value(p, "expiresHours"));
  const plan = value(p, "plan", value(p, "planCode"));

  const dictionary: Record<string, Record<MailLanguage, Copy>> = {
    plan_activation: {
      ru: { subject: "Код активации тарифа Vizora", heading: "Оплата подтверждена", body: `Ваш тариф${plan ? ` «${plan}»` : ""} готов к активации. Код действует 7 дней.`, code },
      tj: { subject: "Рамзи фаъолсозии тарофаи Vizora", heading: "Пардохт тасдиқ шуд", body: `Тарофаи Шумо${plan ? ` «${plan}»` : ""} барои фаъолсозӣ омода аст. Рамз 7 рӯз эътибор дорад.`, code },
      en: { subject: "Vizora plan activation code", heading: "Payment confirmed", body: `Your${plan ? ` “${plan}”` : ""} plan is ready for activation. The code is valid for 7 days.`, code }
    },
    payment_confirmed: {
      ru: { subject: "Подтверждение оплаты Vizora", heading: "Мы подтвердили Вашу оплату", body: `Платёж${record ? ` по заказу ${record}` : ""} успешно проверен.` },
      tj: { subject: "Тасдиқи пардохти Vizora", heading: "Пардохти Шумо тасдиқ шуд", body: `Пардохт${record ? ` аз рӯи фармоиши ${record}` : ""} бомуваффақият санҷида шуд.` },
      en: { subject: "Vizora payment confirmation", heading: "Your payment is confirmed", body: `The payment${record ? ` for order ${record}` : ""} has been verified.` }
    },
    verification_result: {
      ru: { subject: "Результат проверки Vizora", heading: "Проверка завершена", body: note || "Результат проверки документов доступен в Вашем кабинете." },
      tj: { subject: "Натиҷаи санҷиши Vizora", heading: "Санҷиш анҷом ёфт", body: note || "Натиҷаи санҷиши ҳуҷҷатҳо дар утоқи шахсии Шумо дастрас аст." },
      en: { subject: "Vizora verification result", heading: "Verification completed", body: note || "Your document verification result is available in the dashboard." }
    },
    additional_documents: {
      ru: { subject: "Vizora запрашивает дополнительные документы", heading: "Нужны дополнительные документы", body: note || "Откройте кабинет и загрузите запрошенные документы." },
      tj: { subject: "Vizora ҳуҷҷатҳои иловагӣ дархост мекунад", heading: "Ҳуҷҷатҳои иловагӣ лозиманд", body: note || "Утоқи шахсиро кушоед ва ҳуҷҷатҳои дархостшударо бор кунед." },
      en: { subject: "Vizora requests additional documents", heading: "Additional documents required", body: note || "Open your dashboard and upload the requested documents." }
    },
    organization_invitation: {
      ru: { subject: `Приглашение в ${organization || "организацию Vizora"}`, heading: "Вас пригласили в организацию", body: `${organization || "Организация"} приглашает Вас присоединиться к своей структуре.${expires ? ` Срок действия приглашения: ${expires} ч.` : ""}`, code },
      tj: { subject: `Даъват ба ${organization || "ташкилоти Vizora"}`, heading: "Шуморо ба ташкилот даъват карданд", body: `${organization || "Ташкилот"} Шуморо барои ҳамроҳ шудан ба сохтори худ даъват мекунад.${expires ? ` Муҳлати даъват: ${expires} соат.` : ""}`, code },
      en: { subject: `Invitation to ${organization || "a Vizora organization"}`, heading: "You have been invited", body: `${organization || "An organization"} invites you to join its workspace.${expires ? ` The invitation expires in ${expires} hours.` : ""}`, code }
    },
    data_changed: {
      ru: { subject: "Данные аккаунта Vizora изменены", heading: "Данные обновлены", body: "Данные Вашего профиля были изменены. Если это сделали не Вы, немедленно свяжитесь с поддержкой." },
      tj: { subject: "Маълумоти ҳисоби Vizora тағйир ёфт", heading: "Маълумот нав карда шуд", body: "Маълумоти профили Шумо тағйир дода шуд. Агар ин корро Шумо накарда бошед, фавран бо дастгирӣ тамос гиред." },
      en: { subject: "Your Vizora account data changed", heading: "Profile updated", body: "Your profile information was changed. If this was not you, contact support immediately." }
    },
    plan_expiring: {
      ru: { subject: "Срок тарифа Vizora заканчивается", heading: "Продлите тариф", body: `Срок действия тарифа заканчивается${expires ? ` ${expires}` : " в ближайшее время"}.` },
      tj: { subject: "Муҳлати тарофаи Vizora ба охир мерасад", heading: "Тарофаро тамдид намоед", body: `Муҳлати тарофа${expires ? ` ${expires}` : " ба наздикӣ"} ба охир мерасад.` },
      en: { subject: "Your Vizora plan is expiring", heading: "Renew your plan", body: `Your plan expires${expires ? ` on ${expires}` : " soon"}.` }
    },
    account_blocked: {
      ru: { subject: "Ограничение профиля Vizora", heading: "Профиль ограничен", body: note || "Профиль временно скрыт после проверки или жалобы. Подробности доступны в кабинете." },
      tj: { subject: "Маҳдудияти профили Vizora", heading: "Профил маҳдуд карда шуд", body: note || "Пас аз санҷиш ё шикоят профил муваққатан пинҳон карда шуд. Тафсилот дар утоқи шахсӣ дастрас аст." },
      en: { subject: "Vizora profile restriction", heading: "Profile restricted", body: note || "Your profile was temporarily hidden after a review or report. Details are available in the dashboard." }
    },
    support_reply: {
      ru: { subject: `Ответ поддержки Vizora${record ? ` — ${record}` : ""}`, heading: "Служба поддержки ответила", body: note || "Ответ доступен в Вашем кабинете." },
      tj: { subject: `Ҷавоби дастгирии Vizora${record ? ` — ${record}` : ""}`, heading: "Хадамоти дастгирӣ ҷавоб дод", body: note || "Ҷавоб дар утоқи шахсии Шумо дастрас аст." },
      en: { subject: `Vizora support reply${record ? ` — ${record}` : ""}`, heading: "Support replied", body: note || "The reply is available in your dashboard." }
    },
    service_order_status: {
      ru: { subject: value(p, "title", "Статус заказа Vizora"), heading: value(p, "title", "Статус заказа изменён"), body: note || "Откройте кабинет для просмотра заказа." },
      tj: { subject: "Ҳолати фармоиши Vizora", heading: "Ҳолати фармоиш тағйир ёфт", body: note || "Барои дидани фармоиш утоқи шахсиро кушоед." },
      en: { subject: "Vizora order status", heading: "Order status changed", body: note || "Open your dashboard to view the order." }
    },
    contract_status: {
      ru: { subject: value(p, "title", "Статус договора Vizora"), heading: value(p, "title", "Статус договора изменён"), body: note || "Договор доступен в Вашем кабинете." },
      tj: { subject: "Ҳолати шартномаи Vizora", heading: "Ҳолати шартнома тағйир ёфт", body: note || "Шартнома дар утоқи шахсии Шумо дастрас аст." },
      en: { subject: "Vizora contract status", heading: "Contract status changed", body: note || "The contract is available in your dashboard." }
    }
  };

  return dictionary[message.template_key]?.[language] ?? {
    subject: message.subject || "Vizora.tj",
    heading: value(p, "title", "Vizora.tj"),
    body: note || (language === "tj" ? "Шумо огоҳиномаи нави хизматӣ доред." : language === "en" ? "You have a new service notification." : "У Вас новое служебное уведомление.")
  };
}

export function renderEmail(message: OutboxMessage, siteUrl: string): RenderedEmail {
  const language = languageOf(message.payload);
  const labels = common[language];
  const copy = copyFor(message, language);
  const name = value(message.payload, "fullName", value(message.payload, "name"));
  const actionUrl = value(message.payload, "actionUrl", "/dashboard");
  const href = actionUrl.startsWith("http") ? actionUrl : `${siteUrl.replace(/\/$/, "")}${actionUrl}`;
  const greeting = name ? `${labels.hello}, ${name}!` : `${labels.hello}!`;
  const codeBlock = copy.code
    ? `<div style="margin:24px 0;border:1px solid #bfdbfe;border-radius:14px;background:#eff6ff;padding:18px;text-align:center;font-size:24px;font-weight:800;letter-spacing:.08em;color:#0f3b72">${escapeHtml(copy.code)}</div>`
    : "";
  const text = `${greeting}\n\n${copy.heading}\n${copy.body}${copy.code ? `\n\n${copy.code}` : ""}\n\n${href}\n\n${labels.note}\n${labels.support}`;
  const html = `<!doctype html><html lang="${language}"><body style="margin:0;background:#f2f6fb;padding:24px;font-family:Arial,sans-serif;color:#142033"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;overflow:hidden;border:1px solid #dce6f1;border-radius:22px;background:#fff"><tr><td style="background:#07182c;padding:25px 30px;color:#fff"><div style="font-size:23px;font-weight:800;letter-spacing:.04em">VIZORA<span style="color:#4f9cff">.TJ</span></div><div style="margin-top:5px;color:#9db3ce;font-size:12px">Digital identity platform</div></td></tr><tr><td style="padding:32px 30px"><p style="margin:0 0 20px;color:#53657a;font-size:15px">${escapeHtml(greeting)}</p><h1 style="margin:0;color:#101b2b;font-size:25px;line-height:1.25">${escapeHtml(copy.heading)}</h1><p style="margin:15px 0 0;color:#526276;font-size:15px;line-height:1.7">${escapeHtml(copy.body)}</p>${codeBlock}<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:25px;border-radius:12px;background:#1478eb;padding:13px 20px;color:#fff;font-size:14px;font-weight:700;text-decoration:none">${escapeHtml(labels.action)}</a></td></tr><tr><td style="border-top:1px solid #e6edf5;padding:21px 30px;color:#8290a2;font-size:11px;line-height:1.65">${escapeHtml(labels.note)}<br>${escapeHtml(labels.support)}</td></tr></table></td></tr></table></body></html>`;
  return { subject: message.subject || copy.subject, html, text };
}

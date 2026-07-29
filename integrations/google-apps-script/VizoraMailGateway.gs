/**
 * Бесплатный шлюз служебных писем Vizora через Gmail.
 * Секрет задаётся в Project Settings → Script properties:
 * VIZORA_GATEWAY_SECRET = длинная случайная строка.
 */
function doPost(event) {
  try {
    const data = JSON.parse(event.postData.contents || "{}");
    const expected = PropertiesService.getScriptProperties().getProperty("VIZORA_GATEWAY_SECRET");
    if (!expected || data.secret !== expected) {
      return response({ ok: false, error: "Unauthorized" });
    }
    if (!isEmail(data.to) || !data.subject || (!data.text && !data.html)) {
      return response({ ok: false, error: "Invalid message" });
    }

    MailApp.sendEmail({
      to: String(data.to),
      subject: String(data.subject),
      body: String(data.text || "Vizora.tj"),
      htmlBody: String(data.html || ""),
      name: "Vizora.tj",
      replyTo: String(data.replyTo || "vizora.platform.tj@gmail.com")
    });

    return response({
      ok: true,
      id: "gmail-" + String(data.referenceId || Utilities.getUuid())
    });
  } catch (error) {
    return response({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function response(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

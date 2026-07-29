import { createClient } from "npm:@supabase/supabase-js@2";
import { renderEmail, type OutboxMessage } from "../_shared/emailTemplates.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

const supabaseAdminKey = () => {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
    return keys.default ?? Object.values(keys)[0];
  } catch {
    return undefined;
  }
};

const bundledMailConfig = () => {
  const raw = Deno.env.get("MAIL_PROVIDER") ?? "";
  if (!raw.includes("=")) return {} as Record<string, string>;

  return raw
    .replaceAll("\\n", "\n")
    .split(/\r?\n/)
    .reduce<Record<string, string>>((config, line) => {
      const separator = line.indexOf("=");
      if (separator <= 0) return config;
      const key = line.slice(0, separator).trim();
      const value = line.slice(separator + 1).trim();
      if (key && value) config[key] = value;
      return config;
    }, {});
};

async function deliverWithGoogleAppsScript(
  endpoint: string,
  secret: string,
  message: { to: string; subject: string; html: string; text: string; replyTo: string; referenceId: string }
) {
  const response = await fetch(endpoint, {
    method: "POST",
    redirect: "follow",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ secret, ...message })
  });
  const provider = await response.json().catch(() => ({}));
  if (!response.ok || provider.ok !== true) {
    throw new Error(String(provider.error ?? `Google Apps Script HTTP ${response.status}`));
  }
  return String(provider.id ?? `google-${Date.now()}`);
}

async function deliverWithResend(
  apiKey: string,
  from: string,
  message: { to: string; subject: string; html: string; text: string; replyTo: string; referenceId: string }
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      reply_to: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: { "X-Entity-Ref-ID": message.referenceId }
    })
  });
  const provider = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String(provider.message ?? `Resend HTTP ${response.status}`));
  return String(provider.id ?? "");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const bundled = bundledMailConfig();
  const setting = (name: string) => Deno.env.get(name) ?? bundled[name];
  const expectedSecret = setting("MAIL_WORKER_SECRET");
  if (!expectedSecret || request.headers.get("x-mail-worker-secret") !== expectedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = supabaseAdminKey();
  const resendKey = setting("RESEND_API_KEY");
  const googleAppsScriptUrl = setting("GOOGLE_APPS_SCRIPT_URL");
  const googleAppsScriptSecret = setting("GOOGLE_APPS_SCRIPT_SECRET");
  const rawProvider = setting("MAIL_PROVIDER");
  const providerName = (rawProvider?.includes("=") ? bundled.MAIL_PROVIDER : rawProvider)
    ?? (googleAppsScriptUrl ? "google_apps_script" : "resend");
  const from = Deno.env.get("VIZORA_FROM_EMAIL") ?? "Vizora.tj <noreply@vizora.tj>";
  const replyTo = setting("VIZORA_REPLY_TO") ?? "support@vizora.tj";
  const siteUrl = setting("VIZORA_SITE_URL") ?? "https://raqibj021.github.io/card-tj2";
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("SUPABASE_URL");
  if (!serviceKey) missing.push("SUPABASE_SECRET_KEYS");
  if (providerName === "google_apps_script") {
    if (!googleAppsScriptUrl) missing.push("GOOGLE_APPS_SCRIPT_URL");
    if (!googleAppsScriptSecret) missing.push("GOOGLE_APPS_SCRIPT_SECRET");
  } else if (providerName === "resend") {
    if (!resendKey) missing.push("RESEND_API_KEY");
  } else {
    missing.push("MAIL_PROVIDER (use google_apps_script or resend)");
  }
  if (missing.length) {
    return json({ error: "Email worker is not configured", provider: providerName, missing }, 503);
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: batch, error: claimError } = await client.rpc("claim_email_batch", {
    batch_size: 20
  });
  if (claimError) return json({ error: claimError.message }, 500);

  let sent = 0;
  let failed = 0;
  for (const row of batch ?? []) {
    const message: OutboxMessage = {
      template_key: String(row.template_key),
      recipient: String(row.recipient),
      subject: row.subject ? String(row.subject) : null,
      payload: (row.payload ?? {}) as Record<string, unknown>
    };
    try {
      const rendered = renderEmail(message, siteUrl);
      const delivery = {
        to: message.recipient,
        replyTo,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        referenceId: String(row.id)
      };
      const providerMessageId = providerName === "google_apps_script"
        ? await deliverWithGoogleAppsScript(
          googleAppsScriptUrl as string,
          googleAppsScriptSecret as string,
          delivery
        )
        : await deliverWithResend(resendKey as string, from, delivery);
      const { error } = await client.from("email_outbox").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        locked_at: null,
        last_error: null,
        provider_message_id: providerMessageId
      }).eq("id", row.id);
      if (error) throw error;
      sent += 1;
    } catch (error) {
      const attempts = Number(row.attempts ?? 1);
      const terminal = attempts >= 5;
      await client.from("email_outbox").update({
        status: "failed",
        locked_at: null,
        last_error: error instanceof Error ? error.message.slice(0, 1000) : "Unknown email error",
        next_attempt_at: terminal
          ? null
          : new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000).toISOString()
      }).eq("id", row.id);
      failed += 1;
    }
  }

  return json({ provider: providerName, claimed: batch?.length ?? 0, sent, failed });
});

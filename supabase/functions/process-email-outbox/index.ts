import { createClient } from "npm:@supabase/supabase-js@2";
import { renderEmail, type OutboxMessage } from "../_shared/emailTemplates.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

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

  const expectedSecret = Deno.env.get("MAIL_WORKER_SECRET");
  if (!expectedSecret || request.headers.get("x-mail-worker-secret") !== expectedSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const googleAppsScriptUrl = Deno.env.get("GOOGLE_APPS_SCRIPT_URL");
  const googleAppsScriptSecret = Deno.env.get("GOOGLE_APPS_SCRIPT_SECRET");
  const providerName = Deno.env.get("MAIL_PROVIDER")
    ?? (googleAppsScriptUrl ? "google_apps_script" : "resend");
  const from = Deno.env.get("VIZORA_FROM_EMAIL") ?? "Vizora.tj <noreply@vizora.tj>";
  const replyTo = Deno.env.get("VIZORA_REPLY_TO") ?? "support@vizora.tj";
  const siteUrl = Deno.env.get("VIZORA_SITE_URL") ?? "https://raqibj021.github.io/card-tj2";
  const providerReady = providerName === "google_apps_script"
    ? Boolean(googleAppsScriptUrl && googleAppsScriptSecret)
    : Boolean(resendKey);
  if (!supabaseUrl || !serviceKey || !providerReady) {
    return json({ error: "Email worker is not configured" }, 503);
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

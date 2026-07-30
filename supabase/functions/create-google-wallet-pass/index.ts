import { createClient } from "npm:@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "npm:jose@5";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS"
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json; charset=utf-8" }
  });

const serviceRoleKey = () => {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}") as Record<string, string>;
    return keys.default ?? Object.values(keys)[0];
  } catch {
    return undefined;
  }
};

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

const normalizeUrl = (value: unknown) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return /^https?:\/\//i.test(text) ? text : `https://${text}`;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const issuerId = Deno.env.get("GOOGLE_WALLET_ISSUER_ID");
  const rawCredentials = Deno.env.get("GOOGLE_WALLET_SERVICE_ACCOUNT_JSON");
  if (!issuerId || !rawCredentials) {
    return json({
      code: "GOOGLE_WALLET_NOT_CONFIGURED",
      error: "Google Wallet issuer is awaiting configuration."
    }, 503);
  }

  let credentials: ServiceAccount;
  try {
    credentials = JSON.parse(rawCredentials) as ServiceAccount;
    if (!credentials.client_email || !credentials.private_key) throw new Error("Invalid credentials");
  } catch {
    return json({ error: "Google Wallet credentials are invalid." }, 503);
  }

  const body = await request.json().catch(() => ({})) as { cardId?: string; cardSlug?: string };
  if (!body.cardId && !body.cardSlug) return json({ error: "Card is required." }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const adminKey = serviceRoleKey();
  if (!supabaseUrl || !adminKey) return json({ error: "Server configuration is incomplete." }, 503);

  const admin = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  let query = admin.from("cards").select(
    "id,slug,full_name,position,organization_name,description,photo_path,contacts,address,visibility,review_status"
  );
  query = body.cardId ? query.eq("id", body.cardId) : query.eq("slug", body.cardSlug);
  const { data: card, error } = await query.maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!card) return json({ error: "Визитка не найдена." }, 404);

  const allowedVisibility = ["public", "organization", "public_organization"];
  if (!allowedVisibility.includes(String(card.visibility)) || card.review_status !== "approved") {
    return json({ error: "Добавить в Wallet можно только опубликованную и подтверждённую визитку." }, 403);
  }

  const contacts = (card.contacts ?? {}) as Record<string, unknown>;
  const objectId = `${issuerId}.${String(card.id).replaceAll("-", "_")}`;
  const classId = `${issuerId}.vizora_digital_card`;
  const website = normalizeUrl(contacts.website);
  const siteUrl = (Deno.env.get("VIZORA_SITE_URL") ?? "https://vizora.tj").replace(/\/+$/, "");
  const cardUrl = `${siteUrl}/card/${card.slug}`;
  const textModulesData = [
    card.position && { id: "position", header: "ДОЛЖНОСТЬ", body: String(card.position) },
    card.organization_name && { id: "organization", header: "ОРГАНИЗАЦИЯ", body: String(card.organization_name) },
    contacts.phone && { id: "phone", header: "ТЕЛЕФОН", body: String(contacts.phone) },
    contacts.email && { id: "email", header: "ЭЛЕКТРОННАЯ ПОЧТА", body: String(contacts.email) },
    card.address && { id: "address", header: "АДРЕС", body: String(card.address) }
  ].filter(Boolean);

  const genericObject: Record<string, unknown> = {
    id: objectId,
    classId,
    state: "ACTIVE",
    cardTitle: { defaultValue: { language: "ru", value: String(card.organization_name || "Vizora.tj") } },
    header: { defaultValue: { language: "ru", value: String(card.full_name) } },
    subheader: { defaultValue: { language: "ru", value: String(card.position || "Цифровая визитка") } },
    textModulesData,
    linksModuleData: {
      uris: [
        { id: "card", uri: cardUrl, description: "Открыть цифровую визитку" },
        ...(website ? [{ id: "website", uri: website, description: "Сайт" }] : [])
      ]
    },
    barcode: { type: "QR_CODE", value: cardUrl, alternateText: "Vizora.tj" },
    hexBackgroundColor: "#0f766e"
  };
  const photo = normalizeUrl(card.photo_path);
  if (photo) {
    genericObject.heroImage = {
      sourceUri: { uri: photo },
      contentDescription: { defaultValue: { language: "ru", value: String(card.full_name) } }
    };
  }

  try {
    const privateKey = await importPKCS8(credentials.private_key, "RS256");
    const token = await new SignJWT({
      typ: "savetowallet",
      origins: Array.from(new Set([
        new URL(siteUrl).origin,
        ...(Deno.env.get("VIZORA_WALLET_ORIGIN") ?? "")
          .split(",")
          .map((value) => value.trim().replace(/\/+$/, ""))
          .filter(Boolean)
      ])),
      payload: {
        genericObjects: [genericObject]
      }
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuer(credentials.client_email)
      .setAudience("google")
      .setIssuedAt()
      .sign(privateKey);

    return json({ saveUrl: `https://pay.google.com/gp/v/save/${token}` });
  } catch (signError) {
    console.error("Google Wallet signing failed", signError);
    return json({ error: "Не удалось подписать пропуск Google Wallet." }, 500);
  }
});

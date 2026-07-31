import { supabase } from "./supabase";

export type LeadStatus = "new" | "contacted" | "in_progress" | "completed";
export type PaymentLeadStatus = "not_required" | "pending" | "paid";

export interface LeadHistoryItem {
  id: string;
  text: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  cardId: string;
  cardSlug: string;
  clientName: string;
  phone: string;
  email: string;
  service: string;
  message: string;
  source: "contact" | "callback" | "request";
  status: LeadStatus;
  paymentStatus: PaymentLeadStatus;
  notes: string;
  history: LeadHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

type NewLeadData = Pick<
  Lead,
  "cardId" | "cardSlug" | "clientName" | "phone" | "email" | "service" | "message" | "source"
>;

const STORAGE_KEY = "vizora.leads.v1";

const read = (): Lead[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item): item is Lead =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof (item as Partial<Lead>).id === "string"
    );
  } catch {
    return [];
  }
};

const write = (items: Lead[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

const normalizePhone = (value: string) => value.replace(/[^\d+]/g, "");

const validatePublicLead = (
  data: NewLeadData
) => {
  const name = data.clientName.trim();
  const phone = normalizePhone(data.phone);
  const email = data.email.trim().toLowerCase();
  if (name.length < 2 || name.length > 80) {
    throw new Error("Укажите имя длиной от 2 до 80 символов.");
  }
  if (!/^\+?\d{9,15}$/.test(phone)) {
    throw new Error("Укажите корректный номер телефона: от 9 до 15 цифр.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Укажите корректный адрес электронной почты.");
  }
  if (data.service.trim().length > 120 || data.message.trim().length > 1000) {
    throw new Error("Текст обращения превышает допустимую длину.");
  }
  return { ...data, clientName: name, phone, email };
};

const fromDatabase = (row: Record<string, unknown>): Lead => {
  const historyRows = Array.isArray(row.lead_history)
    ? row.lead_history as Array<Record<string, unknown>>
    : [];
  return {
    id: String(row.id),
    cardId: String(row.card_id),
    cardSlug: String(row.card_slug ?? ""),
    clientName: String(row.client_name ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    service: String(row.service ?? ""),
    message: String(row.message ?? ""),
    source: row.source as Lead["source"],
    status: row.status as LeadStatus,
    paymentStatus: row.payment_status as PaymentLeadStatus,
    notes: String(row.notes ?? ""),
    history: historyRows
      .map((item) => ({
        id: String(item.id),
        text: String(item.event_text ?? ""),
        createdAt: String(item.created_at)
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
};

export const leadRepository = {
  list: () => read().sort((a, b) =>
    String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""))
  ),
  listRemote: async () => {
    if (!supabase) throw new Error("Сервис CRM временно недоступен.");
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error("Для просмотра лидов войдите в аккаунт.");
    const { data, error } = await supabase
      .from("leads")
      .select("*, lead_history(*)")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message || "Не удалось загрузить обращения.");
    const mapped = (data ?? []).map((row) => fromDatabase(row as Record<string, unknown>));
    write(mapped);
    return mapped;
  },
  create: async (data: NewLeadData) => {
    if (!supabase) throw new Error("Сервис обращений временно недоступен. Попробуйте позже.");
    const validated = validatePublicLead(data);
    const now = new Date().toISOString();
    const lead: Lead = {
      ...validated,
      id: "",
      status: "new",
      paymentStatus: "not_required",
      notes: "",
      history: [],
      createdAt: now,
      updatedAt: now
    };
    const { data: leadId, error } = await supabase.rpc("submit_public_lead", {
      target_card_id: validated.cardId,
      client_name: validated.clientName,
      phone: validated.phone,
      email: validated.email,
      service: validated.service.trim(),
      message: validated.message.trim(),
      source: validated.source
    });
    if (error) throw new Error(error.message || "Не удалось отправить обращение.");
    if (!leadId) throw new Error("Сервер не подтвердил сохранение обращения.");
    return { ...lead, id: String(leadId) };
  },
  update: async (id: string, changes: Partial<Pick<Lead, "status" | "paymentStatus" | "notes" | "service">>) => {
    if (!supabase) throw new Error("Сервис CRM временно недоступен.");
    const { error } = await supabase.rpc("update_owned_lead", {
      target_lead_id: id,
      next_status: changes.status ?? null,
      next_payment_status: changes.paymentStatus ?? null,
      next_notes: changes.notes ?? null,
      next_service: changes.service ?? null
    });
    if (error) throw new Error(error.message || "Не удалось сохранить изменения.");
  },
  addHistory: async (id: string, text: string) => {
    if (!supabase) throw new Error("Сервис CRM временно недоступен.");
    const { error } = await supabase.rpc("add_owned_lead_history", {
      target_lead_id: id,
      history_event: text.trim()
    });
    if (error) throw new Error(error.message || "Не удалось добавить запись.");
  }
};

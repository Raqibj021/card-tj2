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

const STORAGE_KEY = "vizora.leads.v1";

const read = (): Lead[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Lead[];
  } catch {
    return [];
  }
};

const write = (items: Lead[]) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));

const insertRemoteHistory = (leadId: string, text: string) => {
  if (!supabase) return;
  const client = supabase;
  void client.auth.getUser().then(({ data }) => {
    if (!data.user) return;
    void client.from("lead_history").insert({
      lead_id: leadId,
      author_id: data.user.id,
      event_text: text
    });
  });
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
  list: () => read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  listRemote: async () => {
    if (!supabase) return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const { data, error } = await supabase
      .from("leads")
      .select("*, lead_history(*)")
      .order("updated_at", { ascending: false });
    if (error) return read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const mapped = (data ?? []).map((row) => fromDatabase(row as Record<string, unknown>));
    write(mapped);
    return mapped;
  },
  create: async (data: Pick<Lead, "cardId" | "cardSlug" | "clientName" | "phone" | "email" | "service" | "message" | "source">) => {
    const now = new Date().toISOString();
    const lead: Lead = {
      ...data,
      id: crypto.randomUUID(),
      status: "new",
      paymentStatus: "not_required",
      notes: "",
      history: [{ id: crypto.randomUUID(), text: "Обращение создано", createdAt: now }],
      createdAt: now,
      updatedAt: now
    };
    if (supabase) {
      const { error } = await supabase.rpc("submit_public_lead", {
        target_card_id: data.cardId,
        client_name: data.clientName,
        phone: data.phone,
        email: data.email,
        service: data.service,
        message: data.message,
        source: data.source
      });
      if (!error) return lead;
    }
    write([lead, ...read()]);
    return lead;
  },
  update: (id: string, changes: Partial<Pick<Lead, "status" | "paymentStatus" | "notes" | "service">>) => {
    const now = new Date().toISOString();
    write(read().map((lead) => {
      if (lead.id !== id) return lead;
      const events: LeadHistoryItem[] = [];
      if (changes.status && changes.status !== lead.status) {
        events.push({ id: crypto.randomUUID(), text: `Статус изменён: ${changes.status}`, createdAt: now });
      }
      if (changes.paymentStatus && changes.paymentStatus !== lead.paymentStatus) {
        events.push({ id: crypto.randomUUID(), text: `Статус оплаты: ${changes.paymentStatus}`, createdAt: now });
      }
      return { ...lead, ...changes, history: [...events, ...lead.history], updatedAt: now };
    }));
    if (supabase) {
      const remoteChanges: Record<string, string> = { updated_at: now };
      if (changes.status) remoteChanges.status = changes.status;
      if (changes.paymentStatus) remoteChanges.payment_status = changes.paymentStatus;
      if (changes.notes !== undefined) remoteChanges.notes = changes.notes;
      if (changes.service !== undefined) remoteChanges.service = changes.service;
      void supabase.from("leads").update(remoteChanges).eq("id", id);
      for (const event of read().find((lead) => lead.id === id)?.history.slice(0, 1) ?? []) {
        if (event.createdAt === now) {
          insertRemoteHistory(id, event.text);
        }
      }
    }
  },
  addHistory: (id: string, text: string) => {
    const now = new Date().toISOString();
    write(read().map((lead) =>
      lead.id === id
        ? { ...lead, history: [{ id: crypto.randomUUID(), text, createdAt: now }, ...lead.history], updatedAt: now }
        : lead
    ));
    if (supabase) {
      insertRemoteHistory(id, text);
    }
  }
};
import { supabase } from "./supabase";

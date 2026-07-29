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

export const leadRepository = {
  list: () => read().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  create: (data: Pick<Lead, "cardId" | "cardSlug" | "clientName" | "phone" | "email" | "service" | "message" | "source">) => {
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
    write([lead, ...read()]);
    if (supabase) {
      void supabase.rpc("submit_public_lead", {
        target_card_id: data.cardId,
        client_name: data.clientName,
        phone: data.phone,
        email: data.email,
        service: data.service,
        message: data.message,
        source: data.source
      });
    }
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
  },
  addHistory: (id: string, text: string) => {
    const now = new Date().toISOString();
    write(read().map((lead) =>
      lead.id === id
        ? { ...lead, history: [{ id: crypto.randomUUID(), text, createdAt: now }, ...lead.history], updatedAt: now }
        : lead
    ));
  }
};
import { supabase } from "./supabase";

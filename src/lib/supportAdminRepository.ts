import { supabase } from "./supabase";

export type SupportTicketAdmin = {
  id: string; ticketNumber: string; category: string; subject: string; message: string;
  status: string; priority: string; staffReply: string; internalNote: string;
  createdAt: string; updatedAt: string; firstResponseAt?: string; closedAt?: string;
  contact: { name?: string; phone?: string; email?: string };
};
export type OutboxEmailAdmin = {
  id: string; recipient: string; template: string; subject: string; status: string;
  attempts: number; lastError: string; scheduledAt: string; sentAt?: string; createdAt: string;
};
export type CampaignAdmin = {
  id: string; title: string; subject: string; message: string; audience: string;
  language: string; status: string; recipientCount: number; createdAt: string;
};
export type SupportWorkspace = {
  stats: { newTickets: number; inProgress: number; closedTickets: number; urgentTickets: number;
    unresolvedReports: number; queuedEmails: number; failedEmails: number; sentToday: number; marketingAudience: number };
  tickets: SupportTicketAdmin[];
  outbox: OutboxEmailAdmin[];
  campaigns: CampaignAdmin[];
  history: Array<{ id: number; action: string; details: Record<string, unknown>; createdAt: string }>;
};

const empty: SupportWorkspace = {
  stats: { newTickets: 0, inProgress: 0, closedTickets: 0, urgentTickets: 0,
    unresolvedReports: 0, queuedEmails: 0, failedEmails: 0, sentToday: 0, marketingAudience: 0 },
  tickets: [], outbox: [], campaigns: [], history: []
};

export const supportAdminRepository = {
  async workspace() {
    if (!supabase) return empty;
    const { data, error } = await supabase.rpc("get_admin_support_workspace");
    if (error) throw error;
    return (data ?? empty) as SupportWorkspace;
  },
  async reply(id: string, reply: string, status: string, priority: string, internalNote: string) {
    if (!supabase) throw new Error("Supabase не подключён");
    const { error } = await supabase.rpc("admin_reply_support_ticket", {
      target_ticket_id: id, reply_text: reply, next_status: status,
      next_priority: priority, internal_note_text: internalNote
    });
    if (error) throw error;
  },
  async retryEmail(id: string) {
    if (!supabase) throw new Error("Supabase не подключён");
    const { error } = await supabase.rpc("admin_retry_email", { target_email_id: id });
    if (error) throw error;
  },
  async cancelEmail(id: string) {
    if (!supabase) throw new Error("Supabase не подключён");
    const { error } = await supabase.rpc("admin_cancel_email", { target_email_id: id });
    if (error) throw error;
  },
  async sendCampaign(title: string, subject: string, message: string, audience: string, language: string) {
    if (!supabase) throw new Error("Supabase не подключён");
    const { data, error } = await supabase.rpc("admin_send_campaign", {
      campaign_title: title, campaign_subject: subject, campaign_message: message,
      campaign_audience: audience, campaign_language: language
    });
    if (error) throw error;
    return Number(data ?? 0);
  }
};

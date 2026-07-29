import { supabase } from "./supabase";

export const supportRepository = {
  create: async (data: {
    name: string;
    phone: string;
    topic: string;
    reference: string;
    message: string;
  }) => {
    if (!supabase) throw new Error("Сервер временно недоступен.");
    const { data: ticketNumber, error } = await supabase.rpc("submit_support_ticket", {
      contact_name: data.name,
      contact_phone: data.phone,
      ticket_category: data.topic,
      reference_number: data.reference,
      ticket_message: data.message
    });
    if (error) throw error;
    return String(ticketNumber);
  }
};

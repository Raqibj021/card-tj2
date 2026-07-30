import { adminSupabase as supabase } from "./supabase";

export type AdminPayment = {
  id: string; orderNumber: string; planCode: string; amount: number; payerName: string;
  receiptPath: string; status: string; createdAt: string; reviewedAt?: string; activatedAt?: string;
  rejectionReason: string; adminNote: string; email: string; organization: string;
  customer: { fullName?: string; phone?: string };
};
export type AdminServiceOrder = {
  id: string; orderNumber: string; customer: { fullName?: string; phone?: string };
  items: Array<{ title?: string; quantity?: number }>; total: number; status: string;
  paymentStatus: string; managerComment: string; createdAt: string;
};
export type AdminContract = {
  id: string; number: string; customer: { fullName?: string; phone?: string };
  services: string[]; total: number; status: string; createdAt: string;
};
export type CommerceWorkspace = {
  stats: { pendingPayments: number; activePlans: number; expiringPlans: number; tariffRevenue: number;
    serviceOrders: number; serviceRevenue: number; promoClaimed: number; promoLimit: number };
  payments: AdminPayment[]; serviceOrders: AdminServiceOrder[]; contracts: AdminContract[];
  history: Array<{ id: number; action: string; details: Record<string, unknown>; createdAt: string }>;
};

const empty: CommerceWorkspace = {
  stats: { pendingPayments: 0, activePlans: 0, expiringPlans: 0, tariffRevenue: 0, serviceOrders: 0, serviceRevenue: 0, promoClaimed: 0, promoLimit: 50 },
  payments: [], serviceOrders: [], contracts: [], history: []
};

export const commerceAdminRepository = {
  async workspace() {
    if (!supabase) return empty;
    const { data, error } = await supabase.rpc("get_admin_commerce_workspace");
    if (error) throw error;
    return (data ?? empty) as CommerceWorkspace;
  },
  async receiptUrl(path: string) {
    if (!supabase || !path) throw new Error("Чек не найден");
    const { data, error } = await supabase.storage.from("payment-receipts").createSignedUrl(path, 300);
    if (error) throw error;
    return data.signedUrl;
  },
  async approvePayment(id: string, note: string) {
    if (!supabase) throw new Error("Supabase не подключён");
    const { data, error } = await supabase.rpc("admin_approve_payment", { target_order_id: id, note });
    if (error) throw new Error(error.message || "Сервер не смог подтвердить оплату.");
    return String(data);
  },
  async rejectPayment(id: string, reason: string) {
    if (!supabase) throw new Error("Supabase не подключён");
    const { error } = await supabase.rpc("admin_reject_payment", { target_order_id: id, reason });
    if (error) throw new Error(error.message || "Сервер не смог отклонить оплату.");
  },
  async updateServiceOrder(id: string, status: string, paymentStatus: string, comment: string) {
    if (!supabase) throw new Error("Supabase не подключён");
    const { error } = await supabase.rpc("admin_update_service_order", {
      target_order_id: id, next_status: status, next_payment_status: paymentStatus, comment
    });
    if (error) throw error;
  },
  async updateContract(id: string, status: string) {
    if (!supabase) throw new Error("Supabase не подключён");
    const { error } = await supabase.rpc("admin_update_contract", { target_contract_id: id, next_status: status });
    if (error) throw error;
  }
};

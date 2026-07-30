import { supabase } from "./supabase";

export type PaymentStatus = "draft" | "payment_pending" | "payment_review" | "active" | "rejected" | "expired";

export interface PaymentRequest {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  plan: string;
  planCode: string;
  amount: number;
  payerName: string;
  receiptName: string;
  receiptPath?: string;
  status: PaymentStatus;
  createdAt: string;
}

const fromDatabase = (row: Record<string, unknown>): PaymentRequest => ({
  id: String(row.id),
  orderNumber: String(row.order_number),
  customerName: String((row.customer_snapshot as Record<string, unknown> | null)?.fullName ?? ""),
  phone: String((row.customer_snapshot as Record<string, unknown> | null)?.phone ?? ""),
  plan: String(row.plan_code),
  planCode: String(row.plan_code),
  amount: Number(row.amount_somoni),
  payerName: String(row.payer_name ?? ""),
  receiptName: String(row.receipt_path ?? "").split("/").pop() ?? "",
  receiptPath: String(row.receipt_path ?? ""),
  status: row.status as PaymentStatus,
  createdAt: String(row.created_at)
});

export const paymentRepository = {
  listRemote: async () => {
    if (!supabase) throw new Error("Сервер оплаты временно недоступен.");
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => fromDatabase(row as Record<string, unknown>));
  },

  create: async (data: {
    customerName: string;
    phone: string;
    plan: string;
    planCode: string;
    payerName: string;
    receiptFile: File;
    organizationId?: string;
  }) => {
    if (!supabase) throw new Error("Сервер оплаты временно недоступен.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Сначала войдите в аккаунт.");
    if (data.receiptFile.size > 5 * 1024 * 1024) throw new Error("Размер чека не должен превышать 5 МБ.");
    if (!["image/png", "image/jpeg", "application/pdf"].includes(data.receiptFile.type)) {
      throw new Error("Разрешены только JPG, PNG и PDF.");
    }

    const uploadId = crypto.randomUUID();
    const safeName = data.receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const receiptPath = `${auth.user.id}/${uploadId}/${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-receipts")
      .upload(receiptPath, data.receiptFile, {
        upsert: false,
        contentType: data.receiptFile.type
      });
    if (uploadError) throw uploadError;

    const { data: inserted, error } = await supabase.rpc("submit_payment_request", {
      customer_name: data.customerName,
      customer_phone: data.phone,
      selected_plan: data.planCode,
      payment_sender_name: data.payerName,
      uploaded_receipt_path: receiptPath,
      target_organization_id: data.organizationId ?? null
    });
    if (error) {
      await supabase.storage.from("payment-receipts").remove([receiptPath]);
      throw new Error(error.message);
    }
    return fromDatabase(inserted as Record<string, unknown>);
  }
};

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

const KEY = "vizora.payment-requests.v1";

const read = (): PaymentRequest[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as PaymentRequest[];
  } catch {
    return [];
  }
};

const write = (items: PaymentRequest[]) =>
  localStorage.setItem(KEY, JSON.stringify(items));

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
  list: () => read().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),

  listRemote: async () => {
    if (!supabase) return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const items = (data ?? []).map((row) => fromDatabase(row as Record<string, unknown>));
    write(items);
    return items;
  },

  create: async (data: {
    customerName: string;
    phone: string;
    plan: string;
    planCode: string;
    amount: number;
    payerName: string;
    receiptFile: File;
    organizationId?: string;
  }) => {
    const orderNumber = `VZ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    if (supabase) {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Сначала войдите в аккаунт.");
      const safeName = data.receiptFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const receiptPath = `${auth.user.id}/${orderNumber}/${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(receiptPath, data.receiptFile, {
          upsert: true,
          contentType: data.receiptFile.type
        });
      if (uploadError) throw uploadError;
      const { data: inserted, error } = await supabase
        .from("orders")
        .insert({
          user_id: auth.user.id,
          organization_id: data.organizationId ?? null,
          order_number: orderNumber,
          plan_code: data.planCode,
          amount_somoni: data.amount,
          payer_name: data.payerName,
          receipt_path: receiptPath,
          customer_snapshot: { fullName: data.customerName, phone: data.phone },
          status: "payment_review"
        })
        .select("*")
        .single();
      if (error) throw error;
      const item = fromDatabase(inserted as Record<string, unknown>);
      write([item, ...read().filter((order) => order.id !== item.id)]);
      return item;
    }

    const item: PaymentRequest = {
      id: crypto.randomUUID(),
      orderNumber,
      customerName: data.customerName,
      phone: data.phone,
      plan: data.plan,
      planCode: data.planCode,
      amount: data.amount,
      payerName: data.payerName,
      receiptName: data.receiptFile.name,
      status: "payment_review",
      createdAt: new Date().toISOString()
    };
    write([item, ...read()]);
    return item;
  },

  reject: async (id: string) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { error } = await supabase
      .from("orders")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },
};

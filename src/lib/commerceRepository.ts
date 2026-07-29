import { supabase } from "./supabase";

export interface OrderItem {
  id: string;
  title: string;
  category: "digital" | "design" | "print" | "materials" | "extras";
  quantity: number;
  unitPrice: number;
}

export interface CustomerDetails {
  fullName: string;
  organization?: string;
  phone: string;
  email: string;
  address?: string;
  taxId?: string;
  document?: string;
}

export type OrderStatus = "new" | "clarifying" | "approved" | "in_progress" | "ready" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "pending" | "paid" | "refunded";
export type ContractStatus = "draft" | "submitted" | "approved" | "signed" | "cancelled";

export interface ServiceOrderRecord {
  id: string;
  user_id: string;
  order_number: string;
  customer: CustomerDetails;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  manager_comment: string;
  created_at: string;
}

export interface ContractRecord {
  id: string;
  user_id: string;
  contract_number: string;
  customer_type: "individual" | "organization";
  customer: CustomerDetails;
  services: string[];
  total: number;
  status: ContractStatus;
  created_at: string;
}

export async function listServiceOrders(): Promise<ServiceOrderRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("service_orders")
    .select("id,user_id,order_number,customer,items,total,status,payment_status,manager_comment,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ServiceOrderRecord[];
}

export async function listContracts(): Promise<ContractRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("contracts")
    .select("id,user_id,contract_number,customer_type,customer,services,total,status,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ContractRecord[];
}

export async function updateServiceOrder(
  id: string,
  values: Partial<Pick<ServiceOrderRecord, "status" | "payment_status" | "manager_comment">>
) {
  if (!supabase) throw new Error("Supabase не подключён");
  const { error } = await supabase.from("service_orders").update(values).eq("id", id);
  if (error) throw error;
}

export async function updateContractStatus(id: string, status: ContractStatus) {
  if (!supabase) throw new Error("Supabase не подключён");
  const { error } = await supabase
    .from("contracts")
    .update({ status, accepted_at: status === "signed" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function getCommerceStats() {
  if (!supabase) return { orders: 0, newOrders: 0, unpaid: 0, revenue: 0, contracts: 0 };
  const { data, error } = await supabase.rpc("get_commerce_admin_stats");
  if (error) throw error;
  return data as { orders: number; newOrders: number; unpaid: number; revenue: number; contracts: number };
}

export async function createServiceOrder(
  userId: string,
  customer: CustomerDetails,
  items: OrderItem[]
) {
  if (!supabase) throw new Error("Supabase не подключён");
  const totals = items.reduce(
    (sum, item) => ({ ...sum, [item.category]: sum[item.category] + item.unitPrice * item.quantity }),
    { digital: 0, design: 0, print: 0, materials: 0, extras: 0 }
  );
  const { data, error } = await supabase
    .from("service_orders")
    .insert({
      user_id: userId,
      customer,
      items,
      quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      digital_total: totals.digital,
      design_total: totals.design,
      print_total: totals.print,
      materials_total: totals.materials,
      extras_total: totals.extras
    })
    .select("id, order_number, total")
    .single();
  if (error) throw error;
  return data;
}

export async function createContract(
  userId: string,
  customerType: "individual" | "organization",
  customer: CustomerDetails,
  services: string[],
  total: number,
  serviceOrderId?: string
) {
  if (!supabase) throw new Error("Supabase не подключён");
  const { data, error } = await supabase
    .from("contracts")
    .insert({
      user_id: userId,
      customer_type: customerType,
      customer,
      services,
      total,
      service_order_id: serviceOrderId || null
    })
    .select("id, contract_number, created_at")
    .single();
  if (error) throw error;
  return data;
}

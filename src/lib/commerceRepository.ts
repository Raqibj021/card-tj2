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

import { createSlug } from "./cardUtils";
import { supabase } from "./supabase";

export interface OrganizationApplication {
  id: string;
  displayName: string;
  legalName: string;
  organizationType: string;
  phone: string;
  email: string;
  planCode: string;
  employeeLimit: number;
  reviewStatus: string;
}

export const organizationRepository = {
  createApplication: async (data: {
    name: string;
    type: string;
    contactName: string;
    contactPosition: string;
    phone: string;
    email: string;
    planCode: string;
  }) => {
    if (!supabase) throw new Error("Сервер временно недоступен.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Сначала войдите в аккаунт.");
    const employeeLimit = data.planCode === "start" ? 20 : data.planCode === "business" ? 50 : 100;
    const baseSlug = createSlug(data.name) || `organization-${Date.now()}`;
    const { data: created, error } = await supabase
      .from("organizations")
      .insert({
        owner_id: auth.user.id,
        slug: `${baseSlug}-${String(Date.now()).slice(-4)}`,
        legal_name: data.name,
        display_name: data.name,
        organization_type: data.type,
        phone: data.phone,
        email: data.email,
        plan_code: data.planCode,
        employee_limit: employeeLimit,
        review_status: "pending",
        description: JSON.stringify({
          contactName: data.contactName,
          contactPosition: data.contactPosition
        })
      })
      .select("*")
      .single();
    if (error) throw error;
    return created as Record<string, unknown>;
  },

  listMine: async (): Promise<OrganizationApplication[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => ({
      id: String(row.id),
      displayName: String(row.display_name),
      legalName: String(row.legal_name),
      organizationType: String(row.organization_type),
      phone: String(row.phone ?? ""),
      email: String(row.email ?? ""),
      planCode: String(row.plan_code ?? ""),
      employeeLimit: Number(row.employee_limit ?? 20),
      reviewStatus: String(row.review_status)
    }));
  }
};

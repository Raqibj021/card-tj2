import { createSlug } from "./cardUtils";
import { supabase } from "./supabase";

export interface OrganizationApplication {
  id: string; displayName: string; legalName: string; organizationType: string;
  phone: string; email: string; planCode: string; employeeLimit: number;
  reviewStatus: string; slug?: string; activeUntil?: string | null;
  paymentStatus?: string; paymentOrderNumber?: string;
  contactName?: string; contactPosition?: string;
}
export interface OrganizationDepartment { id: string; name: string; parentId: string | null; }
export interface OrganizationEmployee {
  id: string; kind: "assignment"; profileId?: string; name: string;
  email: string; phone: string; secondPhone: string; whatsapp: string; position: string;
  departmentId: string | null; department: string; status: string; cardSlug: string;
  website: string; address: string; telegram: string; instagram: string; facebook: string;
  description: string; photo: string; companyLogo: string; language: string; theme: string; template: string;
}
export interface OrganizationEmployeeDraft {
  organizationId: string; name: string; position: string; phone: string; whatsapp: string;
  departmentId: string | null; secondPhone?: string; email?: string; website?: string;
  address?: string; telegram?: string; instagram?: string; facebook?: string;
  description?: string; photo?: string; companyLogo?: string; language?: string;
  theme?: string; template?: string;
}
export interface OrganizationWorkspace {
  organization: OrganizationApplication; departments: OrganizationDepartment[]; employees: OrganizationEmployee[];
}

const uploadEmployeeAsset = async (organizationId: string, kind: "photo" | "logo", value: string) => {
  if (!supabase || !value.startsWith("data:")) return value;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Сначала войдите в аккаунт.");
  const blob = await (await fetch(value)).blob();
  const extension = blob.type.includes("png") ? "png" : blob.type.includes("jpeg") ? "jpg" : "webp";
  const path = `${auth.user.id}/organizations/${organizationId}/${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const { error } = await supabase.storage.from("card-assets").upload(path, blob, {
    contentType: blob.type, cacheControl: "31536000", upsert: false
  });
  if (error) throw new Error("Не удалось загрузить изображение.");
  return supabase.storage.from("card-assets").getPublicUrl(path).data.publicUrl;
};

const mapOrganization = (row: Record<string, unknown>): OrganizationApplication => {
  let applicationDetails: Record<string, unknown> = {};
  if (typeof row.description === "string") {
    try {
      applicationDetails = JSON.parse(row.description) as Record<string, unknown>;
    } catch {
      applicationDetails = {};
    }
  }
  return {
    id: String(row.id), displayName: String(row.display_name), legalName: String(row.legal_name),
    organizationType: String(row.organization_type), phone: String(row.phone ?? ""),
    email: String(row.email ?? ""), planCode: String(row.plan_code ?? ""),
    employeeLimit: Number(row.employee_limit ?? 20), reviewStatus: String(row.review_status),
    slug: String(row.slug ?? ""), activeUntil: row.active_until ? String(row.active_until) : null,
    paymentStatus: String(row.payment_status ?? "none"),
    paymentOrderNumber: String(row.payment_order_number ?? ""),
    contactName: String(applicationDetails.contactName ?? ""),
    contactPosition: String(applicationDetails.contactPosition ?? "")
  };
};

export const organizationRepository = {
  createApplication: async (data: { name: string; type: string; contactName: string; contactPosition: string; phone: string; email: string; planCode: string; }) => {
    if (!supabase) throw new Error("Сервер временно недоступен.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Сначала войдите в аккаунт.");
    const baseSlug = createSlug(data.name) || `organization-${Date.now()}`;
    const { data: created, error } = await supabase.rpc("submit_organization_application", {
      organization_name: data.name.trim(), organization_type: data.type.trim(),
      contact_name: data.contactName.trim(), contact_position: data.contactPosition.trim(),
      contact_phone: data.phone.trim(), contact_email: data.email.trim(),
      selected_plan: data.planCode, requested_slug: baseSlug
    });
    if (error) throw new Error(error.message || "Не удалось сохранить заявку.");
    if (!created) throw new Error("Сервер не вернул созданную заявку.");
    return mapOrganization(created as Record<string, unknown>);
  },

  listMine: async (): Promise<OrganizationApplication[]> => {
    if (!supabase) return [];
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error("Сначала войдите в аккаунт.");
    const { data: memberships, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("profile_id", auth.user.id)
      .in("role", ["owner", "admin", "editor"]);
    if (membershipError) throw new Error(membershipError.message || "Не удалось загрузить организации.");
    const organizationIds = (memberships ?? []).map((item) => String(item.organization_id));
    if (!organizationIds.length) return [];
    const [{ data, error }, { data: orders, error: ordersError }] = await Promise.all([
      supabase.from("organizations").select("*").in("id", organizationIds).order("created_at", { ascending: false }),
      supabase.from("orders")
        .select("organization_id,order_number,status,created_at")
        .in("organization_id", organizationIds)
        .order("created_at", { ascending: false })
    ]);
    if (error) throw new Error(error.message || "Не удалось загрузить организации.");
    if (ordersError) throw new Error(ordersError.message || "Не удалось загрузить состояние оплаты.");
    const latestOrderByOrganization = new Map<string, Record<string, unknown>>();
    (orders ?? []).forEach((order) => {
      const organizationId = String(order.organization_id ?? "");
      const current = latestOrderByOrganization.get(organizationId);
      if (organizationId && (!current || (order.status === "active" && current.status !== "active"))) {
        latestOrderByOrganization.set(organizationId, order as Record<string, unknown>);
      }
    });
    return (data ?? []).map((row) => {
      const order = latestOrderByOrganization.get(String(row.id));
      return mapOrganization({
        ...(row as Record<string, unknown>),
        payment_status: order?.status ?? "none",
        payment_order_number: order?.order_number ?? ""
      });
    });
  },

  getCurrentApplication: async (): Promise<OrganizationApplication | null> => {
    if (!supabase) return null;
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) throw new Error("Сначала войдите в аккаунт.");
    const { data: organization, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("owner_id", auth.user.id)
      .maybeSingle();
    if (error) throw new Error(error.message || "Не удалось загрузить заявку организации.");
    if (!organization) return null;
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("order_number,status,created_at")
      .eq("organization_id", organization.id)
      .in("status", ["payment_pending", "payment_review", "active"])
      .order("created_at", { ascending: false });
    if (ordersError) throw new Error(ordersError.message || "Не удалось загрузить состояние оплаты.");
    const order = (orders ?? []).find((item) => item.status === "active") ?? orders?.[0];
    return mapOrganization({
      ...(organization as Record<string, unknown>),
      payment_status: order?.status ?? "none",
      payment_order_number: order?.order_number ?? ""
    });
  },

  getWorkspace: async (organizationId?: string): Promise<OrganizationWorkspace | null> => {
    if (!supabase) return null;
    const organizations = await organizationRepository.listMine();
    const organization = organizations.find((item) => item.id === organizationId) ?? organizations[0];
    if (!organization) return null;
    const { data, error } = await supabase.rpc("get_organization_workspace", { target_organization_id: organization.id });
    if (error) throw new Error(error.message || "Не удалось загрузить рабочий кабинет организации.");
    if (!data) throw new Error("Сервер не вернул данные организации.");
    const payload = data as { organization: Record<string, unknown>; departments: Array<Record<string, unknown>>; employees: Array<Record<string, unknown>>; };
    const departments = (payload.departments ?? []).map((item) => ({ id: String(item.id), name: String(item.name), parentId: item.parent_id ? String(item.parent_id) : null }));
    const accepted = (payload.employees ?? []).map((item) => ({
      id: String(item.id), kind: "assignment" as const, profileId: String(item.profileId ?? ""),
      name: String(item.name ?? ""), email: String(item.email ?? ""), phone: String(item.phone ?? ""),
      secondPhone: String(item.secondPhone ?? ""), whatsapp: String(item.whatsapp ?? ""),
      position: String(item.position ?? ""),
      departmentId: item.departmentId ? String(item.departmentId) : null,
      department: String(item.department ?? "—"), status: String(item.cardStatus ?? "approved"), cardSlug: String(item.cardSlug ?? ""),
      website: String(item.website ?? ""), address: String(item.address ?? ""), telegram: String(item.telegram ?? ""),
      instagram: String(item.instagram ?? ""), facebook: String(item.facebook ?? ""), description: String(item.description ?? ""),
      photo: String(item.photo ?? ""), companyLogo: String(item.companyLogo ?? ""), language: String(item.language ?? "ru"),
      theme: String(item.theme ?? "teal"), template: String(item.template ?? "executive")
    }));
    return { organization: mapOrganization(payload.organization), departments, employees: accepted };
  },

  addDepartment: async (organizationId: string, name: string, parentId: string | null = null) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { error } = await supabase.rpc("create_organization_department", {
      target_organization_id: organizationId, department_name: name.trim(), target_parent_id: parentId
    });
    if (error) throw error;
  },
  updateDepartment: async (departmentId: string, name: string, parentId: string | null) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { error } = await supabase.rpc("update_organization_department", {
      target_department_id: departmentId, department_name: name.trim(), target_parent_id: parentId
    });
    if (error) throw error;
  },
  deleteDepartment: async (departmentId: string) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { error } = await supabase.rpc("delete_organization_department", { target_department_id: departmentId });
    if (error) throw error;
  },
  createEmployee: async (data: OrganizationEmployeeDraft) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const [photo, companyLogo] = await Promise.all([
      uploadEmployeeAsset(data.organizationId, "photo", data.photo ?? ""),
      uploadEmployeeAsset(data.organizationId, "logo", data.companyLogo ?? "")
    ]);
    const { data: created, error } = await supabase.rpc("create_organization_employee_card", {
      target_organization_id: data.organizationId, employee_name: data.name.trim(),
      employee_position: data.position.trim(), employee_phone: data.phone.trim(),
      employee_whatsapp: data.whatsapp.trim(), target_department_id: data.departmentId,
      employee_second_phone: data.secondPhone?.trim() ?? "", employee_email: data.email?.trim() ?? "",
      employee_website: data.website?.trim() ?? "", employee_address: data.address?.trim() ?? "",
      employee_telegram: data.telegram?.trim() ?? "", employee_instagram: data.instagram?.trim() ?? "",
      employee_facebook: data.facebook?.trim() ?? "", employee_description: data.description?.trim() ?? "",
      employee_photo: photo, employee_company_logo: companyLogo,
      employee_language: data.language ?? "ru", employee_theme: data.theme ?? "teal",
      employee_template: data.template ?? "executive"
    });
    if (error) throw error;
    return created;
  },
  acceptInvitation: async (code: string) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { data, error } = await supabase.rpc("accept_organization_invitation", { plain_code: code });
    if (error) throw error;
    return String(data);
  },
  removeEmployee: async (assignmentId: string) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { error } = await supabase.rpc("remove_organization_employee", { target_assignment_id: assignmentId });
    if (error) throw error;
  },
  revokeInvitation: async (invitationId: string) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { error } = await supabase.rpc("revoke_organization_invitation", { target_invitation_id: invitationId });
    if (error) throw error;
  },
  updateEmployee: async (data: {
    assignmentId: string; organizationId: string; name: string; position: string; phone: string; whatsapp: string;
    email: string; departmentId?: string | null; isPublic?: boolean; secondPhone?: string;
    website?: string; address?: string; telegram?: string; instagram?: string; facebook?: string;
    description?: string; photo?: string; companyLogo?: string; language?: string; theme?: string; template?: string;
  }) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const [photo, companyLogo] = await Promise.all([
      uploadEmployeeAsset(data.organizationId, "photo", data.photo ?? ""),
      uploadEmployeeAsset(data.organizationId, "logo", data.companyLogo ?? "")
    ]);
    const { error } = await supabase.rpc("update_organization_employee_card", {
      target_assignment_id: data.assignmentId,
      employee_name: data.name.trim(),
      employee_position: data.position.trim(),
      employee_phone: data.phone.trim(),
      employee_whatsapp: data.whatsapp.trim(),
      employee_email: data.email.trim(),
      target_department_id: data.departmentId ?? null,
      employee_second_phone: data.secondPhone?.trim() ?? "", employee_website: data.website?.trim() ?? "",
      employee_address: data.address?.trim() ?? "", employee_telegram: data.telegram?.trim() ?? "",
      employee_instagram: data.instagram?.trim() ?? "", employee_facebook: data.facebook?.trim() ?? "",
      employee_description: data.description?.trim() ?? "", employee_photo: photo,
      employee_company_logo: companyLogo, employee_language: data.language ?? "ru",
      employee_theme: data.theme ?? "teal", employee_template: data.template ?? "executive",
      employee_is_public: data.isPublic ?? true
    });
    if (error) throw error;
  }
};

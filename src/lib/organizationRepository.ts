import { createSlug } from "./cardUtils";
import { supabase } from "./supabase";

export interface OrganizationApplication {
  id: string; displayName: string; legalName: string; organizationType: string;
  phone: string; email: string; planCode: string; employeeLimit: number;
  reviewStatus: string; slug?: string; activeUntil?: string | null;
  contactName?: string; contactPosition?: string;
}
export interface OrganizationDepartment { id: string; name: string; parentId: string | null; }
export interface OrganizationEmployee {
  id: string; kind: "assignment" | "invitation"; profileId?: string; name: string;
  email: string; phone?: string; position: string; departmentId: string | null;
  department: string; status: string; cardSlug?: string;
}
export interface OrganizationWorkspace {
  organization: OrganizationApplication; departments: OrganizationDepartment[]; employees: OrganizationEmployee[];
}

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
      .eq("profile_id", auth.user.id);
    if (membershipError) throw new Error(membershipError.message || "Не удалось загрузить организации.");
    const organizationIds = (memberships ?? []).map((item) => String(item.organization_id));
    if (!organizationIds.length) return [];
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .in("id", organizationIds)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message || "Не удалось загрузить организации.");
    return (data ?? []).map((row) => mapOrganization(row as Record<string, unknown>));
  },

  getCurrentApplication: async (): Promise<OrganizationApplication | null> => {
    const organizations = await organizationRepository.listMine();
    return organizations[0] ?? null;
  },

  getWorkspace: async (organizationId?: string): Promise<OrganizationWorkspace | null> => {
    if (!supabase) return null;
    const organizations = await organizationRepository.listMine();
    const organization = organizations.find((item) => item.id === organizationId) ?? organizations[0];
    if (!organization) return null;
    const { data, error } = await supabase.rpc("get_organization_workspace", { target_organization_id: organization.id });
    if (error) throw new Error(error.message || "Не удалось загрузить рабочий кабинет организации.");
    if (!data) throw new Error("Сервер не вернул данные организации.");
    const payload = data as { organization: Record<string, unknown>; departments: Array<Record<string, unknown>>; employees: Array<Record<string, unknown>>; invitations: Array<Record<string, unknown>>; };
    const departments = (payload.departments ?? []).map((item) => ({ id: String(item.id), name: String(item.name), parentId: item.parent_id ? String(item.parent_id) : null }));
    const accepted = (payload.employees ?? []).map((item) => ({
      id: String(item.id), kind: "assignment" as const, profileId: String(item.profileId ?? ""),
      name: String(item.name ?? ""), email: String(item.email ?? ""), phone: String(item.phone ?? ""),
      position: String(item.position ?? ""),
      departmentId: item.departmentId ? String(item.departmentId) : null,
      department: String(item.department ?? "—"), status: String(item.cardStatus ?? "pending"), cardSlug: String(item.cardSlug ?? "")
    }));
    const invited = (payload.invitations ?? []).map((item) => ({
      id: String(item.id), kind: "invitation" as const, name: String(item.name ?? ""),
      email: String(item.email ?? ""), phone: String(item.phone ?? ""), position: String(item.position ?? ""),
      departmentId: item.departmentId ? String(item.departmentId) : null,
      department: departments.find((department) => department.id === item.departmentId)?.name ?? "—", status: "invited"
    }));
    return { organization: mapOrganization(payload.organization), departments, employees: [...accepted, ...invited] };
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
  inviteEmployee: async (data: { organizationId: string; email: string; name: string; phone: string; position: string; departmentId: string | null; }) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { data: code, error } = await supabase.rpc("invite_organization_employee", {
      target_organization_id: data.organizationId, employee_email: data.email,
      employee_name: data.name, employee_phone: data.phone, employee_position: data.position,
      target_department_id: data.departmentId
    });
    if (error) throw error;
    return String(code);
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
    assignmentId: string; name: string; position: string; phone: string;
    email: string; departmentId?: string | null; isPublic?: boolean;
  }) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { error } = await supabase.rpc("update_organization_employee_card", {
      target_assignment_id: data.assignmentId,
      employee_name: data.name.trim(),
      employee_position: data.position.trim(),
      employee_phone: data.phone.trim(),
      employee_email: data.email.trim(),
      target_department_id: data.departmentId ?? null,
      employee_is_public: data.isPublic ?? true
    });
    if (error) throw error;
  }
};

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
  slug?: string;
  activeUntil?: string | null;
}

export interface OrganizationDepartment {
  id: string;
  name: string;
  parentId: string | null;
}

export interface OrganizationEmployee {
  id: string;
  profileId?: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  departmentId: string | null;
  department: string;
  status: string;
  cardSlug?: string;
}

export interface OrganizationWorkspace {
  organization: OrganizationApplication;
  departments: OrganizationDepartment[];
  employees: OrganizationEmployee[];
}

const mapOrganization = (row: Record<string, unknown>): OrganizationApplication => ({
  id: String(row.id),
  displayName: String(row.display_name),
  legalName: String(row.legal_name),
  organizationType: String(row.organization_type),
  phone: String(row.phone ?? ""),
  email: String(row.email ?? ""),
  planCode: String(row.plan_code ?? ""),
  employeeLimit: Number(row.employee_limit ?? 20),
  reviewStatus: String(row.review_status),
  slug: String(row.slug ?? ""),
  activeUntil: row.active_until ? String(row.active_until) : null
});

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
    return (data ?? []).map((row) => mapOrganization(row as Record<string, unknown>));
  },

  getWorkspace: async (): Promise<OrganizationWorkspace | null> => {
    if (!supabase) return null;
    const organizations = await organizationRepository.listMine();
    const organization = organizations[0];
    if (!organization) return null;
    const { data, error } = await supabase.rpc("get_organization_workspace", {
      target_organization_id: organization.id
    });
    if (error || !data) return { organization, departments: [], employees: [] };
    const payload = data as {
      organization: Record<string, unknown>;
      departments: Array<Record<string, unknown>>;
      employees: Array<Record<string, unknown>>;
      invitations: Array<Record<string, unknown>>;
    };
    const departments = (payload.departments ?? []).map((item) => ({
      id: String(item.id),
      name: String(item.name),
      parentId: item.parent_id ? String(item.parent_id) : null
    }));
    const accepted = (payload.employees ?? []).map((item) => ({
      id: String(item.id),
      profileId: String(item.profileId ?? ""),
      name: String(item.name ?? ""),
      email: String(item.email ?? ""),
      position: String(item.position ?? ""),
      departmentId: item.departmentId ? String(item.departmentId) : null,
      department: String(item.department ?? "—"),
      status: String(item.cardStatus ?? "pending"),
      cardSlug: String(item.cardSlug ?? "")
    }));
    const invited = (payload.invitations ?? []).map((item) => ({
      id: String(item.id),
      name: String(item.name ?? ""),
      email: String(item.email ?? ""),
      phone: String(item.phone ?? ""),
      position: String(item.position ?? ""),
      departmentId: item.departmentId ? String(item.departmentId) : null,
      department: departments.find((department) => department.id === item.departmentId)?.name ?? "—",
      status: "invited"
    }));
    return {
      organization: mapOrganization(payload.organization),
      departments,
      employees: [...accepted, ...invited]
    };
  },

  addDepartment: async (organizationId: string, name: string) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { error } = await supabase.from("departments").insert({
      organization_id: organizationId,
      name: name.trim(),
      slug: `${createSlug(name)}-${String(Date.now()).slice(-4)}`
    });
    if (error) throw error;
  },

  inviteEmployee: async (data: {
    organizationId: string;
    email: string;
    name: string;
    phone: string;
    position: string;
    departmentId: string | null;
  }) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { data: code, error } = await supabase.rpc("invite_organization_employee", {
      target_organization_id: data.organizationId,
      employee_email: data.email,
      employee_name: data.name,
      employee_phone: data.phone,
      employee_position: data.position,
      target_department_id: data.departmentId
    });
    if (error) throw error;
    return String(code);
  },

  acceptInvitation: async (code: string) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { data, error } = await supabase.rpc("accept_organization_invitation", {
      plain_code: code
    });
    if (error) throw error;
    return String(data);
  },

  removeEmployee: async (assignmentId: string) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { error } = await supabase.from("employee_assignments").delete().eq("id", assignmentId);
    if (error) throw error;
  },

  updateEmployee: async (assignmentId: string, position: string) => {
    if (!supabase) throw new Error("Сервер недоступен.");
    const { error } = await supabase.from("employee_assignments").update({ position }).eq("id", assignmentId);
    if (error) throw error;
  }
};

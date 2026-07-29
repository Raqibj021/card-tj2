import { supabase } from "./supabase";

export interface DirectoryProfile {
  id: string;
  slug: string;
  name: string;
  role: string;
  organization: string;
  address: string;
  photo: string;
  categorySlug: string;
}

export const directoryRepository = {
  list: async (): Promise<DirectoryProfile[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("cards")
      .select("id, slug, full_name, position, organization_name, address, photo_path, profession_categories(slug)")
      .eq("review_status", "approved")
      .in("visibility", ["public", "public_organization"])
      .order("published_at", { ascending: false });
    if (error) return [];
    return (data ?? []).map((row) => {
      const relation = row.profession_categories as unknown;
      const category = Array.isArray(relation) ? relation[0] : relation;
      return {
        id: String(row.id),
        slug: String(row.slug),
        name: String(row.full_name),
        role: String(row.position ?? ""),
        organization: String(row.organization_name ?? ""),
        address: String(row.address ?? ""),
        photo: String(row.photo_path ?? ""),
        categorySlug: String((category as { slug?: string } | null)?.slug ?? "")
      };
    });
  }
};

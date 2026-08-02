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
  specialistTitle: string;
  city: string;
  tags: string[];
  experience: string;
  summary: string;
}

export const directoryRepository = {
  list: async (): Promise<DirectoryProfile[]> => {
    if (!supabase) return [];
    const primary = await supabase
      .from("cards")
      .select("id, slug, full_name, position, organization_name, address, photo_path, specialist_title, specialist_city, specialist_tags, specialist_experience, specialist_summary, profession_categories(slug)")
      .eq("review_status", "approved")
      .in("visibility", ["public", "public_organization"])
      .order("published_at", { ascending: false });
    let rows = primary.data as unknown as Record<string, unknown>[] | null;
    let error = primary.error;
    if (error) {
      const fallback = await supabase
        .from("cards")
        .select("id, slug, full_name, position, organization_name, address, photo_path, profession_categories(slug)")
        .eq("review_status", "approved")
        .in("visibility", ["public", "public_organization"])
        .order("published_at", { ascending: false });
      rows = fallback.data as unknown as Record<string, unknown>[] | null;
      error = fallback.error;
    }
    if (error) return [];
    return (rows ?? []).map((row) => {
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
        ,specialistTitle: String(row.specialist_title ?? row.position ?? "")
        ,city: String(row.specialist_city ?? "")
        ,tags: Array.isArray(row.specialist_tags) ? row.specialist_tags.map(String) : []
        ,experience: String(row.specialist_experience ?? "")
        ,summary: String(row.specialist_summary ?? "")
      };
    });
  }
};

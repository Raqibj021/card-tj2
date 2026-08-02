import { supabase } from "./supabase";
import { createUuid } from "./id";

export interface ProfessionCategory {
  id: string;
  name: string;
  requiresLicense: boolean;
}

export interface SpecialistSubmission {
  cardId: string;
  categoryId: string;
  title: string;
  city: string;
  tags: string[];
  experience: string;
  summary: string;
  files: File[];
}

export const verificationRepository = {
  categories: async (language: "ru" | "tj" | "en"): Promise<ProfessionCategory[]> => {
    if (!supabase) return [];
    const column = language === "tj" ? "name_tj" : language === "en" ? "name_en" : "name_ru";
    const { data, error } = await supabase
      .from("profession_categories")
      .select(`id, ${column}, requires_license`)
      .eq("enabled", true)
      .order(column);
    if (error) return [];
    return (data ?? []).map((row) => ({
      id: String(row.id),
      name: String(row[column as keyof typeof row]),
      requiresLicense: Boolean(row.requires_license)
    }));
  },

  submit: async (cardId: string, categoryId: string, files: File[]) => {
    if (!supabase) throw new Error("Сервер временно недоступен.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Сначала войдите в аккаунт.");
    const paths: string[] = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${auth.user.id}/${cardId}/${createUuid()}-${safeName}`;
      const { error } = await supabase.storage
        .from("verification-documents")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      paths.push(path);
    }
    const { error: cardError } = await supabase
      .from("cards")
      .update({ profession_category_id: categoryId, review_status: "pending" })
      .eq("id", cardId);
    if (cardError) throw cardError;
    const { error } = await supabase.from("verification_requests").insert({
      profile_id: auth.user.id,
      card_id: cardId,
      document_paths: paths,
      status: "pending"
    });
    if (error) throw error;
  }
  ,submitSpecialist: async (submission: SpecialistSubmission) => {
    if (!supabase) throw new Error("Сервер временно недоступен.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Сначала войдите в аккаунт.");
    const paths: string[] = [];
    for (const file of submission.files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${auth.user.id}/${submission.cardId}/${createUuid()}-${safeName}`;
      const { error } = await supabase.storage.from("verification-documents").upload(path, file, { contentType: file.type });
      if (error) throw error;
      paths.push(path);
    }
    const tags = submission.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
    const { error: cardError } = await supabase.from("cards").update({
      profession_category_id: submission.categoryId,
      specialist_title: submission.title.trim(),
      specialist_city: submission.city.trim(),
      specialist_tags: tags,
      specialist_experience: submission.experience.trim(),
      specialist_summary: submission.summary.trim(),
      review_status: "pending"
    }).eq("id", submission.cardId).eq("owner_id", auth.user.id);
    if (cardError) throw cardError;
    const { error } = await supabase.from("verification_requests").insert({
      profile_id: auth.user.id,
      card_id: submission.cardId,
      document_paths: paths,
      status: "pending"
    });
    if (error) throw error;
  }
};

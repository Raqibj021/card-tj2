import { supabase } from "./supabase";
import { createUuid } from "./id";

export interface ProfessionCategory {
  id: string;
  name: string;
  slug: string;
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
  plan: "specialist" | "pro";
  serviceArea: string;
  consultation: string;
  portfolio: File[];
}

const optimizePortfolioImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith("image/")) return file;
  if (!("createImageBitmap" in window)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const maxSide = 2200;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); return file; }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const toBlob = (quality: number) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  let blob = await toBlob(.9);
  if (blob && blob.size > 5 * 1024 * 1024) blob = await toBlob(.82);
  if (!blob || (blob.size >= file.size && file.size <= 5 * 1024 * 1024)) return file;
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "portfolio"}.webp`, { type: "image/webp", lastModified: Date.now() });
};

export const verificationRepository = {
  categories: async (language: "ru" | "tj" | "en"): Promise<ProfessionCategory[]> => {
    if (!supabase) throw new Error("Сервер категорий временно недоступен.");
    const { data, error } = await supabase.rpc("get_enabled_profession_categories", { language_code: language });
    if (error) throw new Error(`Не удалось загрузить категории: ${error.message}`);
    return (data ?? []).map((row: { id: string; name: string; slug?: string; requires_license: boolean }) => ({
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug ?? ""),
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
    const portfolioPaths: string[] = [];
    if (submission.plan === "pro") {
      for (const source of submission.portfolio.slice(0, 20)) {
        const file = await optimizePortfolioImage(source);
        if (file.size > 5 * 1024 * 1024) throw new Error(`Не удалось оптимизировать ${source.name} до 5 МБ.`);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${auth.user.id}/${submission.cardId}/portfolio/${createUuid()}-${safeName}`;
        const { error } = await supabase.storage.from("card-assets").upload(path, file, { contentType: file.type });
        if (error) throw error;
        portfolioPaths.push(supabase.storage.from("card-assets").getPublicUrl(path).data.publicUrl);
      }
    }
    const { error } = await supabase.rpc("submit_specialist_profile", {
      target_card_id: submission.cardId, target_category_id: submission.categoryId,
      professional_title: submission.title.trim(), professional_city: submission.city.trim(),
      professional_tags: tags, professional_experience: submission.experience.trim(),
      professional_summary: submission.summary.trim(), selected_plan: submission.plan,
      service_area: submission.serviceArea.trim(), consultation_format: submission.consultation.trim(),
      portfolio_urls: portfolioPaths, document_paths: paths
    });
    if (error) throw error;
  }
  ,setDirectoryVisibility: async (cardId: string, action: "hide" | "show" | "remove") => {
    if (!supabase) throw new Error("Сервер временно недоступен.");
    const { data, error } = await supabase.rpc("set_specialist_directory_visibility", {
      target_card_id: cardId,
      requested_action: action
    });
    if (error) throw error;
    return data;
  }
};

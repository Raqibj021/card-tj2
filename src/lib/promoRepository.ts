import { supabase } from "./supabase";

export type LaunchPromoStatus = {
  remaining: number;
  limit: number;
  claimed: boolean;
  placeNumber: number | null;
  expiresAt: string | null;
  eligible: boolean;
  hasEntitlement: boolean;
};

const fallback: LaunchPromoStatus = {
  remaining: 0,
  limit: 50,
  claimed: false,
  placeNumber: null,
  expiresAt: null,
  eligible: false,
  hasEntitlement: false
};

export const promoRepository = {
  async status(): Promise<LaunchPromoStatus> {
    if (!supabase) return fallback;
    const { data, error } = await supabase.rpc("get_launch_promo_status");
    if (error) throw error;
    return { ...fallback, ...(data as LaunchPromoStatus) };
  },

  async claim(cardId: string): Promise<LaunchPromoStatus> {
    if (!supabase) throw new Error("Сервер временно недоступен.");
    const { data, error } = await supabase.rpc("claim_launch_promo_for_card", {
      target_card_id: cardId
    });
    if (error) throw error;
    return { ...fallback, ...(data as LaunchPromoStatus) };
  }
};

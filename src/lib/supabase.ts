import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storageKey: "vizora-user-auth",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;


/**
 * The administration area deliberately uses its own auth storage.
 * Signing in or out here must never replace the customer's website session.
 */
export const adminSupabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        storageKey: "vizora-admin-auth",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    })
  : null;

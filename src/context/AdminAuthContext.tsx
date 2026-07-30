import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { adminSupabase } from "../lib/supabase";
import type { AccountProfile, AccountRole } from "./AuthContext";

interface AdminAuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AccountProfile | null;
  loading: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const loadAdminProfile = async (user: User | null): Promise<AccountProfile | null> => {
  if (!adminSupabase || !user) return null;
  const { data } = await adminSupabase
    .from("profiles")
    .select("id, full_name, email, phone, role, preferred_language, identity_verified_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return {
    id: String(data.id),
    fullName: String(data.full_name ?? ""),
    email: String(data.email ?? user.email ?? ""),
    phone: String(data.phone ?? ""),
    role: (data.role as AccountRole) ?? "user",
    preferredLanguage:
      data.preferred_language === "tj" || data.preferred_language === "en"
        ? data.preferred_language
        : "ru",
    identityVerifiedAt: data.identity_verified_at
      ? String(data.identity_verified_at)
      : null
  };
};

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = async (nextSession: Session | null) => {
    setSession(nextSession);
    setProfile(await loadAdminProfile(nextSession?.user ?? null));
    setLoading(false);
  };

  const refreshProfile = async () => {
    setProfile(await loadAdminProfile(session?.user ?? null));
  };

  useEffect(() => {
    if (!adminSupabase) {
      setLoading(false);
      return;
    }
    let active = true;
    void adminSupabase.auth.getSession().then(({ data }) => {
      if (active) void applySession(data.session);
    });
    const { data: listener } = adminSupabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) void applySession(nextSession);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AdminAuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      refreshProfile,
      signOut: async () => {
        if (adminSupabase) await adminSupabase.auth.signOut();
      }
    }),
    [session, profile, loading]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return context;
}

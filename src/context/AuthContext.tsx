import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { supabase } from "../lib/supabase";

export type AccountRole = "user" | "moderator" | "admin";

export interface AccountProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: AccountRole;
  preferredLanguage: "ru" | "tj" | "en";
  identityVerifiedAt: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AccountProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const loadProfile = async (user: User | null): Promise<AccountProfile | null> => {
  if (!supabase || !user) return null;
  const { data } = await supabase
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    setProfile(await loadProfile(session?.user ?? null));
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;
    let active = true;

    const applySession = async (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      const nextProfile = await loadProfile(nextSession?.user ?? null);
      if (!active) return;
      setProfile(nextProfile);
      setLoading(false);
    };

    const restoreStoredSession = async () => {
      const { data, error } = await client.auth.getSession();
      if (!active) return;
      if (error) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }
      await applySession(data.session);
    };

    void restoreStoredSession();

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });

    const restoreWhenVisible = () => {
      if (document.visibilityState === "visible") void restoreStoredSession();
    };
    document.addEventListener("visibilitychange", restoreWhenVisible);
    window.addEventListener("focus", restoreStoredSession);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", restoreWhenVisible);
      window.removeEventListener("focus", restoreStoredSession);
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      isModerator: profile?.role === "moderator" || profile?.role === "admin",
      refreshProfile,
      signOut: async () => {
        if (supabase) await supabase.auth.signOut();
      }
    }),
    [session, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

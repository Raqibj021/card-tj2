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

    void client.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      setProfile(await loadProfile(data.session?.user ?? null));
      setLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void loadProfile(nextSession?.user ?? null).then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setLoading(false);
      });
    });

    return () => {
      active = false;
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

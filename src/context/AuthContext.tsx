import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
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
  refreshSession: () => Promise<Session | null>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_TIMEOUT_MS = 6000;

function timeout<T>(work: PromiseLike<T>, delay = SESSION_TIMEOUT_MS) {
  let timer: number | undefined;
  return Promise.race([
    Promise.resolve(work),
    new Promise<T>((_, reject) => {
      timer = window.setTimeout(() => reject(new Error("session-timeout")), delay);
    })
  ]).finally(() => {
    if (timer !== undefined) window.clearTimeout(timer);
  });
}

async function loadProfile(user: User): Promise<AccountProfile | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await timeout(
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, role, preferred_language, identity_verified_at")
        .eq("id", user.id)
        .maybeSingle()
    );
    if (error || !data) return null;
    return {
      id: String(data.id),
      fullName: String(data.full_name ?? user.user_metadata?.full_name ?? ""),
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
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    if (!supabase) {
      setSession(null);
      setLoading(false);
      return null;
    }
    try {
      const { data, error } = await timeout(supabase.auth.getSession());
      const nextSession = error ? null : data.session;
      setSession(nextSession);
      return nextSession;
    } catch {
      setSession(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUser = session?.user ?? null;
    setProfile(currentUser ? await loadProfile(currentUser) : null);
  }, [session?.user]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    const client = supabase;

    void client.auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        setSession(error ? null : data.session);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSession(null);
        setLoading(false);
      });

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      // Only update auth state here. Database requests are performed separately.
      setSession(nextSession);
      setLoading(false);
    });

    const fallback = window.setTimeout(() => {
      if (active) setLoading(false);
    }, SESSION_TIMEOUT_MS);

    return () => {
      active = false;
      window.clearTimeout(fallback);
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    const currentUser = session?.user ?? null;
    if (!currentUser) {
      setProfile(null);
      return () => {
        active = false;
      };
    }
    void loadProfile(currentUser).then((nextProfile) => {
      if (active) setProfile(nextProfile);
    });
    return () => {
      active = false;
    };
  }, [session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      isModerator: profile?.role === "moderator" || profile?.role === "admin",
      refreshSession,
      refreshProfile,
      signOut: async () => {
        if (!supabase) return;
        await supabase.auth.signOut({ scope: "local" });
        setSession(null);
        setProfile(null);
      }
    }),
    [session, profile, loading, refreshSession, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

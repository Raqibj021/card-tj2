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

const AUTH_TIMEOUT_MS = 8000;

async function withTimeout<T>(work: PromiseLike<T>, timeoutMs = AUTH_TIMEOUT_MS) {
  let timeoutId: number | undefined;
  try {
    return await Promise.race([
      Promise.resolve(work),
      new Promise<T>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error("auth-timeout")),
          timeoutMs
        );
      })
    ]);
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  }
}

const loadProfile = async (user: User | null): Promise<AccountProfile | null> => {
  if (!supabase || !user) return null;
  const { data } = await withTimeout(
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, preferred_language, identity_verified_at")
      .eq("id", user.id)
      .maybeSingle()
  );
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
      try {
        const nextProfile = await loadProfile(nextSession?.user ?? null);
        if (active) setProfile(nextProfile);
      } catch {
        // A profile request must never block access to login or the dashboard.
        if (active) setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    const restoreStoredSession = async () => {
      try {
        const { data, error } = await withTimeout(client.auth.getSession());
        if (!active) return;
        if (error) {
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (data.session) {
          const { data: userData, error: userError } = await withTimeout(
            client.auth.getUser(data.session.access_token)
          );
          if (!active) return;
          if (userError || !userData.user) {
            setSession(null);
            setProfile(null);
            setLoading(false);
            void client.auth.signOut({ scope: "local" });
            return;
          }
        }

        await applySession(data.session);
      } catch {
        // Network trouble or a stale browser token must not leave a black screen.
        if (active) setLoading(false);
      }
    };

    void restoreStoredSession();

    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      // Defer database work until Supabase releases its internal auth lock.
      window.setTimeout(() => {
        if (active) void applySession(nextSession);
      }, 0);
    });

    const loadingFallback = window.setTimeout(() => {
      if (active) setLoading(false);
    }, AUTH_TIMEOUT_MS + 1000);

    const restoreWhenVisible = () => {
      if (document.visibilityState === "visible") void restoreStoredSession();
    };
    document.addEventListener("visibilitychange", restoreWhenVisible);
    window.addEventListener("focus", restoreStoredSession);

    return () => {
      active = false;
      window.clearTimeout(loadingFallback);
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

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  clearLocalPortalAuth,
  findLocalDemoAccount,
  isLocalPortalDemo,
  readLocalPortalAuth,
  toLocalPortalAuth,
  writeLocalPortalAuth,
} from "@/lib/portal/local-demo";

export type { Profile, ProfileRole } from "@/lib/portal/local-demo";
import type { Profile } from "@/lib/portal/local-demo";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  doctorId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<Profile>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function applyLocalAuth(
  auth: ReturnType<typeof toLocalPortalAuth>,
  setUser: (u: User | null) => void,
  setSession: (s: Session | null) => void,
  setProfile: (p: Profile | null) => void,
  setDoctorId: (id: string | null) => void,
) {
  setSession(auth.session);
  setUser(auth.user);
  setProfile(auth.profile);
  setDoctorId(auth.doctorId);
}

async function loadProfile(userId: string): Promise<{ profile: Profile; doctorId: string | null }> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!profile) {
    throw new Error("No profile found for this account. Ask an administrator to assign a role.");
  }

  let doctorId: string | null = null;
  if (profile.role === "doctor") {
    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("profile_id", userId)
      .maybeSingle();
    doctorId = doctor?.id ?? null;
  }

  return { profile, doctorId };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Always start empty so SSR HTML matches the first client paint. Reading
  // localStorage here crashes React 19 (hydration mismatch → error page).
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async (next: Session | null) => {
    setSession(next);
    setUser(next?.user ?? null);
    if (!next?.user) {
      setProfile(null);
      setDoctorId(null);
      return;
    }
    const loaded = await loadProfile(next.user.id);
    setProfile(loaded.profile);
    setDoctorId(loaded.doctorId);
  }, []);

  const refresh = useCallback(async () => {
    if (isLocalPortalDemo()) {
      const local = readLocalPortalAuth();
      if (local) applyLocalAuth(local, setUser, setSession, setProfile, setDoctorId);
      else {
        setSession(null);
        setUser(null);
        setProfile(null);
        setDoctorId(null);
      }
      return;
    }
    const { data } = await supabase.auth.getSession();
    await applySession(data.session);
  }, [applySession]);

  useEffect(() => {
    let mounted = true;
    if (isLocalPortalDemo()) {
      const local = readLocalPortalAuth();
      if (local && mounted) applyLocalAuth(local, setUser, setSession, setProfile, setDoctorId);
      if (mounted) setLoading(false);
      return () => {
        mounted = false;
      };
    }

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        await applySession(data.session);
      } catch (err) {
        console.error("[portal auth]", err);
        if (mounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setDoctorId(null);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        try {
          await applySession(nextSession);
        } catch (err) {
          console.error("[portal auth]", err);
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (isLocalPortalDemo()) {
      const account = findLocalDemoAccount(email, password);
      if (!account) throw new Error("Invalid login credentials");
      const auth = toLocalPortalAuth(account);
      writeLocalPortalAuth(auth);
      applyLocalAuth(auth, setUser, setSession, setProfile, setDoctorId);
      return auth.profile;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Sign-in failed.");
    const loaded = await loadProfile(data.user.id);
    setSession(data.session);
    setUser(data.user);
    setProfile(loaded.profile);
    setDoctorId(loaded.doctorId);
    return loaded.profile;
  }, []);

  const signOut = useCallback(async () => {
    if (isLocalPortalDemo()) {
      clearLocalPortalAuth();
    } else {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setDoctorId(null);
  }, []);

  const value = useMemo(
    () => ({ user, session, profile, doctorId, loading, signIn, signOut, refresh }),
    [user, session, profile, doctorId, loading, signIn, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase, apiBaseUrl, type User, type Session } from "@/integrations/supabase/client";

interface CommitteeMember {
  id: string;
  name: string;
  position: string;
  phone: string | null;
  image_url: string | null;
  display_order: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  committeeMember: CommitteeMember | null;
  committeeToken: string | null;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  committeeLogin: (member: CommitteeMember, token?: string) => void;
  committeeLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [committeeMember, setCommitteeMember] = useState<CommitteeMember | null>(() => {
    const stored = sessionStorage.getItem("committeeMember");
    return stored ? JSON.parse(stored) : null;
  });
  const [committeeToken, setCommitteeToken] = useState<string | null>(() => sessionStorage.getItem("committeeToken"));

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata, emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      try {
        const res = await fetch(`${apiBaseUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const payload = await res.json().catch(() => ({}));
        if (res.ok && payload?.session?.access_token) {
          const token = payload.session.access_token as string;
          setCommitteeToken(token);
          sessionStorage.setItem("committeeToken", token);
        }
      } catch {
        // Ignore backend auth issues; Supabase sign-in still succeeded.
      }
    }
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCommitteeMember(null);
    setCommitteeToken(null);
    sessionStorage.removeItem("committeeMember");
    sessionStorage.removeItem("committeeToken");
  };

  const resetPassword = async (email: string) => {
    try {
      const res = await fetch(`${apiBaseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || "Unable to request a password reset");
      return { error: null };
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const committeeLogin = (member: CommitteeMember, token?: string) => {
    setCommitteeMember(member);
    sessionStorage.setItem("committeeMember", JSON.stringify(member));
    if (token) {
      setCommitteeToken(token);
      sessionStorage.setItem("committeeToken", token);
    }
  };

  const committeeLogout = () => {
    setCommitteeMember(null);
    setCommitteeToken(null);
    sessionStorage.removeItem("committeeMember");
    sessionStorage.removeItem("committeeToken");
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, committeeMember, committeeToken, signUp, signIn, signOut, resetPassword, committeeLogin, committeeLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

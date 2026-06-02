import type { Session, User, UserIdentity } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getGoals } from "../api/goals";
import { getProfile } from "../api/profile";
import { formatAuthNetworkError } from "../lib/env";
import {
  clearOAuthHashFromUrl,
  fetchUserIdentities,
  formatOAuthCallbackError,
  hasGoogleIdentity,
} from "../lib/identities";
import { supabase } from "../lib/supabase";
import type { UserGoals } from "../types/goals";
import type { Profile } from "../types/profile";

type AuthState = {
  session: Session | null;
  user: User | null;
  goals: UserGoals | null;
  profile: Profile | null;
  loading: boolean;
  goalsLoading: boolean;
  profileLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  resendSignupConfirmation: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  linkGoogleAccount: () => Promise<void>;
  identities: UserIdentity[];
  googleLinked: boolean;
  signOut: () => Promise<void>;
  refreshGoals: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  refreshIdentities: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [identities, setIdentities] = useState<UserIdentity[]>([]);

  const refreshIdentities = useCallback(async () => {
    try {
      const list = await fetchUserIdentities();
      setIdentities(list);
    } catch {
      setIdentities([]);
    }
  }, []);

  const loadGoals = useCallback(async (userId: string) => {
    setGoalsLoading(true);
    try {
      const data = await getGoals(userId);
      setGoals(data);
    } finally {
      setGoalsLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    setProfileLoading(true);
    try {
      const data = await getProfile(userId);
      setProfile(data);
      return data;
    } catch (err) {
      console.warn("Profile load failed:", err);
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshGoals = useCallback(async () => {
    if (!session?.user.id) return;
    await loadGoals(session.user.id);
  }, [loadGoals, session?.user.id]);

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (!session?.user.id) return null;
    return loadProfile(session.user.id);
  }, [loadProfile, session?.user.id]);

  useEffect(() => {
    const oauthError = formatOAuthCallbackError();
    if (oauthError) {
      clearOAuthHashFromUrl();
      console.warn("OAuth error:", oauthError);
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
      })
      .catch(() => {
        // Network / config errors surface on sign-in attempt
      })
      .finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      void refreshIdentities();
    } else {
      setIdentities([]);
    }
  }, [session?.user?.id, refreshIdentities]);

  useEffect(() => {
    if (!session?.user.id) {
      setGoals(null);
      setProfile(null);
      return;
    }
    void loadGoals(session.user.id);
    void loadProfile(session.user.id);
  }, [session?.user.id, loadGoals, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes("email not confirmed")) {
          throw new Error(
            "Email not confirmed yet. Confirm via the link in your inbox, or turn off “Confirm email” in Supabase (Authentication → Providers → Email) for local dev.",
          );
        }
        throw error;
      }
    } catch (err) {
      throw new Error(formatAuthNetworkError(err));
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        ...(displayName ? { data: { display_name: displayName } } : {}),
      },
    });
    if (error) throw error;
    // No session = Supabase is waiting for email confirmation
    return { needsEmailConfirmation: !data.session };
  }, []);

  const resendSignupConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
  }, []);

  const googleOAuthOptions = {
    redirectTo: `${window.location.origin}/`,
    queryParams: { prompt: "select_account" as const },
  };

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: googleOAuthOptions,
      });
      if (error) throw error;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists")) {
        throw new Error(
          "An account with this email already exists. Sign in with your password first, then use Connect Google in the app.",
        );
      }
      throw new Error(formatAuthNetworkError(err));
    }
  }, []);

  /** Link Google to the current user (enable Manual linking in Supabase Auth settings). */
  const linkGoogleAccount = useCallback(async () => {
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: googleOAuthOptions,
      });
      if (error) throw error;
    } catch (err) {
      throw new Error(formatAuthNetworkError(err));
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setGoals(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      goals,
      profile,
      loading,
      goalsLoading,
      profileLoading,
      signIn,
      signUp,
      resendSignupConfirmation,
      signInWithGoogle,
      linkGoogleAccount,
      identities,
      googleLinked: hasGoogleIdentity(identities),
      signOut,
      refreshGoals,
      refreshProfile,
      refreshIdentities,
    }),
    [
      session,
      goals,
      profile,
      loading,
      goalsLoading,
      profileLoading,
      identities,
      signIn,
      signUp,
      resendSignupConfirmation,
      signInWithGoogle,
      linkGoogleAccount,
      signOut,
      refreshGoals,
      refreshProfile,
      refreshIdentities,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

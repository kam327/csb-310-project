"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

interface Profile {
  id: string;
  club_id: string;
  role: string | null;
  display_name: string | null;
  email: string | null;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  signInWithEmail: (
    email: string,
    password: string,
    mode: "signin"
  ) => Promise<{ error?: Error }>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName: string,
    clubChoice: ClubChoice
  ) => Promise<{ error?: Error }>;
  completeClubSetup: (clubChoice: ClubChoice) => Promise<{ error?: Error }>;
  refreshProfile: () => Promise<void>;
  resetAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export type ClubChoice =
  | { type: "join"; joinCode: string }
  | { type: "create"; clubName: string; universityName?: string };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const resetAuthLocal = async () => {
    try {
      // Try to clear server-side session (best effort)
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    try {
      clearSupabaseAuthStorage();
    } catch {
      // ignore
    }
    setSession(null);
    setProfile(null);
  };

  useEffect(() => {
    let mounted = true;
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(session ?? null);
      if (session?.user) {
        try {
          // Validate the session against the server. If the auth user was deleted
          // (or session is otherwise invalid), you'll see FK errors when creating a profile.
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          if (userErr || !userData?.user) {
            await resetAuthLocal();
            setProfileError(
              "Your login session was stale (auth user missing). We cleared it — please sign in or sign up again."
            );
            setLoading(false);
            return;
          }
          setProfileError(null);
          const p = await loadProfile(session.user.id);
          setProfile(p);
        } catch (e) {
          setProfileError((e as Error).message ?? "Failed to load profile.");
        }
      }
      setLoading(false);
    }
    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session ?? null);
      if (session?.user) {
        try {
          setProfileError(null);
          const p = await loadProfile(session.user.id);
          setProfile(p);
        } catch (e) {
          setProfileError((e as Error).message ?? "Failed to load profile.");
        }
      } else {
        setProfile(null);
        setProfileError(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    profileError,
    loading,
    signInWithEmail: async (
      email: string,
      password: string,
      _mode: "signin"
    ) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { error };
        if (data.session) {
          setSession(data.session);
          try {
            setProfileError(null);
            const p = await loadProfile(data.session.user.id);
            setProfile(p);
          } catch (e) {
            setProfileError((e as Error).message ?? "Failed to load profile.");
          }
        }
        return {};
      } catch (e) {
        return { error: e as Error };
      }
    },
    signUpWithEmail: async (
      email: string,
      password: string,
      displayName: string,
      clubChoice: ClubChoice
    ) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) return { error };

        // If email confirmation is enabled, data.session can be null until confirmed.
        if (!data.session) {
          return {};
        }

        setSession(data.session);
        try {
          setProfileError(null);
          const res = await applyClubChoice(
            data.session.user.id,
            clubChoice,
            data.user?.email ?? data.session.user.email ?? null,
            displayName
          );
          setProfile(res.profile);
        } catch (e) {
          setProfileError((e as Error).message ?? "Failed to set up club.");
        }
        return {};
      } catch (e) {
        return { error: e as Error };
      }
    },
    completeClubSetup: async (clubChoice: ClubChoice) => {
      try {
        const userId = session?.user?.id;
        if (!userId) return { error: new Error("Not signed in.") };
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) {
          await resetAuthLocal();
          return {
            error: new Error(
              "Your session was stale (auth user missing). We cleared it — please sign in or sign up again."
            ),
          };
        }
        setProfileError(null);
        const res = await applyClubChoice(
          userId,
          clubChoice,
          userData.user.email ?? null
        );
        setProfile(res.profile);
        return {};
      } catch (e) {
        return { error: e as Error };
      }
    },
    refreshProfile: async () => {
      const userId = session?.user?.id;
      if (!userId) return;
      setProfileError(null);
      const p = await loadProfile(userId);
      setProfile(p);
    },
    resetAuth: async () => {
      await resetAuthLocal();
    },
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("id, club_id, role, display_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      error.message ??
        "Profile read failed. Ensure RLS has a SELECT policy on public.users for authenticated users."
    );
  }

  return data ? (data as Profile) : null;
}

function normalizeJoinCode(code: string): string {
  return code.trim().toUpperCase();
}

function generateJoinCode(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

async function applyClubChoice(
  userId: string,
  choice: ClubChoice,
  email: string | null,
  displayName?: string
): Promise<{ profile: Profile; joinCode?: string }> {
  let clubId: string;
  let createdJoinCode: string | undefined;

  if (choice.type === "join") {
    const joinCode = normalizeJoinCode(choice.joinCode);
    const { data: club, error } = await supabase
      .from("clubs")
      .select("id")
      .eq("join_code", joinCode)
      .single();
    if (error || !club) {
      throw new Error(error?.message ?? "Invalid join code.");
    }
    clubId = club.id as string;
  } else {
    const joinCode = generateJoinCode();
    const { data: club, error } = await supabase
      .from("clubs")
      .insert({
        name: choice.clubName.trim(),
        university_name: choice.universityName?.trim() || null,
        join_code: joinCode,
      })
      .select("id")
      .single();
    if (error || !club) {
      throw new Error(error?.message ?? "Failed to create club.");
    }
    clubId = club.id as string;
    createdJoinCode = joinCode;
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .upsert(
      {
        id: userId,
        club_id: clubId,
        role: "officer",
        email,
        display_name: displayName?.trim() || null,
      },
      { onConflict: "id" }
    )
    .select("id, club_id, role")
    .single();

  if (profileError || !profile) {
    const msg = profileError?.message ?? "Failed to create user profile.";
    if (msg.toLowerCase().includes("violates foreign key constraint")) {
      throw new Error(
        `${msg} — this usually means the auth user for this session doesn't exist in this Supabase project's auth.users (stale session or wrong project). Use “Start over” and sign up again.`
      );
    }
    throw new Error(msg);
  }

  return { profile: profile as Profile, joinCode: createdJoinCode };
}

function getProjectRefFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname; // <ref>.supabase.co
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

function clearSupabaseAuthStorage(): void {
  if (typeof window === "undefined") return;
  const ref = getProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (!ref) return;
  const prefix = `sb-${ref}-`;
  try {
    // Remove all keys for this Supabase project (auth token, code verifier, etc.)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

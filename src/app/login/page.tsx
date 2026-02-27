"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type ClubChoice } from "@/components/AuthProvider";

const SIGN_IN_TIMEOUT_MS = 15000;

export default function LoginPage() {
  const { signInWithEmail, signUpWithEmail, session, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [clubMode, setClubMode] = useState<"join" | "create">("join");
  const [joinCode, setJoinCode] = useState("");
  const [clubName, setClubName] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect when we have a session (let AuthProvider update first, then redirect)
  useEffect(() => {
    if (!loading && session) {
      router.replace("/");
    }
  }, [loading, session, router]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    // Unstick button if request hangs (wrong URL, network, etc.)
    timeoutRef.current = setTimeout(() => {
      setStatus("idle");
      setError(
        "Request timed out. Check that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set correctly in .env.local (use the anon public key from Supabase → Settings → API)."
      );
    }, SIGN_IN_TIMEOUT_MS);

    try {
      const choice: ClubChoice =
        clubMode === "join"
          ? { type: "join", joinCode }
          : { type: "create", clubName, universityName };

      const result =
        mode === "signin"
          ? await signInWithEmail(email.trim(), password, "signin")
          : await signUpWithEmail(email.trim(), password, fullName.trim(), choice);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (result.error) {
        setStatus("idle");
        setError(result.error.message ?? "Something went wrong.");
        return;
      }
      // Don't redirect here — session will update via onAuthStateChange, then useEffect above will redirect
      setStatus("idle");
    } catch (err) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setStatus("idle");
      setError((err as Error).message ?? "Something went wrong.");
    }
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-forest-800 bg-forest-900/80 p-6 shadow-xl">
        <h1 className="text-xl font-bold text-white">
          {mode === "signin" ? "Sign in to Gauge" : "Create your Gauge account"}
        </h1>
        <p className="mt-2 text-sm text-forest-300">
          Use your club email and a password. You can change auth settings later in Supabase.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-forest-300"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
              placeholder="you@university.edu"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-forest-300"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
              placeholder="••••••••"
            />
          </div>
          {mode === "signup" && (
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-forest-300"
              >
                Your name
              </label>
              <input
                id="fullName"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                placeholder="e.g. Alex Chen"
              />
            </div>
          )}
          {mode === "signup" && (
            <div className="rounded-xl border border-forest-800 bg-forest-950/40 p-4">
              <p className="text-sm font-semibold text-white">Club</p>
              <p className="mt-1 text-xs text-forest-300">
                Join an existing club with a join code, or create a new club.
              </p>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setClubMode("join")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    clubMode === "join"
                      ? "bg-gauge-500/20 text-gauge-300"
                      : "bg-forest-900/60 text-forest-300 hover:bg-forest-800"
                  }`}
                >
                  Join with code
                </button>
                <button
                  type="button"
                  onClick={() => setClubMode("create")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    clubMode === "create"
                      ? "bg-gauge-500/20 text-gauge-300"
                      : "bg-forest-900/60 text-forest-300 hover:bg-forest-800"
                  }`}
                >
                  Create new club
                </button>
              </div>

              {clubMode === "join" ? (
                <div className="mt-3">
                  <label
                    htmlFor="joinCode"
                    className="block text-sm font-medium text-forest-300"
                  >
                    Join code
                  </label>
                  <input
                    id="joinCode"
                    type="text"
                    required
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                    placeholder="e.g. 8F3A1C2B"
                  />
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <div>
                    <label
                      htmlFor="clubName"
                      className="block text-sm font-medium text-forest-300"
                    >
                      Club name
                    </label>
                    <input
                      id="clubName"
                      type="text"
                      required
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                      placeholder="e.g. Product Club"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="universityName"
                      className="block text-sm font-medium text-forest-300"
                    >
                      University (optional)
                    </label>
                    <input
                      id="universityName"
                      type="text"
                      value={universityName}
                      onChange={(e) => setUniversityName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                      placeholder="e.g. Cal State Fullerton"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={status === "sending"}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gauge-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gauge-400 disabled:opacity-60"
          >
            {status === "sending"
              ? mode === "signin"
                ? "Signing in..."
                : "Creating account..."
              : mode === "signin"
              ? "Sign in"
              : "Sign up"}
          </button>
          <button
            type="button"
            className="mt-2 w-full text-left text-xs text-forest-300 hover:text-gauge-400"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setStatus("idle");
              setError(null);
            }}
          >
            {mode === "signin"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}


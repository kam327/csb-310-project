"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type ClubChoice } from "@/components/AuthProvider";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, profile, loading, completeClubSetup, profileError, resetAuth } = useAuth();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const [clubMode, setClubMode] = useState<"join" | "create">("join");
  const [joinCode, setJoinCode] = useState("");
  const [clubName, setClubName] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && profile) router.replace("/");
  }, [loading, profile, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const choice: ClubChoice =
      clubMode === "join"
        ? { type: "join", joinCode }
        : { type: "create", clubName, universityName };
    const res = await completeClubSetup(choice);
    setSaving(false);
    if (res.error) {
      setError(res.error.message ?? "Failed to complete setup.");
      return;
    }
    // AuthProvider will set profile; redirect effect will run.
  };

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-forest-800 bg-forest-900/80 p-6 shadow-xl">
        <h1 className="text-xl font-bold text-white">Finish setup</h1>
        <p className="mt-2 text-sm text-forest-300">
          Choose the club you’re associated with.
        </p>

        {supabaseUrl && (
          <p className="mt-2 text-xs text-forest-400">
            Connected to{" "}
            <span className="font-mono text-forest-200">
              {supabaseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </span>
          </p>
        )}

        {user?.id && (
          <p className="mt-2 text-xs text-forest-400">
            Signed in as <span className="text-forest-200">{user.email ?? "user"}</span> ·{" "}
            <span className="font-mono">{user.id}</span>
          </p>
        )}

        {profileError && (
          <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            {profileError}
          </p>
        )}

        {user && (
          <button
            type="button"
            onClick={async () => {
              await resetAuth();
              router.replace("/login");
            }}
            className="mt-3 w-full rounded-lg border border-forest-700 bg-forest-900/60 px-3 py-2 text-sm font-semibold text-forest-200 hover:bg-forest-800"
          >
            Start over (clear session)
          </button>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="flex gap-2">
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
            <div>
              <label className="block text-sm font-medium text-forest-300">
                Join code
              </label>
              <input
                type="text"
                required
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                placeholder="e.g. 8F3A1C2B"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-forest-300">
                  Club name
                </label>
                <input
                  type="text"
                  required
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                  placeholder="e.g. Product Club"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-forest-300">
                  University (optional)
                </label>
                <input
                  type="text"
                  value={universityName}
                  onChange={(e) => setUniversityName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                  placeholder="e.g. Cal State Fullerton"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gauge-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gauge-400 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Continue"}
          </button>

          {error?.includes("users_id_fkey") && (
            <p className="text-xs text-forest-400">
              This is a DB constraint issue. Re-run `supabase-rls-policies.sql` and ensure
              `public.users.id` references `auth.users.id`.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}


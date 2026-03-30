"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type ClubChoice } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { fetchMyClubs } from "@/lib/supabaseData";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile, signOut, completeClubSetup } =
    useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clubError, setClubError] = useState<string | null>(null);
  const [clubSuccess, setClubSuccess] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [myClubs, setMyClubs] = useState<
    { id: string; name: string; university_name: string | null; role: string | null }[]
  >([]);
  const [clubMode, setClubMode] = useState<"join" | "create">("join");
  const [joinCode, setJoinCode] = useState("");
  const [clubName, setClubName] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [clubSaving, setClubSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (profile?.display_name) {
      setName(profile.display_name);
    }
  }, [profile?.display_name]);

  useEffect(() => {
    if (!user) return;
    fetchMyClubs(user.id)
      .then((rows) => setMyClubs(rows))
      .catch(() => setMyClubs([]));
  }, [user, profile?.club_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: upsertError } = await supabase
        .from("users")
        .update({
          display_name: name.trim() || null,
        })
        .eq("id", profile.id);
      if (upsertError) {
        setError(upsertError.message ?? "Failed to update profile.");
      } else {
        await refreshProfile();
        setSuccess("Profile updated.");
      }
    } catch (err) {
      setError((err as Error).message ?? "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const labelEmail = profile?.email ?? user?.email ?? "";

  const handleSwitchClub = async (clubId: string) => {
    if (!profile) return;
    const next = myClubs.find((c) => c.id === clubId);
    if (!next) return;

    setSwitching(true);
    setSwitchError(null);
    try {
      const { error: updErr } = await supabase
        .from("users")
        .update({
          club_id: clubId,
          role: next.role ?? null,
        })
        .eq("id", profile.id);

      if (updErr) throw updErr;
      await refreshProfile();
    } catch (e) {
      setSwitchError((e as Error).message ?? "Failed to switch club.");
    } finally {
      setSwitching(false);
    }
  };

  const submitClubChoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setClubSaving(true);
    setClubError(null);
    setClubSuccess(null);

    const choice: ClubChoice =
      clubMode === "join"
        ? { type: "join", joinCode }
        : {
            type: "create",
            clubName,
            universityName: universityName.trim() || undefined,
          };

    try {
      const res = await completeClubSetup(choice);
      if (res.error) {
        setClubError(res.error.message ?? "Failed to update club.");
        return;
      }
      setClubSuccess("Club saved. Your active club may update now.");
      setJoinCode("");
      setClubName("");
      setUniversityName("");
      await refreshProfile();
    } catch (err) {
      setClubError((err as Error).message ?? "Failed to update club.");
    } finally {
      setClubSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Profile</h1>
      <p className="mt-1 text-forest-300">
        Update how your name appears across the dashboard.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-forest-800 bg-forest-900/80 p-5">
          <p className="text-sm font-medium text-forest-300">Account</p>
          <p className="mt-2 text-sm text-forest-400">
            Signed in as{" "}
            <span className="break-all text-forest-100">
              {labelEmail || "unknown"}
            </span>
          </p>
          {profile?.role && (
            <p className="mt-2 text-xs text-forest-500">
              Role: <span className="text-forest-200">{profile.role}</span>
            </p>
          )}
          {myClubs.length > 1 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-forest-300">Active club</p>
              <p className="mt-1 text-xs text-forest-400">
                Switching changes what you see across the whole site.
              </p>
              <select
                value={profile?.club_id ?? ""}
                onChange={(e) => handleSwitchClub(e.target.value)}
                disabled={switching}
                className="mt-3 w-full rounded-lg border border-forest-700 bg-forest-800 px-3 py-2 text-sm text-white disabled:opacity-60"
              >
                {myClubs
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              {switchError && (
                <p className="mt-2 text-xs text-red-400">{switchError}</p>
              )}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-forest-800 bg-forest-900/80 p-5">
            <h2 className="text-sm font-medium text-forest-300">
              Join or create club
            </h2>
            <p className="mt-1 text-xs text-forest-400">
              Add a club using a join code or by creating a new one.
            </p>

            <form onSubmit={submitClubChoice} className="mt-4 space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setClubMode("join")}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                    clubMode === "join"
                      ? "bg-gauge-500/20 text-gauge-300"
                      : "bg-forest-900/60 text-forest-300 hover:bg-forest-800"
                  }`}
                  disabled={clubSaving}
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
                  disabled={clubSaving}
                >
                  Create new club
                </button>
              </div>

              {clubMode === "join" ? (
                <div>
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
                    disabled={clubSaving}
                  />
                </div>
              ) : (
                <div className="space-y-3">
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
                      disabled={clubSaving}
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
                      disabled={clubSaving}
                    />
                  </div>
                </div>
              )}

              {clubError && (
                <p className="text-sm text-red-400" role="alert">
                  {clubError}
                </p>
              )}
              {clubSuccess && (
                <p className="text-sm text-forest-300">{clubSuccess}</p>
              )}

              <button
                type="submit"
                disabled={clubSaving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gauge-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gauge-400 disabled:opacity-60"
              >
                {clubSaving ? "Saving..." : "Continue"}
              </button>
            </form>
          </div>

          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace("/login");
            }}
            className="mt-4 inline-flex items-center justify-center rounded-lg border border-forest-700 px-3 py-2 text-xs font-semibold text-forest-200 hover:bg-forest-800"
          >
            Sign out
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="md:col-span-1 rounded-xl border border-forest-800 bg-forest-900/80 p-5"
        >
          <h2 className="text-sm font-medium text-forest-300">Display name</h2>
          <p className="mt-1 text-xs text-forest-400">
            This is shown in the nav and club users list.
          </p>
          <div className="mt-3">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-forest-300"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
              placeholder="e.g. Alex Chen"
            />
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {success && <p className="mt-3 text-sm text-forest-300">{success}</p>}
          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gauge-500 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-gauge-400 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </div>

      {profile?.role === "officer" && profile.club_id && (
        <div className="mt-6 rounded-xl border border-forest-800 bg-forest-900/80 p-5">
          <h2 className="text-sm font-medium text-forest-300">Club settings</h2>
          <p className="mt-1 text-xs text-forest-400">
            Manage settings for the club you&apos;re an officer for.
          </p>
          <button
            type="button"
            onClick={() => router.push("/settings/club")}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-gauge-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-gauge-400"
          >
            Open club settings
          </button>
        </div>
      )}
    </div>
  );
}


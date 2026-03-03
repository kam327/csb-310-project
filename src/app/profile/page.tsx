"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { fetchClub, type ClubSummary } from "@/lib/supabaseData";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [club, setClub] = useState<ClubSummary | null>(null);
  const [clubError, setClubError] = useState<string | null>(null);

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
    if (!profile?.club_id) {
      setClub(null);
      return;
    }
    let cancelled = false;
    setClubError(null);
    fetchClub(profile.club_id)
      .then((c) => {
        if (!cancelled) setClub(c);
      })
      .catch((err) => {
        if (!cancelled) setClubError(err.message ?? "Failed to load club.");
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.club_id]);

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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Profile</h1>
      <p className="mt-1 text-forest-300">
        Update how your name appears across the dashboard.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-3">
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
          className="md:col-span-2 rounded-xl border border-forest-800 bg-forest-900/80 p-5"
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

      {profile?.role === "officer" && club && (
        <div className="mt-6 rounded-xl border border-forest-800 bg-forest-900/80 p-5">
          <h2 className="text-sm font-medium text-forest-300">Club settings</h2>
          <p className="mt-1 text-xs text-forest-400">
            Manage settings for your club.
          </p>
          <p className="mt-3 text-sm text-white">
            {club.name}
            {club.university_name && (
              <span className="text-forest-400"> · {club.university_name}</span>
            )}
          </p>

          {club.join_code && (
            <div className="mt-4">
              <p className="text-xs font-medium text-forest-400">Join code</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <code className="rounded bg-forest-800 px-2 py-1 text-sm tracking-widest text-gauge-300">
                  {club.join_code}
                </code>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(club.join_code!)}
                  className="text-xs font-medium text-gauge-400 hover:text-gauge-300"
                >
                  Copy
                </button>
              </div>
              <p className="mt-1 text-xs text-forest-500">
                Share this code with members so they can join your club.
              </p>
            </div>
          )}

          {clubError && (
            <p className="mt-3 text-xs text-red-400">{clubError}</p>
          )}
        </div>
      )}
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import { fetchClub, type ClubSummary } from "@/lib/supabaseData";

export default function ClubSettingsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [club, setClub] = useState<ClubSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reminderDays, setReminderDays] = useState<string>("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!profile?.club_id) {
      setClub(null);
      return;
    }
    let cancelled = false;
    setError(null);
    fetchClub(profile.club_id)
      .then((c) => {
        if (!cancelled) {
          setClub(c);
          if (c?.action_reminder_days != null) {
            setReminderDays(String(c.action_reminder_days));
          }
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "Failed to load club.");
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.club_id]);

  const handleCopyJoinCode = () => {
    if (!club?.join_code) return;
    navigator.clipboard.writeText(club.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = async () => {
    if (!club) return;
    const days = reminderDays.trim() === "" ? null : Number(reminderDays);
    if (days !== null && (Number.isNaN(days) || days < 0 || days > 365)) {
      setError("Reminder days must be between 0 and 365.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("clubs")
        .update({ action_reminder_days: days })
        .eq("id", club.id);
      if (updateError) {
        setError(updateError.message ?? "Failed to save settings.");
      } else {
        setClub({ ...club, action_reminder_days: days });
      }
    } catch (e) {
      setError((e as Error).message ?? "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (!user || !profile) {
    return null;
  }

  if (profile.role !== "officer") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Club settings</h1>
        <p className="mt-2 text-forest-300">
          Only officers can view and manage club settings.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Club settings</h1>
      <p className="mt-1 text-forest-300">
        View and share your club&apos;s join code and settings.
      </p>

      <div className="mt-6 space-y-6">
        <div className="rounded-xl border border-forest-800 bg-forest-900/80 p-5">
          <h2 className="text-sm font-medium text-forest-300">Club</h2>
          {club ? (
            <>
              <p className="mt-2 text-sm text-white">
                {club.name}
                {club.university_name && (
                  <span className="text-forest-400"> · {club.university_name}</span>
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-forest-400">Loading club information…</p>
          )}
          {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
        </div>

        {club?.join_code && (
          <div className="rounded-xl border border-forest-800 bg-forest-900/80 p-5">
            <h2 className="text-sm font-medium text-forest-300">Join code</h2>
            <p className="mt-1 text-xs text-forest-400">
              Share this code with members so they can join your club in Gauge.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="rounded bg-forest-800 px-3 py-2 text-sm tracking-widest text-gauge-300">
                {club.join_code}
              </code>
              <button
                type="button"
                onClick={handleCopyJoinCode}
                className="inline-flex items-center gap-2 rounded-lg bg-gauge-500 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-gauge-400"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy join code"}
              </button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-forest-800 bg-forest-900/80 p-5">
          <h2 className="text-sm font-medium text-forest-300">
            Action item reminders
          </h2>
          <p className="mt-1 text-xs text-forest-400">
            Gauge can email members about critical action items a set number of days
            before the due date.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <label
              htmlFor="reminder-days"
              className="text-sm text-forest-300 sm:w-48"
            >
              Days before due date
            </label>
            <input
              id="reminder-days"
              type="number"
              min={0}
              max={365}
              value={reminderDays}
              onChange={(e) => setReminderDays(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-lg border border-forest-700 bg-forest-800 px-3 py-2 text-sm text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
              placeholder="e.g. 3"
            />
          </div>
          <p className="mt-1 text-xs text-forest-500">
            Leave blank to disable automatic reminders for this club.
          </p>
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={saving}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-gauge-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-gauge-400 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save reminder settings"}
          </button>
        </div>
      </div>
    </div>
  );
}


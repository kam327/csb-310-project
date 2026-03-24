"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckSquare } from "lucide-react";
import type { SavedMinutes } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  fetchMinutesById,
  createCriticalActionItem,
  fetchClubUsers,
  type ClubUserProfile,
} from "@/lib/supabaseData";

interface CriticalDraft {
  key: string;
  task: string;
  assigneeId: string;
  dueDate: string;
  saving: boolean;
  error: string | null;
  saved: boolean;
}

function makeKey() {
  return Math.random().toString(36).slice(2, 10);
}

export default function MinutesDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [minutes, setMinutes] = useState<SavedMinutes | null>(null);
  const { profile } = useAuth();
  const [users, setUsers] = useState<ClubUserProfile[]>([]);
  const [drafts, setDrafts] = useState<CriticalDraft[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchMinutesById(id).then((m) => {
      if (!cancelled) setMinutes(m);
    });
    return () => { cancelled = true; };
  }, [id]);

  const canCreateCritical =
    Boolean(profile?.role === "officer" && profile.club_id);

  useEffect(() => {
    if (!canCreateCritical || !profile?.club_id) {
      setUsers([]);
      return;
    }
    let cancelled = false;
    fetchClubUsers(profile.club_id)
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch(() => {
        if (!cancelled) setUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [canCreateCritical, profile?.club_id]);

  const updateDraft = (key: string, patch: Partial<CriticalDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d))
    );
  };

  const removeDraft = (key: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  };

  const addBlankDraft = () => {
    setDrafts((prev) => [
      ...prev,
      {
        key: makeKey(),
        task: "",
        assigneeId: "",
        dueDate: "",
        saving: false,
        error: null,
        saved: false,
      },
    ]);
  };

  const handleSaveDraft = async (key: string) => {
    const draft = drafts.find((d) => d.key === key);
    if (!draft || !profile?.club_id) return;

    if (!draft.task.trim()) {
      updateDraft(key, { error: "Please enter a task description." });
      return;
    }
    if (!draft.assigneeId) {
      updateDraft(key, { error: "Please choose an assignee." });
      return;
    }
    if (!draft.dueDate) {
      updateDraft(key, { error: "Please choose a due date." });
      return;
    }
    const assignee = users.find((u) => u.id === draft.assigneeId);
    if (!assignee || !assignee.email) {
      updateDraft(key, {
        error: "Selected user does not have an email configured.",
      });
      return;
    }

    updateDraft(key, { saving: true, error: null });
    try {
      const { error: createError } = await createCriticalActionItem({
        clubId: profile.club_id,
        task: draft.task.trim(),
        assigneeEmail: assignee.email,
        dueDate: draft.dueDate,
      });
      if (createError) {
        updateDraft(key, {
          saving: false,
          error: createError.message ?? "Failed to create critical task.",
        });
      } else {
        updateDraft(key, { saving: false, saved: true, error: null });
      }
    } catch (err) {
      updateDraft(key, {
        saving: false,
        error: (err as Error).message ?? "Failed to create critical task.",
      });
    }
  };

  if (!minutes) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-forest-400">Meeting minutes not found.</p>
        <Link
          href="/minutes"
          className="mt-4 inline-block text-gauge-400 hover:text-gauge-300"
        >
          Back to minutes
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/minutes"
        className="inline-flex items-center gap-2 text-sm font-medium text-forest-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to minutes
      </Link>

      <div className="mt-6 rounded-xl border border-forest-800 bg-forest-900/80 p-6">
        <h1 className="text-2xl font-bold text-white">{minutes.title}</h1>
        <p className="mt-2 flex items-center gap-2 text-forest-400">
          <Calendar className="h-4 w-4" />
          {new Date(minutes.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <div className="mt-6 whitespace-pre-wrap rounded-lg border border-forest-700 bg-forest-800/60 px-5 py-4 font-mono text-sm leading-relaxed text-forest-200">
          {minutes.rawText}
        </div>

        <p className="mt-6 text-xs text-forest-400">
          Saved{" "}
          {new Date(minutes.createdAt).toLocaleString("en-US")}
        </p>
      </div>

      {/* Critical tasks */}
      {canCreateCritical && users.length > 0 && (
        <section className="mt-8 rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <CheckSquare className="h-5 w-5 text-gauge-400" />
            Create critical tasks
          </h2>
          <p className="mt-1 text-sm text-forest-400">
            Add action items from these notes as critical tasks with email
            reminders.
          </p>

          <div className="mt-4 space-y-4">
            {drafts.map((draft) => (
              <div
                key={draft.key}
                className={`rounded-lg border p-4 ${
                  draft.saved
                    ? "border-green-700 bg-green-900/20"
                    : "border-forest-700 bg-forest-900/80"
                }`}
              >
                {draft.saved ? (
                  <p className="flex items-center gap-2 text-sm text-green-400">
                    <CheckSquare className="h-4 w-4" /> Saved
                    {draft.task && (
                      <span className="text-forest-300">
                        &mdash; {draft.task}
                      </span>
                    )}
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-forest-300">
                          Task
                        </label>
                        <input
                          type="text"
                          value={draft.task}
                          onChange={(e) =>
                            updateDraft(draft.key, { task: e.target.value })
                          }
                          className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-3 py-2 text-sm text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                          placeholder="e.g. Send sponsor follow-up email"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDraft(draft.key)}
                        className="mt-6 text-forest-400 hover:text-red-400"
                        title="Remove draft"
                      >
                        <span className="sr-only">Remove</span>
                        &times;
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-forest-300">
                          Assignee
                        </label>
                        <select
                          value={draft.assigneeId}
                          onChange={(e) =>
                            updateDraft(draft.key, {
                              assigneeId: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-3 py-2 text-sm text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                        >
                          <option value="">Select a user&hellip;</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.display_name || u.email || "Unnamed user"}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-forest-300">
                          Due date
                        </label>
                        <input
                          type="date"
                          value={draft.dueDate}
                          onChange={(e) =>
                            updateDraft(draft.key, {
                              dueDate: e.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-3 py-2 text-sm text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                        />
                      </div>
                    </div>
                    {draft.error && (
                      <p className="text-xs text-red-400">{draft.error}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleSaveDraft(draft.key)}
                      disabled={draft.saving}
                      className="inline-flex items-center justify-center rounded-lg bg-gauge-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-gauge-400 disabled:opacity-60"
                    >
                      {draft.saving ? "Saving\u2026" : "Save critical task"}
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addBlankDraft}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-400"
            >
              <CheckSquare className="h-4 w-4" />
              Add critical task
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

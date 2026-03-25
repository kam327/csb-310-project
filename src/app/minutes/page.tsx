"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Save,
  CheckSquare,
  Plus,
  X,
  Sparkles,
} from "lucide-react";
import type { SavedMinutes } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  fetchClubUsers,
  fetchCriticalActionItems,
  fetchMinutesForClub,
  insertMinutes,
  createCriticalActionItem,
  deleteCriticalActionItem,
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

function formatExtractedMinutes(minutes: {
  summary: string;
  decisions: string[];
  actionItems: string[];
  nextSteps: string[];
}): string {
  const blocks: string[] = [];
  if (minutes.summary?.trim()) {
    blocks.push(`Summary\n\n${minutes.summary.trim()}`);
  }
  if (minutes.decisions?.length) {
    blocks.push(
      `Decisions\n\n${minutes.decisions.map((d) => `• ${d}`).join("\n")}`
    );
  }
  if (minutes.actionItems?.length) {
    blocks.push(
      `Action items\n\n${minutes.actionItems.map((d) => `• ${d}`).join("\n")}`
    );
  }
  if (minutes.nextSteps?.length) {
    blocks.push(
      `Next steps\n\n${minutes.nextSteps.map((d) => `• ${d}`).join("\n")}`
    );
  }
  return blocks.join("\n\n");
}

export default function MinutesPage() {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rawText, setRawText] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [deletingCriticalId, setDeletingCriticalId] = useState<string | null>(
    null
  );
  const { profile } = useAuth();
  const [users, setUsers] = useState<ClubUserProfile[]>([]);
  const [drafts, setDrafts] = useState<CriticalDraft[]>([]);
  const [allMinutes, setAllMinutes] = useState<SavedMinutes[]>([]);

  useEffect(() => {
    if (!profile?.club_id) {
      setAllMinutes([]);
      return;
    }
    let cancelled = false;
    fetchMinutesForClub(profile.club_id).then((list) => {
      if (!cancelled) setAllMinutes(list);
    });
    return () => { cancelled = true; };
  }, [profile?.club_id]);

  const handleSave = async () => {
    if (!rawText.trim() || !profile?.club_id) return;
    setSaving(true);
    const { data: saved, error } = await insertMinutes({
      clubId: profile.club_id,
      title: title.trim() || "Meeting notes",
      date,
      rawText: rawText.trim(),
    });
    setSaving(false);
    if (error || !saved) {
      console.error("[Gauge] failed to save minutes", error);
      return;
    }
    setSavedId(saved.id);
    setAllMinutes((prev) => [saved, ...prev]);
  };

  const handleExtractWithAi = async () => {
    const notes = rawText.trim();
    if (!notes) return;
    setExtractError(null);
    setExtracting(true);
    try {
      const res = await fetch("/api/extract-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawNotes: notes }),
      });
      const data = (await res.json()) as {
        extracted?: {
          summary: string;
          decisions: string[];
          actionItems: string[];
          nextSteps: string[];
        };
        error?: string;
      };
      if (!res.ok || !data.extracted) {
        setExtractError(data.error ?? "Could not extract notes.");
        return;
      }
      setRawText(formatExtractedMinutes(data.extracted));
      if (savedId) setSavedId(null);
    } catch {
      setExtractError("Network error. Try again.");
    } finally {
      setExtracting(false);
    }
  };

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

  // Hydrate persisted critical tasks from Supabase so they don't disappear on refresh/navigation.
  useEffect(() => {
    if (!canCreateCritical || !profile?.club_id) return;
    if (drafts.length > 0) return; // keep any in-progress unsaved drafts

    fetchCriticalActionItems(profile.club_id).then((items) => {
      setDrafts(
        (items ?? []).map((item) => ({
          key: item.id,
          task: item.task,
          assigneeId: "",
          dueDate: item.dueDate ?? "",
          saving: false,
          error: null,
          saved: true,
        }))
      );
    });
  }, [canCreateCritical, profile?.club_id, drafts.length]);

  const updateDraft = (key: string, patch: Partial<CriticalDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d))
    );
  };

  const removeDraft = (key: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  };

  const handleDeleteCriticalDraft = async (key: string) => {
    if (!profile?.club_id) return;
    setDeletingCriticalId(key);

    try {
      const { error } = await deleteCriticalActionItem({
        clubId: profile.club_id,
        id: key,
      });

      if (error) {
        updateDraft(key, {
          error: error.message ?? "Failed to delete critical task.",
        });
        return;
      }

      removeDraft(key);
    } catch (err) {
      updateDraft(key, {
        error: (err as Error).message ?? "Failed to delete critical task.",
      });
    } finally {
      setDeletingCriticalId(null);
    }
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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Meeting minutes
        </h1>
        <p className="mt-1 text-forest-300">
          Record meeting notes so your club can reference them later and
          preserve institutional knowledge across leadership transitions.
        </p>
      </div>

      {/* New minutes form */}
      <section className="mt-8 rounded-xl border border-forest-800 bg-forest-900/80 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <FileText className="h-5 w-5 text-gauge-400" />
          New meeting notes
        </h2>
        <p className="mt-1 text-sm text-forest-400">
          Give it a title, set the date, and paste or type your notes.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="minutes-title"
              className="block text-sm font-medium text-forest-300"
            >
              Title
            </label>
            <input
              id="minutes-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. General Meeting"
              className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
            />
          </div>
          <div>
            <label
              htmlFor="minutes-date"
              className="block text-sm font-medium text-forest-300"
            >
              Date
            </label>
            <input
              id="minutes-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label
            htmlFor="minutes-text"
            className="block text-sm font-medium text-forest-300"
          >
            Meeting notes
          </label>
          <textarea
            id="minutes-text"
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              if (savedId) setSavedId(null);
              if (extractError) setExtractError(null);
            }}
            placeholder="Paste or type your meeting notes here..."
            rows={12}
            className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-3 font-mono text-sm text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
          />
          {extractError && (
            <p className="mt-2 text-sm text-red-400">{extractError}</p>
          )}
        </div>

        <button
          type="button"
          onClick={handleExtractWithAi}
          disabled={!rawText.trim() || extracting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-gauge-500/60 bg-forest-800/80 px-4 py-3 font-semibold text-gauge-300 transition hover:border-gauge-400 hover:bg-forest-800 disabled:opacity-50"
        >
          <Sparkles className="h-5 w-5" />
          {extracting ? "Extracting\u2026" : "Extract with AI"}
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={!rawText.trim() || !!savedId || saving}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 font-semibold text-slate-900 transition hover:bg-brand-400 disabled:opacity-50"
        >
          <Save className="h-5 w-5" />
          {savedId ? "Saved \u2713" : saving ? "Saving\u2026" : "Save meeting notes"}
        </button>
      </section>

      {/* Critical tasks */}
      {canCreateCritical && (
        <section className="mt-10 rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <CheckSquare className="h-5 w-5 text-gauge-400" />
            Critical tasks
          </h2>
          <p className="mt-1 text-sm text-forest-400">
            Create critical action items for authenticated club users. Gauge will
            email them based on your reminder settings.
          </p>

          {users.length === 0 && !drafts.some((d) => d.saved) ? (
            <p className="mt-4 text-sm text-forest-400">
              No club users found yet. Critical tasks can be assigned once users
              have joined your club.
            </p>
          ) : (
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
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div className="flex min-w-0 items-center gap-2 text-green-400">
                        <CheckSquare className="h-4 w-4" />
                        <span className="shrink-0 font-medium">Saved</span>
                        {draft.task && (
                          <span className="min-w-0 truncate text-forest-300">
                            &mdash; {draft.task}
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteCriticalDraft(draft.key)}
                        disabled={deletingCriticalId === draft.key}
                        className="inline-flex items-center rounded-lg border border-red-500/60 bg-forest-800/30 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:border-red-400 hover:bg-forest-800 disabled:opacity-50"
                        title="Delete critical task"
                      >
                        {deletingCriticalId === draft.key
                          ? "Deleting\u2026"
                          : "Delete"}
                      </button>
                    </div>
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
                          <X className="h-4 w-4" />
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
                <Plus className="h-4 w-4" />
                Add critical task
              </button>
            </div>
          )}
        </section>
      )}

      {/* Past minutes */}
      {allMinutes.length > 0 && (
        <section className="mt-10 rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">
            Past minutes ({allMinutes.length})
          </h2>
          <ul className="mt-4 space-y-3">
            {allMinutes.slice(0, 10).map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-lg border border-forest-800 bg-forest-800/50 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-white">{m.title}</p>
                  <p className="text-sm text-forest-400">
                    {new Date(m.date).toLocaleDateString("en-US")}
                  </p>
                </div>
                <Link
                  href={`/minutes/${m.id}`}
                  className="text-sm font-medium text-gauge-400 hover:text-gauge-300"
                >
                  View
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

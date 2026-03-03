"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Upload,
  Sparkles,
  Save,
  Calendar,
  Users,
  CheckSquare,
  ListChecks,
  ArrowLeft,
  Plus,
  X,
} from "lucide-react";
import { store, generateId } from "@/lib/store";
import type { ExtractedMinutes, SavedMinutes } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  fetchClubUsers,
  createCriticalActionItem,
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

export default function MinutesPage() {
  const [rawText, setRawText] = useState("");
  const [extracted, setExtracted] = useState<ExtractedMinutes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const { profile } = useAuth();
  const [users, setUsers] = useState<ClubUserProfile[]>([]);
  const [drafts, setDrafts] = useState<CriticalDraft[]>([]);

  const matchAssignee = useCallback(
    (name: string | undefined): string => {
      if (!name || users.length === 0) return "";
      const lower = name.toLowerCase();
      const match = users.find(
        (u) => u.display_name && u.display_name.toLowerCase().includes(lower)
      );
      return match ? match.id : "";
    },
    [users]
  );

  const handleExtract = async () => {
    if (!rawText.trim()) {
      setError("Paste or type meeting notes first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/extract-minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Extraction failed");
      }
      const data = (await res.json()) as ExtractedMinutes;
      setExtracted(data);
      setSavedId(null);

      if (canCreateCritical && data.actionItems.length > 0) {
        setDrafts(
          data.actionItems.map((item) => ({
            key: makeKey(),
            task: item.task || "",
            assigneeId: matchAssignee(item.assignee),
            dueDate:
              item.due && /^\d{4}-\d{2}-\d{2}$/.test(item.due)
                ? item.due
                : "",
            saving: false,
            error: null,
            saved: false,
          }))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!extracted) return;
    const saved: SavedMinutes = {
      id: generateId(),
      rawText: rawText.trim() || undefined,
      extracted: { ...extracted },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.minutes.add(saved);
    setSavedId(saved.id);
  };

  const handleUpdateExtracted = (updates: Partial<ExtractedMinutes>) => {
    if (extracted) setExtracted({ ...extracted, ...updates });
  };

  const allMinutes = typeof window !== "undefined" ? store.minutes.getAll() : [];

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Meeting minutes
        </h1>
        <p className="mt-1 text-forest-300">
          Upload or paste meeting notes. AI extracts a structured form so you
          can track decisions and action items over time—and pass them to the
          next leadership.
        </p>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Upload className="h-5 w-5 text-gauge-400" />
            Meeting notes
          </h2>
          <p className="mt-1 text-sm text-forest-400">
            Paste minutes from a doc, email, or type them here.
          </p>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Example:\n\n# General Meeting – Feb 14\n\nAttendees: Alex, Sam, Jordan, Taylor\n\nDecisions:\n- Approved budget for spring event\n- Moved weekly meeting to Tuesdays\n\nAction items:\n- Alex: book room by Friday\n- Sam: send recap email`}
            rows={12}
            className="mt-4 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-3 font-mono text-sm text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
          />
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          <button
            type="button"
            onClick={handleExtract}
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 font-semibold text-slate-900 transition hover:bg-brand-400 disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Extracting…
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Extract with AI
              </>
            )}
          </button>
        </section>

        <section className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <FileText className="h-5 w-5 text-gauge-400" />
            Extracted form
          </h2>
          <p className="mt-1 text-sm text-forest-400">
            Edit if needed, then save to track over time.
          </p>

          {!extracted ? (
            <p className="mt-6 text-forest-400">
              Paste notes and click &quot;Extract with AI&quot; to fill this
              form.
            </p>
          ) : (
            <div className="mt-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-forest-300">
                  Date
                </label>
                <input
                  type="date"
                  value={extracted.date}
                  onChange={(e) =>
                    handleUpdateExtracted({ date: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2 text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-forest-300">
                  Title
                </label>
                <input
                  type="text"
                  value={extracted.title}
                  onChange={(e) =>
                    handleUpdateExtracted({ title: e.target.value })
                  }
                  placeholder="Meeting title"
                  className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-forest-300">
                  <Users className="h-4 w-4" />
                  Attendees (one per line)
                </label>
                <textarea
                  value={extracted.attendees.join("\n")}
                  onChange={(e) =>
                    handleUpdateExtracted({
                      attendees: e.target.value
                        .split(/\n/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2 text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-forest-300">
                  <ListChecks className="h-4 w-4" />
                  Key decisions
                </label>
                <textarea
                  value={extracted.keyDecisions.join("\n")}
                  onChange={(e) =>
                    handleUpdateExtracted({
                      keyDecisions: e.target.value
                        .split(/\n/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2 text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-forest-300">
                  <CheckSquare className="h-4 w-4" />
                  Action items (one per line: task or &quot;task – assignee&quot;)
                </label>
                <textarea
                  value={extracted.actionItems
                    .map(
                      (a) =>
                        [a.task, a.assignee, a.due]
                          .filter(Boolean)
                          .join(" – ") || a.task
                    )
                    .join("\n")}
                  onChange={(e) => {
                    const lines = e.target.value.split(/\n/).map((s) => s.trim()).filter(Boolean);
                    handleUpdateExtracted({
                      actionItems: lines.map((line) => {
                        const parts = line.split(/\s*[–-]\s*/);
                        return {
                          task: parts[0] ?? line,
                          assignee: parts[1],
                          due: parts[2],
                        };
                      }),
                    });
                  }}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2 text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                />
              </div>
              {extracted.nextMeeting !== undefined && (
                <div>
                  <label className="block text-sm font-medium text-forest-300">
                    Next meeting
                  </label>
                  <input
                    type="text"
                    value={extracted.nextMeeting ?? ""}
                    onChange={(e) =>
                      handleUpdateExtracted({ nextMeeting: e.target.value || undefined })
                    }
                    placeholder="e.g. Feb 21"
                    className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={handleSave}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 font-semibold text-slate-900 transition hover:bg-brand-400"
              >
                <Save className="h-5 w-5" />
                {savedId ? "Saved ✓" : "Save to history"}
              </button>
            </div>
          )}
        </section>
      </div>

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

          {users.length === 0 ? (
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
                    <p className="flex items-center gap-2 text-sm text-green-400">
                      <CheckSquare className="h-4 w-4" /> Saved
                      {draft.task && (
                        <span className="text-forest-300">— {draft.task}</span>
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
                            <option value="">Select a user…</option>
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
                        {draft.saving ? "Saving…" : "Save critical task"}
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
                  <p className="font-medium text-white">{m.extracted.title}</p>
                  <p className="text-sm text-forest-400">
                    {new Date(m.extracted.date).toLocaleDateString("en-US")} ·{" "}
                    {m.extracted.attendees.length} attendees ·{" "}
                    {m.extracted.actionItems.length} action items
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

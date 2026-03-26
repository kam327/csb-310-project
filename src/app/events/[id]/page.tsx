"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Users,
  Copy,
  ExternalLink,
  Smartphone,
  MessageSquarePlus,
  ClipboardList,
  Star,
  CheckSquare,
  Plus,
  X,
  Tag,
} from "lucide-react";
import type { Event, CheckIn, FeedbackSurvey } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  fetchEventById,
  fetchAttendanceForEvent,
  fetchSurveyForEvent,
  createFeedbackSurvey,
  fetchCriticalActionItems,
  createCriticalActionItem,
  deleteCriticalActionItem,
  toggleCriticalActionItemCompleted,
  fetchClubUsers,
  type CriticalActionItem,
  type ClubUserProfile,
} from "@/lib/supabaseData";

const BASE_URL_KEY = "gauge-checkin-base-url";

interface TaskDraft {
  key: string;
  task: string;
  assigneeId: string;
  dueDate: string;
  saving: boolean;
  error: string | null;
}

function makeKey() {
  return Math.random().toString(36).slice(2, 10);
}

function isLocalhost(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [copied, setCopied] = useState(false);
  const [baseUrlOverride, setBaseUrlOverride] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");

  const [survey, setSurvey] = useState<FeedbackSurvey | null>(null);
  const [showSurveySetup, setShowSurveySetup] = useState(false);
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [creatingSurvey, setCreatingSurvey] = useState(false);
  const [surveyLinkCopied, setSurveyLinkCopied] = useState(false);

  const [tasks, setTasks] = useState<CriticalActionItem[]>([]);
  const [users, setUsers] = useState<ClubUserProfile[]>([]);
  const [drafts, setDrafts] = useState<TaskDraft[]>([]);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  const isOfficer = profile?.role === "officer" && !!profile.club_id;

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchEventById(id),
      fetchAttendanceForEvent(id),
      fetchSurveyForEvent(id),
    ]).then(([e, cis, s]) => {
      if (!cancelled) {
        setEvent(e ?? null);
        setCheckIns(cis);
        setSurvey(s);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!profile?.club_id) return;
    fetchCriticalActionItems(profile.club_id, id).then(setTasks);
    fetchClubUsers(profile.club_id).then(setUsers);
  }, [profile?.club_id, id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(BASE_URL_KEY);
    if (saved) setBaseUrlOverride(saved);
  }, []);

  const effectiveOrigin =
    baseUrlOverride.trim() || (typeof window !== "undefined" ? window.location.origin : "");
  const checkInUrl = effectiveOrigin ? `${effectiveOrigin.replace(/\/$/, "")}/checkin/${id}` : "";
  const showLocalhostWarning =
    typeof window !== "undefined" && isLocalhost(window.location.origin) && !baseUrlOverride.trim();

  const surveyUrl =
    survey && effectiveOrigin
      ? `${effectiveOrigin.replace(/\/$/, "")}/feedback/${survey.id}`
      : "";

  const copyCheckInLink = () => {
    if (!checkInUrl) return;
    navigator.clipboard.writeText(checkInUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySurveyLink = () => {
    if (!surveyUrl) return;
    navigator.clipboard.writeText(surveyUrl);
    setSurveyLinkCopied(true);
    setTimeout(() => setSurveyLinkCopied(false), 2000);
  };

  const handleCreateSurvey = async () => {
    setCreatingSurvey(true);
    const { data } = await createFeedbackSurvey({
      eventId: id,
      question1: q1 || undefined,
      question2: q2 || undefined,
      question3: q3 || undefined,
    });
    setCreatingSurvey(false);
    if (data) {
      setSurvey(data);
      setShowSurveySetup(false);
    }
  };

  const applyBaseUrl = () => {
    const value = baseUrlInput.trim().replace(/\/$/, "");
    if (!value) return;
    try {
      new URL(value);
      setBaseUrlOverride(value);
      sessionStorage.setItem(BASE_URL_KEY, value);
    } catch {
      const withScheme = value.startsWith("http") ? value : `http://${value}`;
      try {
        new URL(withScheme);
        setBaseUrlOverride(withScheme);
        sessionStorage.setItem(BASE_URL_KEY, withScheme);
      } catch {
        setBaseUrlInput("Invalid URL");
      }
    }
  };

  /* ─── Task helpers ─── */

  const addBlankDraft = () => {
    setDrafts((prev) => [
      ...prev,
      { key: makeKey(), task: "", assigneeId: "", dueDate: "", saving: false, error: null },
    ]);
  };

  const updateDraft = (key: string, patch: Partial<TaskDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  };

  const removeDraft = (key: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
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
    if (!assignee?.email) {
      updateDraft(key, { error: "Selected user does not have an email configured." });
      return;
    }

    updateDraft(key, { saving: true, error: null });
    try {
      const { error } = await createCriticalActionItem({
        clubId: profile.club_id,
        eventId: id,
        task: draft.task.trim(),
        assigneeEmail: assignee.email,
        dueDate: draft.dueDate,
      });
      if (error) {
        updateDraft(key, { saving: false, error: error.message ?? "Failed to create task." });
      } else {
        removeDraft(key);
        fetchCriticalActionItems(profile.club_id, id).then(setTasks);
      }
    } catch (e) {
      updateDraft(key, { saving: false, error: (e as Error).message ?? "Failed to create task." });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!profile?.club_id) return;
    setDeletingTaskId(taskId);
    try {
      const { error } = await deleteCriticalActionItem({ clubId: profile.club_id, id: taskId });
      if (!error) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleToggleCompleted = async (task: CriticalActionItem) => {
    setTogglingTaskId(task.id);
    try {
      const { error } = await toggleCriticalActionItemCompleted({
        id: task.id,
        completed: !task.completed,
      });
      if (!error) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
        );
      }
    } catch {
      // silently fail
    } finally {
      setTogglingTaskId(null);
    }
  };

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-forest-400">Event not found.</p>
        <Link href="/events" className="mt-4 inline-block text-gauge-400 hover:text-gauge-300">
          Back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-forest-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Left column */}
        <div className="flex flex-col gap-6 lg:min-w-[280px]">
          {/* Check-in QR */}
          <section className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
            <h2 className="text-lg font-semibold text-white">QR code check-in</h2>
            <p className="mt-1 text-sm text-forest-400">
              Members scan this to check in. Or share the link below.
            </p>

            {showLocalhostWarning && (
              <div className="mt-4 flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-left">
                <Smartphone className="h-5 w-5 shrink-0 text-amber-400" />
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-amber-200">
                    Scanning from a phone? localhost won&apos;t work.
                  </p>
                  <p className="mt-1 text-amber-200/90">
                    Enter your computer&apos;s URL (same WiFi) so the QR works on other devices:
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={baseUrlInput}
                      onChange={(e) => setBaseUrlInput(e.target.value)}
                      placeholder="http://192.168.1.5:3000"
                      className="flex-1 rounded border border-forest-600 bg-forest-800 px-3 py-1.5 text-sm text-white placeholder-forest-400"
                    />
                    <button
                      type="button"
                      onClick={applyBaseUrl}
                      className="shrink-0 rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
                    >
                      Use for QR
                    </button>
                  </div>
                </div>
              </div>
            )}

            {checkInUrl ? (
              <div className="mt-4 flex justify-center rounded-lg bg-white p-4">
                <QRCodeSVG value={checkInUrl} size={200} level="M" />
              </div>
            ) : (
              <div className="mt-4 flex h-[232px] items-center justify-center rounded-lg bg-forest-800 text-forest-400">
                Set base URL above to generate QR
              </div>
            )}
            {baseUrlOverride && (
              <p className="mt-2 text-center text-xs text-forest-400">
                QR points to: {baseUrlOverride}
                <button
                  type="button"
                  onClick={() => {
                    setBaseUrlOverride("");
                    setBaseUrlInput("");
                    sessionStorage.removeItem(BASE_URL_KEY);
                  }}
                  className="ml-1 text-gauge-400 hover:text-gauge-300"
                >
                  Reset
                </button>
              </p>
            )}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={copyCheckInLink}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-forest-600 bg-forest-800 px-4 py-2.5 text-sm font-medium text-forest-300 transition hover:bg-forest-700"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy check-in link"}
              </button>
              <a
                href={checkInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-400"
              >
                <ExternalLink className="h-4 w-4" />
                Open check-in page
              </a>
            </div>
          </section>

          {/* Feedback Survey */}
          <section className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Star className="h-5 w-5 text-brand-400" />
              Feedback survey
            </h2>

            {survey ? (
              <>
                <p className="mt-1 text-sm text-forest-400">
                  Share this QR so attendees can rate the event and answer your
                  questions.
                </p>
                {surveyUrl && (
                  <div className="mt-4 flex justify-center rounded-lg bg-white p-4">
                    <QRCodeSVG value={surveyUrl} size={200} level="M" />
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={copySurveyLink}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-forest-600 bg-forest-800 px-4 py-2.5 text-sm font-medium text-forest-300 transition hover:bg-forest-700"
                  >
                    <Copy className="h-4 w-4" />
                    {surveyLinkCopied ? "Copied!" : "Copy survey link"}
                  </button>
                  <a
                    href={surveyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-forest-600 bg-forest-800 px-4 py-2.5 text-sm font-medium text-forest-300 transition hover:bg-forest-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open survey page
                  </a>
                  <Link
                    href={`/events/${id}/feedback`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-400"
                  >
                    <ClipboardList className="h-4 w-4" />
                    View feedback results
                  </Link>
                </div>
              </>
            ) : showSurveySetup ? (
              <>
                <p className="mt-1 text-sm text-forest-400">
                  Every survey includes a 1&ndash;5 event rating. Add up to 3 custom
                  open-ended questions below (optional).
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-forest-300">
                      Question 1
                    </label>
                    <input
                      type="text"
                      value={q1}
                      onChange={(e) => setQ1(e.target.value)}
                      placeholder="e.g. What did you enjoy most?"
                      className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-sm text-white placeholder-forest-500 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-forest-300">
                      Question 2
                    </label>
                    <input
                      type="text"
                      value={q2}
                      onChange={(e) => setQ2(e.target.value)}
                      placeholder="e.g. How can we improve?"
                      className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-sm text-white placeholder-forest-500 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-forest-300">
                      Question 3
                    </label>
                    <input
                      type="text"
                      value={q3}
                      onChange={(e) => setQ3(e.target.value)}
                      placeholder="e.g. Any other thoughts?"
                      className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-sm text-white placeholder-forest-500 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSurveySetup(false)}
                    className="flex-1 rounded-lg border border-forest-600 bg-forest-800 px-4 py-2.5 text-sm font-medium text-forest-300 transition hover:bg-forest-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSurvey}
                    disabled={creatingSurvey}
                    className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-400 disabled:opacity-60"
                  >
                    {creatingSurvey ? "Creating\u2026" : "Create survey"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-forest-400">
                  No survey yet. Create one to collect attendee feedback.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSurveySetup(true)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-400"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  Open feedback survey
                </button>
              </>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="flex flex-1 flex-col gap-6">
          <section className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-white">{event.name}</h2>
              {event.category && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gauge-500/20 px-2.5 py-0.5 text-xs font-medium text-gauge-300">
                  <Tag className="h-3 w-3" />
                  {event.category}
                </span>
              )}
            </div>
            <p className="mt-1 text-forest-400">
              {new Date(event.date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              {event.time && (
                <>
                  {" \u00b7 "}
                  {new Date(`${event.date}T${event.time}`).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {event.endTime && (
                    <>
                      {" \u2013 "}
                      {new Date(`${event.date}T${event.endTime}`).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </>
                  )}
                </>
              )}
            </p>
            {event.description && (
              <p className="mt-3 text-forest-300">{event.description}</p>
            )}

            <div className="mt-6 flex items-center gap-2 text-forest-300">
              <Users className="h-5 w-5" />
              <span className="font-medium text-white">
                {checkIns.length} check-in{checkIns.length !== 1 ? "s" : ""}
              </span>
            </div>

            {checkIns.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {checkIns
                  .sort(
                    (a, b) =>
                      new Date(b.checkedInAt).getTime() -
                      new Date(a.checkedInAt).getTime()
                  )
                  .map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between rounded-lg border border-forest-800 bg-forest-800/50 px-4 py-3"
                    >
                      <span className="font-medium text-white">{c.memberName}</span>
                      <span className="text-sm text-forest-400">
                        {new Date(c.checkedInAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="mt-4 text-forest-400">
                No check-ins yet. Share the QR code or link at your event.
              </p>
            )}
          </section>

          {/* Critical Tasks */}
          <section className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <CheckSquare className="h-5 w-5 text-gauge-400" />
              Tasks
            </h2>
            <p className="mt-1 text-sm text-forest-400">
              Critical tasks for this event. Officers can add, complete, and delete tasks.
            </p>

            {tasks.length > 0 && (
              <ul className="mt-4 space-y-2">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
                      task.completed
                        ? "border-green-700/50 bg-green-900/10"
                        : "border-forest-800 bg-forest-800/50"
                    }`}
                  >
                    {isOfficer && (
                      <button
                        type="button"
                        onClick={() => handleToggleCompleted(task)}
                        disabled={togglingTaskId === task.id}
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                          task.completed
                            ? "border-green-500 bg-green-500 text-white"
                            : "border-forest-600 bg-forest-800 hover:border-gauge-500"
                        }`}
                        title={task.completed ? "Mark incomplete" : "Mark complete"}
                      >
                        {task.completed && (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium ${task.completed ? "text-forest-400 line-through" : "text-white"}`}>
                        {task.task}
                      </p>
                      <p className="mt-0.5 text-xs text-forest-400">
                        Assignee: {task.assigneeEmail}
                        {task.dueDate && <> &middot; Due: {new Date(task.dueDate).toLocaleDateString("en-US")}</>}
                      </p>
                    </div>
                    {isOfficer && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={deletingTaskId === task.id}
                        className="shrink-0 text-forest-500 transition hover:text-red-400 disabled:opacity-50"
                        title="Delete task"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {tasks.length === 0 && drafts.length === 0 && (
              <p className="mt-4 text-sm text-forest-500">No tasks for this event yet.</p>
            )}

            {/* Draft forms for new tasks */}
            {drafts.length > 0 && (
              <div className="mt-4 space-y-4">
                {drafts.map((draft) => (
                  <div
                    key={draft.key}
                    className="rounded-lg border border-forest-700 bg-forest-900/80 p-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-forest-300">Task</label>
                          <input
                            type="text"
                            value={draft.task}
                            onChange={(e) => updateDraft(draft.key, { task: e.target.value })}
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
                          <label className="block text-sm font-medium text-forest-300">Assignee</label>
                          <select
                            value={draft.assigneeId}
                            onChange={(e) => updateDraft(draft.key, { assigneeId: e.target.value })}
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
                          <label className="block text-sm font-medium text-forest-300">Due date</label>
                          <input
                            type="date"
                            value={draft.dueDate}
                            onChange={(e) => updateDraft(draft.key, { dueDate: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-3 py-2 text-sm text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                          />
                        </div>
                      </div>
                      {draft.error && <p className="text-xs text-red-400">{draft.error}</p>}
                      <button
                        type="button"
                        onClick={() => handleSaveDraft(draft.key)}
                        disabled={draft.saving}
                        className="inline-flex items-center justify-center rounded-lg bg-gauge-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-gauge-400 disabled:opacity-60"
                      >
                        {draft.saving ? "Saving\u2026" : "Save task"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isOfficer && (
              <button
                type="button"
                onClick={addBlankDraft}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-400"
              >
                <Plus className="h-4 w-4" />
                Add task
              </button>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

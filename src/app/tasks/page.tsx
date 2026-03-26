"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckSquare, ArrowUpDown, Calendar, User, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import {
  fetchCriticalActionItems,
  fetchEvents,
  toggleCriticalActionItemCompleted,
  deleteCriticalActionItem,
  type CriticalActionItem,
} from "@/lib/supabaseData";
import type { Event } from "@/types";

type SortMode = "deadline" | "assignee" | "event";

export default function TasksPage() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<CriticalActionItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("deadline");
  const [showCompleted, setShowCompleted] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.club_id) {
      setTasks([]);
      setEvents([]);
      return;
    }
    fetchCriticalActionItems(profile.club_id).then(setTasks);
    fetchEvents(profile.club_id).then(setEvents);
  }, [profile?.club_id]);

  const eventMap = useMemo(() => {
    const m = new Map<string, Event>();
    for (const e of events) m.set(e.id, e);
    return m;
  }, [events]);

  const filteredTasks = useMemo(() => {
    const list = showCompleted ? tasks : tasks.filter((t) => !t.completed);
    return [...list].sort((a, b) => {
      if (sortMode === "deadline") {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (sortMode === "assignee") {
        return a.assigneeEmail.localeCompare(b.assigneeEmail);
      }
      // sort by event name
      const nameA = (a.eventId && eventMap.get(a.eventId)?.name) || "";
      const nameB = (b.eventId && eventMap.get(b.eventId)?.name) || "";
      return nameA.localeCompare(nameB);
    });
  }, [tasks, sortMode, showCompleted, eventMap]);

  const isOfficer = profile?.role === "officer";

  const handleToggle = async (task: CriticalActionItem) => {
    setTogglingId(task.id);
    const { error } = await toggleCriticalActionItemCompleted({
      id: task.id,
      completed: !task.completed,
    });
    setTogglingId(null);
    if (!error) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
      );
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!profile?.club_id) return;
    setDeletingId(taskId);
    const { error } = await deleteCriticalActionItem({ clubId: profile.club_id, id: taskId });
    setDeletingId(null);
    if (!error) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    }
  };

  const openCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  // Group tasks when sorting by assignee or event
  const grouped = useMemo(() => {
    if (sortMode === "deadline") return null;

    const map = new Map<string, CriticalActionItem[]>();
    for (const t of filteredTasks) {
      let key: string;
      if (sortMode === "assignee") {
        key = t.assigneeEmail;
      } else {
        key = t.eventId ? (eventMap.get(t.eventId)?.name ?? "Unknown event") : "No event";
      }
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [filteredTasks, sortMode, eventMap]);

  const sortButtons: { mode: SortMode; label: string; icon: typeof Calendar }[] = [
    { mode: "deadline", label: "Deadline", icon: Calendar },
    { mode: "assignee", label: "Assignee", icon: User },
    { mode: "event", label: "Event", icon: ArrowUpDown },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Tasks</h1>
        <p className="mt-1 text-forest-300">
          All critical tasks across your club&apos;s events.
          {openCount > 0 && (
            <span className="ml-1 font-medium text-gauge-400">
              {openCount} open
            </span>
          )}
          {completedCount > 0 && (
            <span className="ml-1 text-forest-400">
              &middot; {completedCount} completed
            </span>
          )}
        </p>
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-forest-800 bg-forest-900/80 p-1">
          {sortButtons.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortMode(mode)}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                sortMode === mode
                  ? "bg-gauge-500/20 text-gauge-400"
                  : "text-forest-300 hover:bg-forest-800 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowCompleted((v) => !v)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
            showCompleted
              ? "border-gauge-500/40 bg-gauge-500/10 text-gauge-400"
              : "border-forest-800 bg-forest-900/80 text-forest-300 hover:bg-forest-800"
          }`}
        >
          <CheckSquare className="h-3.5 w-3.5" />
          {showCompleted ? "Showing completed" : "Show completed"}
        </button>
      </div>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <div className="mt-8 rounded-xl border border-forest-800 bg-forest-900/80 p-8 text-center">
          <CheckSquare className="mx-auto h-10 w-10 text-forest-600" />
          <p className="mt-3 text-forest-400">
            {tasks.length === 0
              ? "No tasks yet. Create tasks from event pages."
              : "All tasks are completed!"}
          </p>
        </div>
      ) : grouped ? (
        // Grouped view (by assignee or event)
        <div className="mt-6 space-y-6">
          {Array.from(grouped.entries()).map(([groupName, groupTasks]) => (
            <section key={groupName}>
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-forest-400">
                {sortMode === "assignee" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {groupName}
                <span className="text-forest-500">({groupTasks.length})</span>
              </h2>
              <ul className="mt-2 space-y-2">
                {groupTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    eventName={task.eventId ? eventMap.get(task.eventId)?.name : undefined}
                    showEvent={sortMode === "assignee"}
                    showAssignee={sortMode === "event"}
                    isOfficer={isOfficer}
                    togglingId={togglingId}
                    deletingId={deletingId}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        // Flat view (by deadline)
        <ul className="mt-6 space-y-2">
          {filteredTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              eventName={task.eventId ? eventMap.get(task.eventId)?.name : undefined}
              showEvent
              showAssignee
              isOfficer={isOfficer}
              togglingId={togglingId}
              deletingId={deletingId}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({
  task,
  eventName,
  showEvent,
  showAssignee,
  isOfficer,
  togglingId,
  deletingId,
  onToggle,
  onDelete,
}: {
  task: CriticalActionItem;
  eventName?: string;
  showEvent?: boolean;
  showAssignee?: boolean;
  isOfficer?: boolean;
  togglingId: string | null;
  deletingId: string | null;
  onToggle: (task: CriticalActionItem) => void;
  onDelete: (id: string) => void;
}) {
  const isPastDue = !task.completed && task.dueDate < new Date().toISOString().slice(0, 10);

  return (
    <li
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${
        task.completed
          ? "border-green-700/50 bg-green-900/10"
          : isPastDue
            ? "border-red-700/50 bg-red-900/10"
            : "border-forest-800 bg-forest-900/80"
      }`}
    >
      {isOfficer && (
        <button
          type="button"
          onClick={() => onToggle(task)}
          disabled={togglingId === task.id}
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
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-forest-400">
          {showAssignee && (
            <span>{task.assigneeEmail}</span>
          )}
          {showEvent && eventName && (
            <Link
              href={`/events/${task.eventId}`}
              className="text-gauge-400 hover:text-gauge-300"
            >
              {eventName}
            </Link>
          )}
          <span className={isPastDue ? "font-medium text-red-400" : ""}>
            Due {new Date(task.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {isPastDue && " (overdue)"}
          </span>
        </div>
      </div>

      {isOfficer && (
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          disabled={deletingId === task.id}
          className="shrink-0 text-forest-500 transition hover:text-red-400 disabled:opacity-50"
          title="Delete task"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, ListChecks, CheckSquare, Calendar } from "lucide-react";
import { store } from "@/lib/store";
import type { SavedMinutes } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import { createCriticalActionItem } from "@/lib/supabaseData";

export default function MinutesDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [minutes, setMinutes] = useState<SavedMinutes | null>(null);
  const { profile } = useAuth();
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    setMinutes(store.minutes.getById(id) ?? null);
  }, [id]);

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

  const e = minutes.extracted;

  const canCreateReminders = Boolean(profile?.role === "officer" && profile.club_id);

  const handleAddReminder = async (index: number) => {
    if (!canCreateReminders || !profile?.club_id) return;
    const item = e.actionItems[index];
    if (!item) return;

    setCreateError(null);

    const defaultEmail = "";
    const email =
      typeof window !== "undefined"
        ? window.prompt(
            `Email address responsible for this action item:\n\n${item.task}`,
            defaultEmail
          )
        : null;
    if (!email) return;

    const defaultDue = item.due && item.due.match(/^\d{4}-\d{2}-\d{2}$/)
      ? item.due
      : "";
    const due =
      typeof window !== "undefined"
        ? window.prompt(
            "Due date for this action item (YYYY-MM-DD):",
            defaultDue
          )
        : null;
    if (!due) return;

    setCreatingIndex(index);
    try {
      const { error } = await createCriticalActionItem({
        clubId: profile.club_id,
        task: item.task,
        assigneeEmail: email,
        dueDate: due,
      });
      if (error) {
        setCreateError(error.message ?? "Failed to create reminder.");
      }
    } catch (err) {
      setCreateError((err as Error).message ?? "Failed to create reminder.");
    } finally {
      setCreatingIndex(null);
    }
  };

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
        <h1 className="text-2xl font-bold text-white">{e.title}</h1>
        <p className="mt-2 flex items-center gap-2 text-forest-400">
          <Calendar className="h-4 w-4" />
          {new Date(e.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Users className="h-5 w-5 text-gauge-400" />
            Attendees
          </h2>
          <ul className="mt-2 flex flex-wrap gap-2">
            {e.attendees.length === 0 ? (
              <li className="text-forest-400">None listed</li>
            ) : (
              e.attendees.map((name) => (
                <li
                  key={name}
                  className="rounded-lg border border-forest-700 bg-forest-800/80 px-3 py-1.5 text-sm text-forest-300"
                >
                  {name}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <ListChecks className="h-5 w-5 text-gauge-400" />
            Key decisions
          </h2>
          <ul className="mt-2 space-y-2">
            {e.keyDecisions.length === 0 ? (
              <li className="text-forest-400">None listed</li>
            ) : (
              e.keyDecisions.map((d, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-forest-800 bg-forest-800/80 px-4 py-2 text-forest-300"
                >
                  {d}
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <CheckSquare className="h-5 w-5 text-gauge-400" />
            Action items
          </h2>
          <ul className="mt-2 space-y-2">
            {e.actionItems.length === 0 ? (
              <li className="text-forest-400">None listed</li>
            ) : (
              e.actionItems.map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-forest-800 bg-forest-800/80 px-4 py-2 text-forest-300"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span>{a.task}</span>
                      {(a.assignee || a.due) && (
                        <span className="ml-2 text-sm text-forest-400">
                          {[a.assignee, a.due].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                    {canCreateReminders && (
                      <button
                        type="button"
                        onClick={() => handleAddReminder(i)}
                        disabled={creatingIndex === i}
                        className="mt-2 inline-flex items-center justify-center rounded-lg bg-gauge-500 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-gauge-400 disabled:opacity-60 sm:mt-0"
                      >
                        {creatingIndex === i ? "Adding..." : "Add email reminder"}
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
          {canCreateReminders && (
            <p className="mt-2 text-xs text-forest-500">
              Critical action items with reminders will email the assignee based on your club&apos;s reminder settings.
            </p>
          )}
          {createError && (
            <p className="mt-2 text-xs text-red-400">{createError}</p>
          )}
        </section>

        {e.nextMeeting && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-white">Next meeting</h2>
            <p className="mt-2 text-forest-300">{e.nextMeeting}</p>
          </section>
        )}

        {e.notes && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-white">Notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-forest-300">{e.notes}</p>
          </section>
        )}

        <p className="mt-8 text-xs text-forest-400">
          Saved{" "}
          {new Date(minutes.createdAt).toLocaleString("en-US")}
        </p>
      </div>
    </div>
  );
}

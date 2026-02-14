"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, ListChecks, CheckSquare, Calendar } from "lucide-react";
import { store } from "@/lib/store";
import type { SavedMinutes } from "@/types";

export default function MinutesDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [minutes, setMinutes] = useState<SavedMinutes | null>(null);

  useEffect(() => {
    setMinutes(store.minutes.getById(id) ?? null);
  }, [id]);

  if (!minutes) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-slate-500">Meeting minutes not found.</p>
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/minutes"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to minutes
      </Link>

      <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <h1 className="text-2xl font-bold text-white">{e.title}</h1>
        <p className="mt-2 flex items-center gap-2 text-slate-500">
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
              <li className="text-slate-500">None listed</li>
            ) : (
              e.attendees.map((name) => (
                <li
                  key={name}
                  className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-sm text-slate-300"
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
              <li className="text-slate-500">None listed</li>
            ) : (
              e.keyDecisions.map((d, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-slate-800 bg-slate-800/50 px-4 py-2 text-slate-300"
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
              <li className="text-slate-500">None listed</li>
            ) : (
              e.actionItems.map((a, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-slate-800 bg-slate-800/50 px-4 py-2 text-slate-300"
                >
                  <span>{a.task}</span>
                  {(a.assignee || a.due) && (
                    <span className="ml-2 text-sm text-slate-500">
                      {[a.assignee, a.due].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>

        {e.nextMeeting && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-white">Next meeting</h2>
            <p className="mt-2 text-slate-400">{e.nextMeeting}</p>
          </section>
        )}

        {e.notes && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-white">Notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-slate-400">{e.notes}</p>
          </section>
        )}

        <p className="mt-8 text-xs text-slate-600">
          Saved{" "}
          {new Date(minutes.createdAt).toLocaleString("en-US")}
        </p>
      </div>
    </div>
  );
}

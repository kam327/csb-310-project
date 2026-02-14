"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { store, generateId } from "@/lib/store";
import type { Event } from "@/types";

export default function CheckInPage() {
  const params = useParams();
  const router = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const e = store.events.getById(eventId);
    setEvent(e ?? null);
  }, [eventId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    const member = store.members.getOrCreateFromCheckIn(name.trim(), email.trim() || undefined);
    store.checkIns.add({
      id: generateId(),
      eventId,
      memberName: member.name,
      memberEmail: member.email,
      checkedInAt: new Date().toISOString(),
    });
    setSubmitted(true);
  };

  if (!event) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4">
        <p className="text-slate-500">Event not found.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-400">
          <CheckCircle className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-xl font-bold text-white">You&apos;re checked in!</h1>
        <p className="mt-2 text-slate-400">
          Thanks for attending <span className="font-medium text-white">{event.name}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
        <h1 className="text-xl font-bold text-white">Check in</h1>
        <p className="mt-1 text-slate-400">{event.name}</p>
        <p className="text-sm text-slate-500">
          {new Date(event.date).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="checkin-name" className="block text-sm font-medium text-slate-300">
              Your name <span className="text-red-400">*</span>
            </label>
            <input
              id="checkin-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First and last name"
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
            />
          </div>
          <div>
            <label htmlFor="checkin-email" className="block text-sm font-medium text-slate-300">
              Email (optional)
            </label>
            <input
              id="checkin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 font-semibold text-slate-900 transition hover:bg-brand-400"
          >
            Check in
          </button>
        </form>
      </div>
    </div>
  );
}

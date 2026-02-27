"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import type { Event } from "@/types";
import { fetchEventById, insertCheckIn } from "@/lib/supabaseData";

export default function CheckInPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchEventById(eventId).then(setEvent);
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }

    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    setSubmitting(true);
    const { error: err } = await insertCheckIn(eventId, {
      memberName: trimmedName,
      memberEmail: trimmedEmail,
    });
    setSubmitting(false);
    if (err) {
      const supabaseError = err as Error & { code?: string };

      let message: string;
      if (supabaseError.code === "23505") {
        // Postgres unique violation – likely same attendee for this event
        message = "It looks like you've already checked in for this event.";
      } else if (
        supabaseError.message &&
        supabaseError.message.includes('null value in column "member_email"')
      ) {
        message = "Please enter your email address to check in.";
      } else {
        message = "We couldn't complete your check-in. Please try again in a moment.";
      }
      setError(message);
      return;
    }
    setSubmitted(true);
  };

  if (!event) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4">
        <p className="text-forest-400">Event not found.</p>
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
        <p className="mt-2 text-forest-300">
          Thanks for attending <span className="font-medium text-white">{event.name}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-forest-800 bg-forest-900/90 p-6 shadow-xl">
        <h1 className="text-xl font-bold text-white">Check in</h1>
        <p className="mt-1 text-forest-300">{event.name}</p>
        <p className="text-sm text-forest-400">
          {new Date(event.date).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="checkin-name" className="block text-sm font-medium text-forest-300">
              Your name <span className="text-red-400">*</span>
            </label>
            <input
              id="checkin-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First and last name"
              autoComplete="name"
              className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-3 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
            />
          </div>
          <div>
            <label htmlFor="checkin-email" className="block text-sm font-medium text-forest-300">
              Email <span className="text-red-400">*</span>
            </label>
            <input
              id="checkin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-3 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 font-semibold text-slate-900 transition hover:bg-brand-400 disabled:opacity-60"
          >
            {submitting ? "Checking in…" : "Check in"}
          </button>
        </form>
      </div>
    </div>
  );
}

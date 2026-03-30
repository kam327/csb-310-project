"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, QrCode, Users, Tag } from "lucide-react";
import type { Event } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/components/AuthProvider";
import {
  fetchEvents,
  fetchAttendanceForClub,
  fetchEventCategories,
  type EventCategory,
} from "@/lib/supabaseData";

export default function EventsPage() {
  const { user, profile, loading, profileError, refreshProfile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [checkInsByEvent, setCheckInsByEvent] = useState<Record<string, number>>({});
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [expenses, setExpenses] = useState<string>("");
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.club_id) {
      setCategories([]);
      return;
    }
    fetchEventCategories(profile.club_id).then(setCategories);
  }, [profile?.club_id]);

  const refreshEvents = async () => {
    if (!profile?.club_id) return;
    const list = await fetchEvents(profile.club_id);
    setEvents(list);
    const checkIns = await fetchAttendanceForClub(profile.club_id);
    const byEvent: Record<string, number> = {};
    checkIns.forEach((c) => {
      byEvent[c.eventId] = (byEvent[c.eventId] ?? 0) + 1;
    });
    setCheckInsByEvent(byEvent);
  };

  useEffect(() => {
    if (!profile?.club_id) {
      setEvents([]);
      setCheckInsByEvent({});
      return;
    }
    refreshEvents();
  }, [profile?.club_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;
    if (!user || !profile) {
      setError("You need to be signed in to create events.");
      return;
    }
    setSaving(true);
    setError(null);

    // Prevent creating events in the past (only allow today or future).
    const now = new Date();
    const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (date < todayYmd) {
      setSaving(false);
      setError("You can only create events for today or future dates.");
      return;
    }

    const hasStart = Boolean(time);
    const hasEnd = Boolean(endTime);
    if (hasStart !== hasEnd) {
      setSaving(false);
      setError("Please provide both a start and end time, or leave both blank.");
      return;
    }

    const hasTimes = hasStart && hasEnd;

    if (hasTimes) {
      // Simple guard: ensure end time is after start time (same day)
      const [startHour, startMinute] = time.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      if (endMinutes <= startMinutes) {
        setSaving(false);
        setError("End time must be after the start time.");
        return;
      }
    }

    const qrToken = crypto.randomUUID();

    try {
      const parsedExpense =
        expenses.trim() === "" ? null : Number(expenses.trim());
      if (
        expenses.trim() !== "" &&
        (!Number.isFinite(parsedExpense) || parsedExpense < 0)
      ) {
        setSaving(false);
        setError("Expenses must be a non-negative number (or leave it blank).");
        return;
      }

      const commonPayload = {
        club_id: profile.club_id,
        title: name.trim(),
        description: description.trim() || null,
        event_date: date,
        event_time: hasTimes ? time : null,
        event_end_time: hasTimes ? endTime : null,
        category: category || null,
        location: null,
        qr_token: qrToken,
      };

      const lowerPayload =
        parsedExpense === null
          ? commonPayload
          : { ...commonPayload, expenses: parsedExpense };

      const { data, error } = await supabase
        .from("events")
        .insert(lowerPayload)
        .select(
          "id, title, description, event_date, event_time, event_end_time, category, created_at"
        )
        .single();

      // If the physical column is named `Expenses` (capital E), retry.
      let finalData = data;
      let finalErr = error;
      if (finalErr && parsedExpense !== null) {
        const capitalPayload = { ...commonPayload, Expenses: parsedExpense };
        const retry = await supabase
          .from("events")
          .insert(capitalPayload)
          .select(
            "id, title, description, event_date, event_time, event_end_time, category, created_at"
          )
          .single();
        finalData = retry.data;
        finalErr = retry.error;
      }

      if (finalErr || !finalData) {
        setError(finalErr?.message ?? "Failed to create event in Supabase.");
      } else {
        await refreshEvents();
        setName("");
        setDate("");
        setTime("");
        setEndTime("");
        setDescription("");
        setCategory("");
        setExpenses("");
        setShowForm(false);
      }
    } catch (err) {
      setError((err as Error).message ?? "Failed to create event.");
    } finally {
      setSaving(false);
    }
  };

  const now = new Date();
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const eventDateTime = (e: Event) => {
    const timeStr = e.time ?? "00:00";
    return new Date(`${e.date}T${timeStr}`);
  };
  const upcoming = events
    .filter((e) => eventDateTime(e) >= now)
    .sort((a, b) => eventDateTime(a).getTime() - eventDateTime(b).getTime());
  const past = events
    .filter((e) => eventDateTime(e) < now)
    .sort((a, b) => eventDateTime(b).getTime() - eventDateTime(a).getTime());

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Events</h1>
          <p className="mt-1 text-forest-300">
            Create events and use QR check-in to track attendance
          </p>
        </div>
        {loading ? (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-lg border border-forest-700 bg-forest-900/80 px-4 py-2.5 text-sm font-semibold text-forest-300 opacity-70"
          >
            Loading…
          </button>
        ) : user && !profile ? (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-lg border border-forest-700 bg-forest-900/80 px-4 py-2.5 text-sm font-semibold text-forest-300 opacity-70"
          >
            Choose your club…
          </button>
        ) : user && profile ? (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-brand-400"
          >
            <Plus className="h-4 w-4" />
            New event
          </button>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg border border-forest-700 bg-forest-900/80 px-4 py-2.5 text-sm font-semibold text-forest-300 transition hover:bg-forest-800"
          >
            Sign in to create events
          </Link>
        )}
      </div>

      {!loading && user && !profile && (
        <div className="mt-6 rounded-xl border border-forest-800 bg-forest-900/80 p-5">
          <p className="text-sm font-medium text-white">Profile not ready yet.</p>
          <p className="mt-1 text-sm text-forest-300">
            Finish setup to associate your account with a club.
          </p>
          {profileError && (
            <p className="mt-2 text-sm text-red-300">{profileError}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/onboarding"
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-brand-400"
            >
              Choose your club
            </Link>
            <button
              type="button"
              onClick={() => refreshProfile()}
              className="rounded-lg bg-forest-800 px-3 py-2 text-sm font-semibold text-forest-100 hover:bg-forest-700"
            >
              Retry loading profile
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mt-8 rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Create event</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="event-name" className="block text-sm font-medium text-forest-300">
                Event name
              </label>
              <input
                id="event-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. General Meeting – Fall 2025"
                className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                required
              />
            </div>
            <div>
              <label htmlFor="event-date" className="block text-sm font-medium text-forest-300">
                Date
              </label>
              <input
                id="event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={todayYmd}
                className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                required
              />
            </div>
            <div>
              <label htmlFor="event-time" className="block text-sm font-medium text-forest-300">
                Start time
              </label>
              <input
                id="event-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                required
              />
            </div>
            <div>
              <label htmlFor="event-end-time" className="block text-sm font-medium text-forest-300">
                End time
              </label>
              <input
                id="event-end-time"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                required
              />
            </div>
            <div>
              <label htmlFor="event-category" className="block text-sm font-medium text-forest-300">
                Category
              </label>
              <select
                id="event-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
              >
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-forest-500">
                Manage categories in club settings.
              </p>
            </div>
            <div>
              <label htmlFor="event-desc" className="block text-sm font-medium text-forest-300">
                Description (optional)
              </label>
              <textarea
                id="event-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the event"
                rows={2}
                className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
              />
            </div>
            <div>
              <label htmlFor="event-expenses" className="block text-sm font-medium text-forest-300">
                Expenses (optional)
              </label>
              <input
                id="event-expenses"
                type="number"
                inputMode="decimal"
                step="1"
                min={0}
                value={expenses}
                onChange={(e) => setExpenses(e.target.value)}
                placeholder="e.g. 500"
                className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
              />
              <p className="mt-1 text-xs text-forest-500">
                Used for the “Cost per attendee” trend.
              </p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-brand-400 disabled:opacity-60"
              >
                {saving ? "Creating..." : "Create event"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-forest-600 px-4 py-2.5 font-medium text-forest-300 transition hover:bg-forest-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-white">Upcoming</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} checkInCount={checkInsByEvent[e.id] ?? 0} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">
          Past events {past.length > 0 && `(${past.length})`}
        </h2>
        {past.length === 0 && events.length === 0 ? (
          <p className="mt-4 text-forest-400">No events yet. Create one to get started.</p>
        ) : past.length === 0 ? (
          <p className="mt-4 text-forest-400">No past events.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((e) => (
              <EventCard key={e.id} event={e} past checkInCount={checkInsByEvent[e.id] ?? 0} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EventCard({ event, past, checkInCount }: { event: Event; past?: boolean; checkInCount: number }) {
  return (
    <li className="rounded-xl border border-forest-800 bg-forest-900/80 p-5 transition hover:border-forest-700">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{event.name}</h3>
            {event.category && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gauge-500/20 px-2 py-0.5 text-xs font-medium text-gauge-300">
                <Tag className="h-3 w-3" />
                {event.category}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-forest-400">
            {new Date(event.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {event.description && (
            <p className="mt-2 text-sm text-forest-300 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-forest-400">
          <Users className="h-4 w-4" />
          {checkInCount} check-in{checkInCount !== 1 ? "s" : ""}
        </span>
        <Link
          href={`/events/${event.id}`}
          className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-gauge-400 hover:text-gauge-300"
        >
          {past ? "View" : "QR & check-in"}
          <QrCode className="h-4 w-4" />
        </Link>
      </div>
    </li>
  );
}

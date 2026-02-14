"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Calendar, QrCode, Users } from "lucide-react";
import { store, generateId } from "@/lib/store";
import type { Event } from "@/types";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    setEvents(store.events.getAll());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date) return;
    const event: Event = {
      id: generateId(),
      name: name.trim(),
      date,
      description: description.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    store.events.add(event);
    setEvents(store.events.getAll());
    setName("");
    setDate("");
    setDescription("");
    setShowForm(false);
  };

  const now = new Date();
  const upcoming = events
    .filter((e) => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = events
    .filter((e) => new Date(e.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Events</h1>
          <p className="mt-1 text-slate-400">
            Create events and use QR check-in to track attendance
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-brand-400"
        >
          <Plus className="h-4 w-4" />
          New event
        </button>
      </div>

      {showForm && (
        <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white">Create event</h2>
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div>
              <label htmlFor="event-name" className="block text-sm font-medium text-slate-300">
                Event name
              </label>
              <input
                id="event-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. General Meeting – Fall 2025"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                required
              />
            </div>
            <div>
              <label htmlFor="event-date" className="block text-sm font-medium text-slate-300">
                Date
              </label>
              <input
                id="event-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                required
              />
            </div>
            <div>
              <label htmlFor="event-desc" className="block text-sm font-medium text-slate-300">
                Description (optional)
              </label>
              <textarea
                id="event-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the event"
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-brand-500 px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-brand-400"
              >
                Create event
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-600 px-4 py-2.5 font-medium text-slate-300 transition hover:bg-slate-800"
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
              <EventCard key={e.id} event={e} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-white">
          Past events {past.length > 0 && `(${past.length})`}
        </h2>
        {past.length === 0 && events.length === 0 ? (
          <p className="mt-4 text-slate-500">No events yet. Create one to get started.</p>
        ) : past.length === 0 ? (
          <p className="mt-4 text-slate-500">No past events.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {past.map((e) => (
              <EventCard key={e.id} event={e} past />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EventCard({ event, past }: { event: Event; past?: boolean }) {
  const checkInCount = store.checkIns.getByEventId(event.id).length;

  return (
    <li className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition hover:border-slate-700">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-white">{event.name}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(event.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {event.description && (
            <p className="mt-2 text-sm text-slate-400 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm text-slate-500">
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

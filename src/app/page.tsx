"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Users, FileText, TrendingUp, ArrowRight } from "lucide-react";
import { store } from "@/lib/store";
import type { Event, CheckIn, SavedMinutes } from "@/types";
import { CheckInsOverTimeChart } from "@/components/CheckInsOverTimeChart";
import { EngagementTrendChart } from "@/components/EngagementTrendChart";
import { EventAttendanceChart } from "@/components/EventAttendanceChart";

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [minutes, setMinutes] = useState<SavedMinutes[]>([]);
  const [membersCount, setMembersCount] = useState(0);

  useEffect(() => {
    setEvents(store.events.getAll());
    setCheckIns(store.checkIns.getAll());
    setMinutes(store.minutes.getAll());
    setMembersCount(store.members.getAll().length);
  }, []);

  const now = new Date();
  const upcomingEvents = events
    .filter((e) => new Date(e.date) >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);
  const recentEvents = events
    .filter((e) => new Date(e.date) < now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);
  const totalCheckIns = checkIns.length;
  const recentMinutes = minutes.slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
      <p className="mt-1 text-forest-300">
        Overview of your club&apos;s activity and data
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Calendar}
          label="Events"
          value={events.length}
          href="/events"
        />
        <StatCard
          icon={Users}
          label="Members"
          value={membersCount}
          href="/members"
        />
        <StatCard
          icon={TrendingUp}
          label="Total check-ins"
          value={totalCheckIns}
        />
        <StatCard
          icon={FileText}
          label="Meeting minutes"
          value={minutes.length}
          href="/minutes"
        />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-white">Trends</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
            <h3 className="text-sm font-medium text-forest-300">
              Check-ins by week (last 12 weeks)
            </h3>
            <div className="mt-4">
              <CheckInsOverTimeChart />
            </div>
            <p className="mt-2 text-xs text-forest-400">
              Total check-ins per week
            </p>
          </div>
          <div className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
            <h3 className="text-sm font-medium text-forest-300">
              Engagement trend (12 weeks)
            </h3>
            <div className="mt-4">
              <EngagementTrendChart />
            </div>
            <p className="mt-2 text-xs text-forest-400">
              Weekly check-in trend over time
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <h3 className="text-sm font-medium text-forest-300">
            Attendance by event (last 10 events)
          </h3>
          <div className="mt-4 min-h-[200px]">
            <EventAttendanceChart />
          </div>
          {events.filter((e) => new Date(e.date) < now).length === 0 && (
            <p className="mt-4 text-forest-400">No past events yet. Create events and check-ins to see attendance by event.</p>
          )}
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Upcoming events</h2>
            <Link
              href="/events"
              className="text-sm font-medium text-gauge-400 hover:text-gauge-300"
            >
              View all
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="mt-4 text-forest-400">No upcoming events.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {upcomingEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-lg border border-forest-800 bg-forest-800/80 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-white">{e.name}</p>
                    <p className="text-sm text-forest-400">
                      {new Date(e.date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <Link
                    href={`/events/${e.id}`}
                    className="text-gauge-400 hover:text-gauge-300"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent minutes</h2>
            <Link
              href="/minutes"
              className="text-sm font-medium text-gauge-400 hover:text-gauge-300"
            >
              View all
            </Link>
          </div>
          {recentMinutes.length === 0 ? (
            <p className="mt-4 text-forest-400">No meeting minutes yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentMinutes.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg border border-forest-800 bg-forest-800/80 px-4 py-3"
                >
                  <p className="font-medium text-white">{m.extracted.title}</p>
                  <p className="text-sm text-forest-400">
                    {new Date(m.extracted.date).toLocaleDateString("en-US")} ·{" "}
                    {m.extracted.attendees.length} attendees
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {recentEvents.length > 0 && (
        <section className="mt-8 rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Recent past events</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {recentEvents.map((e) => {
              const count = store.checkIns.getByEventId(e.id).length;
              return (
                <li
                  key={e.id}
                  className="rounded-lg border border-forest-800 bg-forest-800/80 px-4 py-3"
                >
                  <p className="font-medium text-white">{e.name}</p>
                  <p className="text-sm text-forest-400">
                    {new Date(e.date).toLocaleDateString("en-US")} · {count}{" "}
                    check-ins
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-4 rounded-xl border border-forest-800 bg-forest-900/80 p-5 transition hover:border-forest-700">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gauge-500/20 text-gauge-400">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-forest-400">{label}</p>
      </div>
    </div>
  );
  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

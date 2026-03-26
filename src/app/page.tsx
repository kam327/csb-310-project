"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Users, CheckSquare, TrendingUp, ArrowRight } from "lucide-react";
import type { Event, CheckIn } from "@/types";
import { EngagementTrendChart } from "@/components/EngagementTrendChart";
import { EventAttendanceChart } from "@/components/EventAttendanceChart";
import { DayOfWeekHeatmap } from "@/components/DayOfWeekHeatmap";
import { useAuth } from "@/components/AuthProvider";
import {
  fetchEvents,
  fetchAttendanceForClub,
  membersFromCheckIns,
  fetchClub,
  fetchClubUsers,
  fetchCriticalActionItems,
} from "@/lib/supabaseData";

export default function HomePage() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [openTasksCount, setOpenTasksCount] = useState(0);
  const [membersCount, setMembersCount] = useState(0);
  const [clubName, setClubName] = useState<string | null>(null);
  const [clubUsers, setClubUsers] = useState<
    { id: string; role: string | null; display_name: string | null; email: string | null }[]
  >([]);

  useEffect(() => {
    if (profile?.club_id) {
      Promise.all([
        fetchEvents(profile.club_id),
        fetchAttendanceForClub(profile.club_id),
        fetchClub(profile.club_id),
        fetchClubUsers(profile.club_id),
        fetchCriticalActionItems(profile.club_id),
      ]).then(([evs, cis, club, users, tasks]) => {
        setEvents(evs);
        setCheckIns(cis);
        setMembersCount(membersFromCheckIns(cis).length);
        setClubName(club?.name ?? null);
        setClubUsers(users ?? []);
        setOpenTasksCount(tasks.filter((t) => !t.completed).length);
      });
    } else {
      setEvents([]);
      setCheckIns([]);
      setMembersCount(0);
      setClubName(null);
      setClubUsers([]);
      setOpenTasksCount(0);
    }
  }, [profile?.club_id]);

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold text-white sm:text-3xl">Dashboard</h1>
      <p className="mt-1 text-forest-300">
        Overview of your club&apos;s activity and data
      </p>

      {clubName && (
        <section className="mt-4 rounded-xl border border-forest-800 bg-forest-900/80 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-forest-400">
                Club
              </p>
              <p className="mt-1 text-xl font-semibold text-white">{clubName}</p>
              <p className="mt-1 text-xs text-forest-400">
                {clubUsers.length} authenticated user
                {clubUsers.length === 1 ? "" : "s"} associated with this club.
              </p>
            </div>
            {clubUsers.length > 0 && (
              <div className="w-full max-w-sm rounded-lg border border-forest-800 bg-forest-950/60 p-3">
                <p className="text-xs font-medium text-forest-300">
                  Club users
                </p>
                <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-forest-200">
                  {clubUsers.map((u) => {
                    const label =
                      u.display_name ||
                      u.email ||
                      `${u.id.slice(0, 8)}…`;
                    return (
                      <li
                        key={u.id}
                        className="flex items-center justify-between rounded px-2 py-1 hover:bg-forest-900/70"
                      >
                        <span className="text-forest-200">{label}</span>
                        <span className="ml-3 text-forest-400">
                          {u.role ?? "member"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

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
          icon={CheckSquare}
          label="Open tasks"
          value={openTasksCount}
        />
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-white">Trends</h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
            <h3 className="text-sm font-medium text-forest-300">
              Avg check-ins by day of week
            </h3>
            <p className="mt-1 text-xs text-forest-400">
              Click a day to see the best time of day
            </p>
            <div className="mt-4">
              <DayOfWeekHeatmap events={events} checkIns={checkIns} />
            </div>
          </div>
          <div className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
            <h3 className="text-sm font-medium text-forest-300">
              Engagement trend (12 weeks)
            </h3>
            <div className="mt-4">
              <EngagementTrendChart checkIns={checkIns} />
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
            <EventAttendanceChart events={events} checkIns={checkIns} />
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
          <h2 className="text-lg font-semibold text-white">Open tasks</h2>
          {openTasksCount === 0 ? (
            <p className="mt-4 text-forest-400">No open tasks. Create tasks from event pages.</p>
          ) : (
            <p className="mt-4 text-forest-300">
              Your club has {openTasksCount} open task{openTasksCount !== 1 ? "s" : ""}. View event pages to manage them.
            </p>
          )}
        </section>
      </div>

      {recentEvents.length > 0 && (
        <section className="mt-8 rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">Recent past events</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {recentEvents.map((e) => {
              const count = checkIns.filter((c) => c.eventId === e.id).length;
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

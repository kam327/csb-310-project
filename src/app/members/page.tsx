"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Mail,
  Calendar,
  DollarSign,
  Save,
  ArrowUpDown,
  X,
  ChevronRight,
} from "lucide-react";
import type { Event, Member } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  fetchAttendanceForClub,
  membersFromCheckIns,
  enrichMembersWithOfficers,
  fetchClub,
  fetchClubUsers,
  fetchMemberDues,
  upsertMemberDues,
  fetchEvents,
} from "@/lib/supabaseData";

type SortMode =
  | "nameAsc"
  | "nameDesc"
  | "eventsDesc"
  | "eventsAsc"
  | "lastCheckIn"
  | "rosterNewest"
  | "rosterOldest";

/** For “last check-in”: no check-in date sorts last when showing recent first. */
function lastCheckInTime(m: Member): number {
  if (m.lastSeen) return new Date(m.lastSeen).getTime();
  return 0;
}

function sortMembers(list: Member[], sortBy: SortMode): Member[] {
  const byName = (a: Member, b: Member, desc: boolean) => {
    const c = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    if (c !== 0) return desc ? -c : c;
    return a.id.localeCompare(b.id);
  };

  return [...list].sort((a, b) => {
    switch (sortBy) {
      case "nameAsc":
        return byName(a, b, false);
      case "nameDesc":
        return byName(a, b, true);
      case "eventsDesc": {
        const d = b.eventsAttended - a.eventsAttended;
        if (d !== 0) return d;
        return byName(a, b, false);
      }
      case "eventsAsc": {
        const d = a.eventsAttended - b.eventsAttended;
        if (d !== 0) return d;
        return byName(a, b, false);
      }
      case "lastCheckIn": {
        const d = lastCheckInTime(b) - lastCheckInTime(a);
        if (d !== 0) return d;
        return byName(a, b, false);
      }
      case "rosterNewest": {
        const d =
          new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime();
        if (d !== 0) return d;
        return byName(a, b, false);
      }
      case "rosterOldest": {
        const d =
          new Date(a.firstSeen).getTime() - new Date(b.firstSeen).getTime();
        if (d !== 0) return d;
        return byName(a, b, false);
      }
      default:
        return 0;
    }
  });
}

function sortAttendanceForDisplay(
  rows: Member["eventAttendance"],
  eventsById: Map<string, Event>
) {
  return [...rows].sort((a, b) => {
    const ea = eventsById.get(a.eventId);
    const eb = eventsById.get(b.eventId);
    const da = ea?.date ?? "";
    const db = eb?.date ?? "";
    if (db !== da) return db.localeCompare(da);
    return (ea?.name ?? "").localeCompare(eb?.name ?? "");
  });
}

export default function MembersPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [tracksDues, setTracksDues] = useState(false);
  const [savedDuesMap, setSavedDuesMap] = useState<Map<string, boolean>>(new Map());
  const [draftDuesMap, setDraftDuesMap] = useState<Map<string, boolean>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>("lastCheckIn");
  const [showFilter, setShowFilter] = useState<"everyone" | "officers">("everyone");
  const [duesFilter, setDuesFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [clubEvents, setClubEvents] = useState<Event[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const isOfficer = profile?.role === "officer";

  const closeDetail = useCallback(() => setSelectedMember(null), []);

  useEffect(() => {
    if (!profile?.club_id) {
      setMembers([]);
      setClubEvents([]);
      setTracksDues(false);
      setSavedDuesMap(new Map());
      setDraftDuesMap(new Map());
      setSelectedMember(null);
      return;
    }
    const clubId = profile.club_id;

    Promise.all([
      fetchAttendanceForClub(clubId),
      fetchClubUsers(clubId),
    ]).then(([checkIns, clubUsers]) => {
      const base = membersFromCheckIns(checkIns);
      setMembers(enrichMembersWithOfficers(base, clubUsers));
    });

    fetchEvents(clubId).then(setClubEvents);

    fetchClub(clubId).then((club) => {
      setTracksDues(club?.tracks_dues ?? false);
    });

    fetchMemberDues(clubId).then((map) => {
      setSavedDuesMap(map);
      setDraftDuesMap(new Map(map));
    });
  }, [profile?.club_id]);

  useEffect(() => {
    if (!selectedMember) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedMember, closeDetail]);

  const duesKey = useCallback(
    (m: Member) => (m.email ?? m.id).toLowerCase().trim(),
    []
  );

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (showFilter === "officers" && !m.isOfficerAccount) return false;
      if (!tracksDues || duesFilter === "all") return true;
      const paid = draftDuesMap.get(duesKey(m)) ?? false;
      if (duesFilter === "paid") return paid;
      return !paid;
    });
  }, [members, showFilter, tracksDues, duesFilter, draftDuesMap, duesKey]);

  const sorted = useMemo(
    () => sortMembers(filtered, sortBy),
    [filtered, sortBy]
  );

  const eventsById = useMemo(
    () => new Map(clubEvents.map((e) => [e.id, e])),
    [clubEvents]
  );

  useEffect(() => {
    if (!selectedMember) return;
    if (!sorted.some((x) => x.id === selectedMember.id)) closeDetail();
  }, [sorted, selectedMember, closeDetail]);

  const handleToggleDraft = (emailKey: string) => {
    setDraftDuesMap((prev) => {
      const copy = new Map(prev);
      copy.set(emailKey, !(copy.get(emailKey) ?? false));
      return copy;
    });
    setSaveSuccess(false);
    setSaveError(null);
  };

  const changedKeys = Array.from(draftDuesMap.entries()).filter(
    ([key, val]) => (savedDuesMap.get(key) ?? false) !== val
  );
  const hasUnsavedChanges = changedKeys.length > 0;

  const handleSaveDues = async () => {
    if (!profile?.club_id || changedKeys.length === 0) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    let failed = false;
    for (const [key, val] of changedKeys) {
      const { error } = await upsertMemberDues({
        clubId: profile.club_id,
        memberEmail: key,
        duesPaid: val,
      });
      if (error) {
        setSaveError(error.message ?? "Failed to save dues changes.");
        failed = true;
        break;
      }
    }

    if (!failed) {
      setSavedDuesMap(new Map(draftDuesMap));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    setSaving(false);
  };

  const handleDiscardChanges = () => {
    setDraftDuesMap(new Map(savedDuesMap));
    setSaveError(null);
    setSaveSuccess(false);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Members</h1>
        <p className="mt-1 text-forest-300">
          Everyone who has checked in or been added. Data carries forward across
          leadership transitions.
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-forest-800 bg-forest-900/80 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex items-center gap-2 text-forest-300">
            <Users className="h-5 w-5" />
            <span className="font-medium text-white">
              {sorted.length !== members.length
                ? `${sorted.length} shown (${members.length} total)`
                : `${sorted.length} ${members.length === 1 ? "member" : "members"}`}
            </span>
          </div>

          {members.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <label className="flex items-center gap-2 text-xs text-forest-400">
                <ArrowUpDown className="h-4 w-4 shrink-0" />
                <span className="shrink-0">Sort</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortMode)}
                  className="min-w-[12rem] rounded-lg border border-forest-700 bg-forest-950 py-2 pl-3 pr-8 text-sm text-white focus:border-gauge-500/50 focus:outline-none focus:ring-1 focus:ring-gauge-500/40"
                >
                  <option value="nameAsc">Name (A–Z)</option>
                  <option value="nameDesc">Name (Z–A)</option>
                  <option value="eventsDesc">Most events</option>
                  <option value="eventsAsc">Least events</option>
                  <option value="lastCheckIn">Last check-in (recent first)</option>
                  <option value="rosterNewest">Joined roster (newest first)</option>
                  <option value="rosterOldest">Joined roster (oldest first)</option>
                </select>
              </label>

              <label className="flex items-center gap-2 text-xs text-forest-400">
                <span className="shrink-0">Show</span>
                <select
                  value={showFilter}
                  onChange={(e) =>
                    setShowFilter(e.target.value as "everyone" | "officers")
                  }
                  className="min-w-[10rem] rounded-lg border border-forest-700 bg-forest-950 py-2 pl-3 pr-8 text-sm text-white focus:border-gauge-500/50 focus:outline-none focus:ring-1 focus:ring-gauge-500/40"
                >
                  <option value="everyone">Everyone</option>
                  <option value="officers">Officers only</option>
                </select>
              </label>

              {tracksDues && (
                <label className="flex items-center gap-2 text-xs text-forest-400">
                  <span className="shrink-0">Dues</span>
                  <select
                    value={duesFilter}
                    onChange={(e) =>
                      setDuesFilter(e.target.value as "all" | "paid" | "unpaid")
                    }
                    className="min-w-[9rem] rounded-lg border border-forest-700 bg-forest-950 py-2 pl-3 pr-8 text-sm text-white focus:border-gauge-500/50 focus:outline-none focus:ring-1 focus:ring-gauge-500/40"
                  >
                    <option value="all">All</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </label>
              )}
            </div>
          )}
        </div>

        {members.length === 0 ? (
          <p className="mt-6 text-forest-400">
            No members yet. Members appear here when they check in to an event
            or when you add them manually (coming soon).
          </p>
        ) : sorted.length === 0 ? (
          <p className="mt-6 text-forest-400">
            No one matches the current filters. Try Show: Everyone or Dues:
            All.
          </p>
        ) : (
          <>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sorted.map((m) => {
                const emailKey = (m.email ?? m.id).toLowerCase().trim();
                const duesPaid = draftDuesMap.get(emailKey) ?? false;
                const isChanged =
                  (savedDuesMap.get(emailKey) ?? false) !== duesPaid;

                return (
                  <li
                    key={m.id}
                    className={`overflow-hidden rounded-lg border ${
                      isChanged
                        ? "border-gauge-500/50 bg-forest-800/80"
                        : "border-forest-800 bg-forest-800/80"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className="w-full px-4 py-4 text-left transition hover:bg-forest-800/90"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-white">{m.name}</p>
                        {m.isOfficerAccount && (
                          <span className="rounded-full bg-gauge-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gauge-300">
                            Officer
                          </span>
                        )}
                      </div>
                      {m.email && (
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-forest-300">
                          <Mail className="h-3.5 w-3.5" />
                          {m.email}
                        </p>
                      )}
                      {m.eventsAttended === 0 ? (
                        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-forest-400">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          No check-ins yet
                          <span className="text-forest-500">
                            · On roster since{" "}
                            {new Date(m.firstSeen).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-forest-400">
                          <Calendar className="h-3.5 w-3.5" />
                          {m.eventsAttended} {m.eventsAttended === 1 ? "event" : "events"}
                          {" · "}First{" "}
                          {new Date(m.firstSeen).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {m.lastSeen &&
                            m.lastSeen !== m.firstSeen &&
                            ` · Last ${new Date(m.lastSeen).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}`}
                        </p>
                      )}
                    </button>

                    {tracksDues && (
                      <div className="flex items-center gap-2 border-t border-forest-800/80 px-4 py-3">
                        <DollarSign className="h-3.5 w-3.5 text-forest-400" />
                        {isOfficer ? (
                          <button
                            type="button"
                            onClick={() => handleToggleDraft(emailKey)}
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                              duesPaid
                                ? "bg-green-900/40 text-green-400 hover:bg-green-900/60"
                                : "bg-red-900/40 text-red-400 hover:bg-red-900/60"
                            }`}
                          >
                            {duesPaid ? "Dues paid" : "Dues unpaid"}
                          </button>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              duesPaid
                                ? "bg-green-900/40 text-green-400"
                                : "bg-red-900/40 text-red-400"
                            }`}
                          >
                            {duesPaid ? "Dues paid" : "Dues unpaid"}
                          </span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {tracksDues && isOfficer && hasUnsavedChanges && (
              <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-gauge-500/40 bg-forest-900/80 px-4 py-3">
                <p className="text-sm text-forest-300">
                  {changedKeys.length} unsaved{" "}
                  {changedKeys.length === 1 ? "change" : "changes"}
                </p>
                <button
                  type="button"
                  onClick={handleSaveDues}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-gauge-500 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-gauge-400 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={handleDiscardChanges}
                  disabled={saving}
                  className="inline-flex items-center justify-center rounded-lg border border-forest-700 px-3 py-2 text-sm font-medium text-forest-200 hover:bg-forest-800 disabled:opacity-60"
                >
                  Discard
                </button>
                {saveError && (
                  <p className="text-xs text-red-400">{saveError}</p>
                )}
              </div>
            )}

            {tracksDues && isOfficer && saveSuccess && (
              <p className="mt-4 text-sm text-green-400">
                Dues changes saved successfully.
              </p>
            )}
          </>
        )}
      </div>

      {selectedMember && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="presentation"
          onClick={closeDetail}
        >
          <div
            className="max-h-[85vh] w-full max-w-lg overflow-hidden rounded-xl border border-forest-700 bg-forest-900 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-forest-800 px-5 py-4">
              <div className="min-w-0">
                <h2
                  id="member-detail-title"
                  className="truncate text-lg font-semibold text-white"
                >
                  {selectedMember.name}
                </h2>
                {selectedMember.email && (
                  <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-forest-300">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {selectedMember.email}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="shrink-0 rounded-lg p-2 text-forest-400 transition hover:bg-forest-800 hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: "min(60vh, 24rem)" }}>
              <p className="text-xs font-medium uppercase tracking-wide text-forest-500">
                Events attended ({selectedMember.eventsAttended})
              </p>
              {selectedMember.eventAttendance.length === 0 ? (
                <p className="mt-3 text-sm text-forest-400">No event history yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {sortAttendanceForDisplay(
                    selectedMember.eventAttendance,
                    eventsById
                  ).map(({ eventId, checkedInAt }) => {
                    const ev = eventsById.get(eventId);
                    const title = ev?.name ?? "Event (removed or unavailable)";
                    const dateLabel = ev?.date
                      ? new Date(ev.date + "T12:00:00").toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : null;
                    const timeRange =
                      ev?.time != null
                        ? ev.endTime
                          ? `${ev.time}–${ev.endTime}`
                          : ev.time
                        : null;
                    return (
                      <li key={eventId}>
                        <Link
                          href={`/events/${eventId}`}
                          className="flex items-center gap-3 rounded-lg border border-forest-800 bg-forest-950/50 px-3 py-3 transition hover:border-gauge-500/40 hover:bg-forest-800/80"
                        >
                          <Calendar className="h-4 w-4 shrink-0 text-gauge-400" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white">{title}</p>
                            <p className="mt-0.5 text-xs text-forest-400">
                              {dateLabel}
                              {timeRange && ` · ${timeRange}`}
                            </p>
                            <p className="mt-0.5 text-xs text-forest-500">
                              Checked in{" "}
                              {new Date(checkedInAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-forest-500" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Mail, Calendar, DollarSign } from "lucide-react";
import type { Member } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  fetchAttendanceForClub,
  membersFromCheckIns,
  fetchClub,
  fetchMemberDues,
  upsertMemberDues,
} from "@/lib/supabaseData";

export default function MembersPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [tracksDues, setTracksDues] = useState(false);
  const [duesMap, setDuesMap] = useState<Map<string, boolean>>(new Map());
  const [togglingDues, setTogglingDues] = useState<Set<string>>(new Set());

  const isOfficer = profile?.role === "officer";

  useEffect(() => {
    if (!profile?.club_id) {
      setMembers([]);
      setTracksDues(false);
      setDuesMap(new Map());
      return;
    }
    const clubId = profile.club_id;

    fetchAttendanceForClub(clubId).then((checkIns) => {
      setMembers(membersFromCheckIns(checkIns));
    });

    fetchClub(clubId).then((club) => {
      setTracksDues(club?.tracks_dues ?? false);
    });

    fetchMemberDues(clubId).then(setDuesMap);
  }, [profile?.club_id]);

  const handleToggleDues = useCallback(
    async (memberEmail: string) => {
      if (!profile?.club_id || !memberEmail) return;
      const key = memberEmail.toLowerCase().trim();
      const current = duesMap.get(key) ?? false;
      const next = !current;

      setTogglingDues((s) => new Set(s).add(key));
      setDuesMap((prev) => new Map(prev).set(key, next));

      const { error } = await upsertMemberDues({
        clubId: profile.club_id,
        memberEmail: key,
        duesPaid: next,
      });

      if (error) {
        setDuesMap((prev) => new Map(prev).set(key, current));
      }

      setTogglingDues((s) => {
        const copy = new Set(s);
        copy.delete(key);
        return copy;
      });
    },
    [profile?.club_id, duesMap]
  );

  const sorted = [...members].sort((a, b) => {
    const aLast = a.lastSeen ?? a.firstSeen;
    const bLast = b.lastSeen ?? b.firstSeen;
    return new Date(bLast).getTime() - new Date(aLast).getTime();
  });

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
        <div className="flex items-center gap-2 text-forest-300">
          <Users className="h-5 w-5" />
          <span className="font-medium text-white">{members.length} members</span>
        </div>

        {sorted.length === 0 ? (
          <p className="mt-6 text-forest-400">
            No members yet. Members appear here when they check in to an event
            or when you add them manually (coming soon).
          </p>
        ) : (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((m) => {
              const emailKey = (m.email ?? m.id).toLowerCase().trim();
              const duesPaid = duesMap.get(emailKey) ?? false;
              const toggling = togglingDues.has(emailKey);

              return (
                <li
                  key={m.id}
                  className="rounded-lg border border-forest-800 bg-forest-800/80 px-4 py-4"
                >
                  <p className="font-semibold text-white">{m.name}</p>
                  {m.email && (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-forest-300">
                      <Mail className="h-3.5 w-3.5" />
                      {m.email}
                    </p>
                  )}
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-forest-400">
                    <Calendar className="h-3.5 w-3.5" />
                    First seen{" "}
                    {new Date(m.firstSeen).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {m.lastSeen &&
                      m.lastSeen !== m.firstSeen &&
                      ` · Last seen ${new Date(m.lastSeen).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}`}
                  </p>

                  {tracksDues && (
                    <div className="mt-3 flex items-center gap-2">
                      <DollarSign className="h-3.5 w-3.5 text-forest-400" />
                      {isOfficer ? (
                        <button
                          type="button"
                          disabled={toggling}
                          onClick={() => handleToggleDues(emailKey)}
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                            duesPaid
                              ? "bg-green-900/40 text-green-400 hover:bg-green-900/60"
                              : "bg-red-900/40 text-red-400 hover:bg-red-900/60"
                          } disabled:opacity-50`}
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
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Users, Mail, Calendar } from "lucide-react";
import type { Member } from "@/types";
import { useAuth } from "@/components/AuthProvider";
import {
  fetchAttendanceForClub,
  membersFromCheckIns,
} from "@/lib/supabaseData";

export default function MembersPage() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (profile?.club_id) {
      fetchAttendanceForClub(profile.club_id).then((checkIns) => {
        setMembers(membersFromCheckIns(checkIns));
      });
    } else {
      setMembers([]);
    }
  }, [profile?.club_id]);

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
            {sorted.map((m) => (
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

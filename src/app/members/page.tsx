"use client";

import { useEffect, useState } from "react";
import { Users, Mail, Calendar, DollarSign, Save, ArrowUpDown } from "lucide-react";
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
  const [savedDuesMap, setSavedDuesMap] = useState<Map<string, boolean>>(new Map());
  const [draftDuesMap, setDraftDuesMap] = useState<Map<string, boolean>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [sortBy, setSortBy] = useState<"lastSeen" | "firstSeen" | "eventsAttended">("lastSeen");

  const isOfficer = profile?.role === "officer";

  useEffect(() => {
    if (!profile?.club_id) {
      setMembers([]);
      setTracksDues(false);
      setSavedDuesMap(new Map());
      setDraftDuesMap(new Map());
      return;
    }
    const clubId = profile.club_id;

    fetchAttendanceForClub(clubId).then((checkIns) => {
      setMembers(membersFromCheckIns(checkIns));
    });

    fetchClub(clubId).then((club) => {
      setTracksDues(club?.tracks_dues ?? false);
    });

    fetchMemberDues(clubId).then((map) => {
      setSavedDuesMap(map);
      setDraftDuesMap(new Map(map));
    });
  }, [profile?.club_id]);

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

  const sorted = [...members].sort((a, b) => {
    switch (sortBy) {
      case "eventsAttended":
        return b.eventsAttended - a.eventsAttended;
      case "firstSeen":
        return new Date(b.firstSeen).getTime() - new Date(a.firstSeen).getTime();
      case "lastSeen":
      default: {
        const aLast = a.lastSeen ?? a.firstSeen;
        const bLast = b.lastSeen ?? b.firstSeen;
        return new Date(bLast).getTime() - new Date(aLast).getTime();
      }
    }
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-forest-300">
            <Users className="h-5 w-5" />
            <span className="font-medium text-white">{members.length} members</span>
          </div>

          {members.length > 0 && (
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-forest-400" />
              <span className="text-xs text-forest-400">Sort by</span>
              {(
                [
                  { key: "lastSeen", label: "Last seen" },
                  { key: "firstSeen", label: "First seen" },
                  { key: "eventsAttended", label: "Events attended" },
                ] as const
              ).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortBy(key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    sortBy === key
                      ? "bg-gauge-500/20 text-gauge-300 ring-1 ring-gauge-500/40"
                      : "text-forest-400 hover:text-forest-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {sorted.length === 0 ? (
          <p className="mt-6 text-forest-400">
            No members yet. Members appear here when they check in to an event
            or when you add them manually (coming soon).
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
                    className={`rounded-lg border px-4 py-4 ${
                      isChanged
                        ? "border-gauge-500/50 bg-forest-800/80"
                        : "border-forest-800 bg-forest-800/80"
                    }`}
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

                    {tracksDues && (
                      <div className="mt-3 flex items-center gap-2">
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
    </div>
  );
}

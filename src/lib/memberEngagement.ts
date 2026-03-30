import type { CheckIn, Event, Member } from "@/types";

export type EngagementTier = "core" | "casual" | "inactive";

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Match keys used by `membersFromCheckIns` / `enrichMembersWithOfficers`. */
export function memberRosterKey(m: Member): string {
  return (m.email ?? m.id).toLowerCase().trim();
}

function checkInKey(c: CheckIn): string {
  return (c.memberEmail ?? c.memberName).toLowerCase().trim();
}

export interface MemberEngagementSegments {
  core: number;
  casual: number;
  inactive: number;
  totalMembers: number;
  totalEventsInWindow: number;
  /** ISO date strings for the inclusive window (for labels). */
  windowStart: string;
  windowEnd: string;
}

/**
 * Classifies each roster member by share of club events attended in [today − months, today].
 * Core ≥70%, casual 30–70% (exclusive of core), inactive &lt;30%.
 */
export function segmentMembersByEngagement(
  members: Member[],
  checkIns: CheckIn[],
  events: Event[],
  monthsBack: number
): MemberEngagementSegments {
  const months = Math.min(12, Math.max(1, Math.floor(monthsBack)));

  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - months);
  start.setHours(0, 0, 0, 0);

  const windowEnd = localYmd(end);
  const windowStart = localYmd(start);

  const windowEventIds = new Set<string>();
  for (const e of events) {
    if (e.date >= windowStart && e.date <= windowEnd) {
      windowEventIds.add(e.id);
    }
  }
  const totalEventsInWindow = windowEventIds.size;

  const distinctEventsByMember = new Map<string, Set<string>>();
  for (const c of checkIns) {
    if (!windowEventIds.has(c.eventId)) continue;
    const k = checkInKey(c);
    let set = distinctEventsByMember.get(k);
    if (!set) {
      set = new Set<string>();
      distinctEventsByMember.set(k, set);
    }
    set.add(c.eventId);
  }

  let core = 0;
  let casual = 0;
  let inactive = 0;

  for (const m of members) {
    const k = memberRosterKey(m);
    const attended = distinctEventsByMember.get(k)?.size ?? 0;
    const rate =
      totalEventsInWindow > 0 ? attended / totalEventsInWindow : 0;
    if (rate >= 0.7) core += 1;
    else if (rate >= 0.3) casual += 1;
    else inactive += 1;
  }

  return {
    core,
    casual,
    inactive,
    totalMembers: members.length,
    totalEventsInWindow,
    windowStart,
    windowEnd,
  };
}

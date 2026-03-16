"use client";

import { supabase } from "@/lib/supabaseClient";
import type { Event, CheckIn, Member } from "@/types";

/** Map DB event row to app Event type */
function toEvent(row: {
  id: string;
  title: string | null;
  description: string | null;
  event_date: string | null;
  event_time: string | null;
  event_end_time: string | null;
  created_at: string | null;
}): Event {
  const date = row.event_date
    ? String(row.event_date).slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const time = row.event_time ? String(row.event_time).slice(0, 5) : undefined;
  const endTime = row.event_end_time ? String(row.event_end_time).slice(0, 5) : undefined;
  return {
    id: row.id,
    name: row.title ?? "",
    date,
    time,
    endTime,
    description: row.description ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

/** Map DB attendance row to app CheckIn type */
function toCheckIn(row: {
  id: string;
  event_id: string;
  member_name: string | null;
  member_email: string | null;
  created_at: string | null;
}): CheckIn {
  return {
    id: row.id,
    eventId: row.event_id,
    memberName: row.member_name ?? row.member_email ?? "Unknown",
    memberEmail: row.member_email ?? undefined,
    checkedInAt: row.created_at ?? new Date().toISOString(),
  };
}

/** Fetch all events for a club (authenticated). */
export async function fetchEvents(clubId: string | null): Promise<Event[]> {
  if (!clubId) return [];
  const { data, error } = await supabase
    .from("events")
    .select("id, title, description, event_date, event_time, event_end_time, created_at")
    .eq("club_id", clubId)
    .order("event_date", { ascending: false });
  if (error) {
    console.error("[Gauge] fetchEvents", error);
    return [];
  }
  return (data ?? []).map(toEvent);
}

/** Fetch a single event by id (works for anon on check-in page). */
export async function fetchEventById(eventId: string): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, description, event_date, event_time, event_end_time, created_at")
    .eq("id", eventId)
    .single();
  if (error || !data) return null;
  return toEvent(data);
}

/** Fetch all attendance rows for a club (via events). */
export async function fetchAttendanceForClub(
  clubId: string | null
): Promise<CheckIn[]> {
  if (!clubId) return [];
  const { data: eventRows } = await supabase
    .from("events")
    .select("id")
    .eq("club_id", clubId);
  const eventIds = (eventRows ?? []).map((r) => r.id);
  if (eventIds.length === 0) return [];

  const { data, error } = await supabase
    .from("attendance")
    .select("id, event_id, member_name, member_email, created_at")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Gauge] fetchAttendanceForClub", error);
    return [];
  }
  return (data ?? []).map(toCheckIn);
}

/** Fetch attendance for a single event. */
export async function fetchAttendanceForEvent(
  eventId: string
): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from("attendance")
    .select("id, event_id, member_name, member_email, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Gauge] fetchAttendanceForEvent", error);
    return [];
  }
  return (data ?? []).map(toCheckIn);
}

/** Derive members from attendance (distinct by email, first/last seen). */
export function membersFromCheckIns(checkIns: CheckIn[]): Member[] {
  const byEmail = new Map<
    string,
    { name: string; firstSeen: string; lastSeen: string; eventIds: Set<string> }
  >();
  for (const c of checkIns) {
    const key = (c.memberEmail ?? c.memberName).toLowerCase().trim();
    const existing = byEmail.get(key);
    const at = c.checkedInAt;
    if (!existing) {
      byEmail.set(key, {
        name: c.memberName,
        firstSeen: at,
        lastSeen: at,
        eventIds: new Set([c.eventId]),
      });
    } else {
      existing.eventIds.add(c.eventId);
      if (new Date(at) < new Date(existing.firstSeen))
        existing.firstSeen = at;
      if (new Date(at) > new Date(existing.lastSeen))
        existing.lastSeen = at;
    }
  }
  return Array.from(byEmail.entries()).map(([email, v]) => ({
    id: email,
    name: v.name,
    email: email.includes("@") ? email : undefined,
    firstSeen: v.firstSeen,
    lastSeen: v.lastSeen,
    eventsAttended: v.eventIds.size,
  }));
}

/** Insert a check-in (public check-in page; anon or auth). */
export async function insertCheckIn(
  eventId: string,
  params: { memberName: string; memberEmail: string }
): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("attendance").insert({
    event_id: eventId,
    member_email: params.memberEmail.trim(),
    member_name: params.memberName.trim(),
  });
  if (error) {
    console.error("[Gauge] insertCheckIn", error);
    return { error };
  }
  return { error: null };
}

export interface ClubSummary {
  id: string;
  name: string;
  university_name: string | null;
  action_reminder_days: number | null;
  join_code: string | null;
  tracks_dues: boolean;
}

export interface ClubUserProfile {
  id: string;
  role: string | null;
  display_name: string | null;
  email: string | null;
}

export async function fetchClub(
  clubId: string | null
): Promise<ClubSummary | null> {
  if (!clubId) return null;
  const { data, error } = await supabase
    .from("clubs")
    .select("id, name, university_name, action_reminder_days, join_code, tracks_dues")
    .eq("id", clubId)
    .single();
  if (error || !data) {
    console.error("[Gauge] fetchClub", error);
    return null;
  }
  return data as ClubSummary;
}

export async function fetchClubUsers(
  clubId: string | null
): Promise<ClubUserProfile[]> {
  if (!clubId) return [];
  const { data, error } = await supabase
    .from("users")
    .select("id, role, display_name, email")
    .eq("club_id", clubId);
  if (error) {
    console.error("[Gauge] fetchClubUsers", error);
    return [];
  }
  return (data ?? []) as ClubUserProfile[];
}

export interface CriticalActionItem {
  id: string;
  clubId: string;
  task: string;
  assigneeEmail: string;
  dueDate: string; // ISO date (YYYY-MM-DD)
  createdAt: string;
  reminderSent: boolean;
}

export async function createCriticalActionItem(params: {
  clubId: string;
  task: string;
  assigneeEmail: string;
  dueDate: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("critical_action_items").insert({
    club_id: params.clubId,
    task: params.task,
    assignee_email: params.assigneeEmail.trim(),
    due_date: params.dueDate,
  });
  if (error) {
    console.error("[Gauge] createCriticalActionItem", error);
    return { error };
  }
  return { error: null };
}

/** Fetch dues-paid status for all members in a club. Returns a map of email → dues_paid. */
export async function fetchMemberDues(
  clubId: string | null
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (!clubId) return map;
  const { data, error } = await supabase
    .from("member_dues")
    .select("member_email, dues_paid")
    .eq("club_id", clubId);
  if (error) {
    console.error("[Gauge] fetchMemberDues", error);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.member_email.toLowerCase().trim(), row.dues_paid);
  }
  return map;
}

/** Upsert dues-paid status for a member in a club. */
export async function upsertMemberDues(params: {
  clubId: string;
  memberEmail: string;
  duesPaid: boolean;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("member_dues").upsert(
    {
      club_id: params.clubId,
      member_email: params.memberEmail.toLowerCase().trim(),
      dues_paid: params.duesPaid,
    },
    { onConflict: "club_id,member_email" }
  );
  if (error) {
    console.error("[Gauge] upsertMemberDues", error);
    return { error };
  }
  return { error: null };
}

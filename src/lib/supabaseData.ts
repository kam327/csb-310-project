"use client";

import { supabase } from "@/lib/supabaseClient";
import type {
  Event,
  CheckIn,
  Member,
  FeedbackSurvey,
  SurveyResponse,
  EventLinks,
} from "@/types";

/** Map DB event row to app Event type */
function toEvent(row: {
  id: string;
  title: string | null;
  description: string | null;
  event_date: string | null;
  event_time: string | null;
  event_end_time: string | null;
  category: string | null;
  expenses?: number | null;
  Expenses?: number | null;
  created_at: string | null;
}): Event {
  const date = row.event_date
    ? String(row.event_date).slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const time = row.event_time ? String(row.event_time).slice(0, 5) : undefined;
  const endTime = row.event_end_time ? String(row.event_end_time).slice(0, 5) : undefined;
  const rawExpense = row.expenses ?? row.Expenses;
  let expenses: number | undefined;
  if (rawExpense !== null && rawExpense !== undefined) {
    const n = Number(rawExpense);
    if (Number.isFinite(n)) expenses = n;
  }
  return {
    id: row.id,
    name: row.title ?? "",
    date,
    time,
    endTime,
    description: row.description ?? undefined,
    category: row.category ?? undefined,
    expenses,
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
    .select(
      "id, title, description, event_date, event_time, event_end_time, category, created_at"
    )
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
  // Prefer the physically created quoted column `Events."Expenses"`.
  // If it doesn't exist, fall back to `events.expenses`.
  const { data: dataCapital, error: errCapital } = await supabase
    .from("events")
    .select(
      'id, title, description, event_date, event_time, event_end_time, category, "Expenses", created_at'
    )
    .eq("id", eventId)
    .single();

  if (!errCapital && dataCapital) {
    return toEvent(dataCapital);
  }

  const { data: dataLower, error: errLower } = await supabase
    .from("events")
    .select(
      "id, title, description, event_date, event_time, event_end_time, category, expenses, created_at"
    )
    .eq("id", eventId)
    .single();

  if (errLower || !dataLower) return null;
  return toEvent(dataLower);
}

/**
 * Best-effort fetch of per-event expenses for a club.
 *
 * If the column doesn't exist (or is named with different casing like `Expenses`),
 * this function returns an empty map so the rest of the dashboard still loads.
 */
export async function fetchEventExpensesForClub(
  clubId: string | null
): Promise<Record<string, number>> {
  if (!clubId) return {};

  const toExpenseMap = (rows: unknown): Record<string, number> => {
    const out: Record<string, number> = {};
    const list = (rows ?? []) as Array<{
      id?: string;
      expenses?: unknown;
      Expenses?: unknown;
    }>;
    for (const r of list) {
      if (!r?.id) continue;
      const raw =
        r.expenses === null || r.expenses === undefined ? r.Expenses : r.expenses;
      const n = raw === null || raw === undefined ? null : Number(raw);
      if (n !== null && Number.isFinite(n)) out[r.id] = n;
    }
    return out;
  };

  // Prefer a physically-created quoted column named `"Expenses"` (capital E),
  // because some deployments end up with only that column populated.
  const { data: rowsCapitalAliased, error: errCapitalAliased } = await supabase
    .from("events")
    // Alias/cast to `expenses` so the returned JSON always has the expected key.
    .select('id, ("Expenses")::double precision as expenses')
    .eq("club_id", clubId);

  if (!errCapitalAliased) {
    return toExpenseMap(rowsCapitalAliased);
  }

  const { data: rowsCapital, error: errCapital } = await supabase
    .from("events")
    .select('id, "Expenses"')
    .eq("club_id", clubId);

  if (!errCapital) {
    return toExpenseMap(rowsCapital);
  }

  const { data: rowsLower, error: errLower } = await supabase
    .from("events")
    .select("id, expenses")
    .eq("club_id", clubId);

  if (errLower) {
    console.error(
      "[Gauge] fetchEventExpensesForClub failed (no expenses column matched)",
      { errCapitalAliased, errCapital, errLower }
    );
    return {};
  }

  return toExpenseMap(rowsLower);
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
    {
      name: string;
      firstSeen: string;
      lastSeen: string;
      eventIds: Set<string>;
      lastCheckInByEvent: Map<string, string>;
    }
  >();
  for (const c of checkIns) {
    const key = (c.memberEmail ?? c.memberName).toLowerCase().trim();
    const existing = byEmail.get(key);
    const at = c.checkedInAt;
    if (!existing) {
      const lastCheckInByEvent = new Map<string, string>();
      lastCheckInByEvent.set(c.eventId, at);
      byEmail.set(key, {
        name: c.memberName,
        firstSeen: at,
        lastSeen: at,
        eventIds: new Set([c.eventId]),
        lastCheckInByEvent,
      });
    } else {
      existing.eventIds.add(c.eventId);
      if (new Date(at) < new Date(existing.firstSeen))
        existing.firstSeen = at;
      if (new Date(at) > new Date(existing.lastSeen))
        existing.lastSeen = at;
      const prevAt = existing.lastCheckInByEvent.get(c.eventId);
      if (!prevAt || new Date(at) > new Date(prevAt)) {
        existing.lastCheckInByEvent.set(c.eventId, at);
      }
    }
  }
  return Array.from(byEmail.entries()).map(([email, v]) => ({
    id: email,
    name: v.name,
    email: email.includes("@") ? email : undefined,
    firstSeen: v.firstSeen,
    lastSeen: v.lastSeen,
    eventsAttended: v.eventIds.size,
    eventAttendance: Array.from(v.lastCheckInByEvent.entries()).map(
      ([eventId, checkedInAt]) => ({ eventId, checkedInAt })
    ),
    isOfficerAccount: false,
  }));
}

/**
 * Flags members whose email matches a club officer account; adds officer rows with no check-ins yet.
 */
export function enrichMembersWithOfficers(
  members: Member[],
  clubUsers: ClubUserProfile[]
): Member[] {
  const officerEmails = new Set<string>();
  for (const u of clubUsers) {
    if (u.role === "officer" && u.email?.trim()) {
      officerEmails.add(u.email.toLowerCase().trim());
    }
  }

  const keyOf = (m: Member) => (m.email ?? m.id).toLowerCase().trim();

  const flagged = members.map((m) => ({
    ...m,
    isOfficerAccount: m.email
      ? officerEmails.has(m.email.toLowerCase().trim())
      : false,
  }));

  const existingKeys = new Set(flagged.map(keyOf));

  const added: Member[] = [];
  for (const u of clubUsers) {
    if (u.role !== "officer" || !u.email?.trim()) continue;
    const k = u.email.toLowerCase().trim();
    if (existingKeys.has(k)) continue;
    existingKeys.add(k);
    const created = u.created_at ?? new Date().toISOString();
    const em = u.email.trim();
    added.push({
      id: `account:${u.id}`,
      name: u.display_name?.trim() || em.split("@")[0] || "Officer",
      email: em,
      firstSeen: created,
      lastSeen: undefined,
      eventsAttended: 0,
      eventAttendance: [],
      isOfficerAccount: true,
    });
  }

  return [...flagged, ...added];
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
  show_dashboard_trends: boolean;
  show_dashboard_trend_members_by_engagement: boolean;
  show_dashboard_trend_avg_checkins_by_day_of_week: boolean;
  show_dashboard_trend_engagement_trend: boolean;
  show_dashboard_trend_attendance_by_event: boolean;
  show_dashboard_trend_cost_per_attendee: boolean;
  show_dashboard_trend_feedback_by_event: boolean;
  dashboard_trends_order: string[] | null;
}

export interface ClubUserProfile {
  id: string;
  role: string | null;
  display_name: string | null;
  email: string | null;
  created_at?: string | null;
}

export interface MyClubMembership {
  id: string; // clubs.id
  name: string; // clubs.name
  university_name: string | null;
  role: string | null; // membership role
}

/**
 * Fetch clubs the signed-in user belongs to (driven by `club_memberships`).
 * This powers the "switch clubs" dropdown.
 */
export async function fetchMyClubs(userId: string): Promise<MyClubMembership[]> {
  const { data: memberships, error: memErr } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", userId);

  if (memErr) {
    console.error("[Gauge] fetchMyClubs (memberships)", memErr);
    return [];
  }

  const membershipRows = memberships ?? [];
  const clubIds = membershipRows.map((m) => m.club_id).filter(Boolean);
  if (clubIds.length === 0) return [];

  const roleByClubId = new Map(
    membershipRows.map((m) => [m.club_id, m.role] as const)
  );

  const { data: clubs, error: clubsErr } = await supabase
    .from("clubs")
    .select("id, name, university_name")
    .in("id", clubIds);

  if (clubsErr) {
    console.error("[Gauge] fetchMyClubs (clubs)", clubsErr);
    return [];
  }

  return (clubs ?? []).map((c: any) => ({
    id: c.id,
    name: c.name,
    university_name: c.university_name ?? null,
    role: roleByClubId.get(c.id) ?? null,
  }));
}

export async function fetchClub(
  clubId: string | null
): Promise<ClubSummary | null> {
  if (!clubId) return null;
  const { data, error } = await supabase
    .from("clubs")
    // Select all so the query won't fail if new per-trend columns haven't been migrated yet.
    .select("*")
    .eq("id", clubId)
    .single();
  if (error || !data) {
    console.error("[Gauge] fetchClub", error);
    return null;
  }
  // Use defaults so older DB schemas still render something reasonable.
  const row = data as any;
  return {
    id: row.id,
    name: row.name,
    university_name: row.university_name ?? null,
    action_reminder_days: row.action_reminder_days ?? null,
    join_code: row.join_code ?? null,
    tracks_dues: Boolean(row.tracks_dues),
    show_dashboard_trends: Boolean(row.show_dashboard_trends ?? true),
    show_dashboard_trend_members_by_engagement: Boolean(
      row.show_dashboard_trend_members_by_engagement ?? true
    ),
    show_dashboard_trend_avg_checkins_by_day_of_week: Boolean(
      row.show_dashboard_trend_avg_checkins_by_day_of_week ?? true
    ),
    show_dashboard_trend_engagement_trend: Boolean(
      row.show_dashboard_trend_engagement_trend ?? true
    ),
    show_dashboard_trend_attendance_by_event: Boolean(
      row.show_dashboard_trend_attendance_by_event ?? true
    ),
    show_dashboard_trend_cost_per_attendee: Boolean(
      row.show_dashboard_trend_cost_per_attendee ?? true
    ),
    show_dashboard_trend_feedback_by_event: Boolean(
      row.show_dashboard_trend_feedback_by_event ?? true
    ),
    dashboard_trends_order: Array.isArray(row.dashboard_trends_order)
      ? (row.dashboard_trends_order as string[])
      : null,
  };
}

export async function fetchClubUsers(
  clubId: string | null
): Promise<ClubUserProfile[]> {
  if (!clubId) return [];
  const { data, error } = await supabase
    .from("users")
    .select("id, role, display_name, email, created_at")
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
  eventId: string | null;
  task: string;
  assigneeEmail: string;
  dueDate: string; // ISO date (YYYY-MM-DD)
  completed: boolean;
  createdAt: string;
  reminderSent: boolean;
}

export async function createCriticalActionItem(params: {
  clubId: string;
  eventId: string;
  task: string;
  assigneeEmail: string;
  dueDate: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("critical_action_items").insert({
    club_id: params.clubId,
    event_id: params.eventId,
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

function toCriticalActionItem(row: {
  id: string;
  club_id: string;
  event_id: string | null;
  task: string;
  assignee_email: string;
  due_date: string;
  completed: boolean | null;
  created_at: string | null;
  reminder_sent: boolean | null;
}): CriticalActionItem {
  return {
    id: row.id,
    clubId: row.club_id,
    eventId: row.event_id,
    task: row.task,
    assigneeEmail: row.assignee_email,
    dueDate: row.due_date,
    completed: Boolean(row.completed),
    createdAt: row.created_at ?? new Date().toISOString(),
    reminderSent: Boolean(row.reminder_sent),
  };
}

/** Fetch critical action items for a club, optionally filtered by event. */
export async function fetchCriticalActionItems(
  clubId: string | null,
  eventId?: string
): Promise<CriticalActionItem[]> {
  if (!clubId) return [];

  let query = supabase
    .from("critical_action_items")
    .select(
      "id, club_id, event_id, task, assignee_email, due_date, completed, created_at, reminder_sent"
    )
    .eq("club_id", clubId);

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error("[Gauge] fetchCriticalActionItems", error);
    return [];
  }

  return (data ?? []).map(toCriticalActionItem);
}

/** Toggle the completed status of a critical action item. */
export async function toggleCriticalActionItemCompleted(params: {
  id: string;
  completed: boolean;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("critical_action_items")
    .update({ completed: params.completed })
    .eq("id", params.id);
  if (error) {
    console.error("[Gauge] toggleCriticalActionItemCompleted", error);
    return { error };
  }
  return { error: null };
}

/** Delete a critical action item. */
export async function deleteCriticalActionItem(params: {
  clubId: string;
  id: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("critical_action_items")
    .delete()
    .eq("id", params.id)
    .eq("club_id", params.clubId);

  if (error) {
    console.error("[Gauge] deleteCriticalActionItem", error);
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

/* ─── Feedback Surveys ─── */

function toFeedbackSurvey(row: {
  id: string;
  event_id: string;
  question_1: string | null;
  question_2: string | null;
  question_3: string | null;
  created_at: string | null;
}): FeedbackSurvey {
  return {
    id: row.id,
    eventId: row.event_id,
    question1: row.question_1 ?? undefined,
    question2: row.question_2 ?? undefined,
    question3: row.question_3 ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toSurveyResponse(row: {
  id: string;
  survey_id: string;
  rating: number;
  answer_1: string | null;
  answer_2: string | null;
  answer_3: string | null;
  respondent_name: string | null;
  respondent_email: string | null;
  created_at: string | null;
}): SurveyResponse {
  return {
    id: row.id,
    surveyId: row.survey_id,
    rating: row.rating,
    answer1: row.answer_1 ?? undefined,
    answer2: row.answer_2 ?? undefined,
    answer3: row.answer_3 ?? undefined,
    respondentName: row.respondent_name ?? undefined,
    respondentEmail: row.respondent_email ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

/** Create a feedback survey for an event. */
export async function createFeedbackSurvey(params: {
  eventId: string;
  question1?: string;
  question2?: string;
  question3?: string;
}): Promise<{ data: FeedbackSurvey | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("feedback_surveys")
    .insert({
      event_id: params.eventId,
      question_1: params.question1?.trim() || null,
      question_2: params.question2?.trim() || null,
      question_3: params.question3?.trim() || null,
    })
    .select("id, event_id, question_1, question_2, question_3, created_at")
    .single();
  if (error || !data) {
    console.error("[Gauge] createFeedbackSurvey", error);
    return { data: null, error: error ?? new Error("No data returned") };
  }
  return { data: toFeedbackSurvey(data), error: null };
}

/** Fetch the feedback survey for an event (most recent if multiple). */
export async function fetchSurveyForEvent(
  eventId: string
): Promise<FeedbackSurvey | null> {
  const { data, error } = await supabase
    .from("feedback_surveys")
    .select("id, event_id, question_1, question_2, question_3, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return toFeedbackSurvey(data);
}

/** Fetch a survey by its own id (used on the public form page). */
export async function fetchSurveyById(
  surveyId: string
): Promise<FeedbackSurvey | null> {
  const { data, error } = await supabase
    .from("feedback_surveys")
    .select("id, event_id, question_1, question_2, question_3, created_at")
    .eq("id", surveyId)
    .single();
  if (error || !data) return null;
  return toFeedbackSurvey(data);
}

/** Submit a response to a feedback survey (public / anon). */
export async function insertSurveyResponse(params: {
  surveyId: string;
  rating: number;
  answer1?: string;
  answer2?: string;
  answer3?: string;
  respondentName?: string;
  respondentEmail?: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("survey_responses").insert({
    survey_id: params.surveyId,
    rating: params.rating,
    answer_1: params.answer1?.trim() || null,
    answer_2: params.answer2?.trim() || null,
    answer_3: params.answer3?.trim() || null,
    respondent_name: params.respondentName?.trim() || null,
    respondent_email: params.respondentEmail?.trim() || null,
  });
  if (error) {
    console.error("[Gauge] insertSurveyResponse", error);
    return { error };
  }
  return { error: null };
}

/** Fetch all responses for a survey. */
export async function fetchSurveyResponses(
  surveyId: string
): Promise<SurveyResponse[]> {
  const { data, error } = await supabase
    .from("survey_responses")
    .select(
      "id, survey_id, rating, answer_1, answer_2, answer_3, respondent_name, respondent_email, created_at"
    )
    .eq("survey_id", surveyId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[Gauge] fetchSurveyResponses", error);
    return [];
  }
  return (data ?? []).map(toSurveyResponse);
}

/** Average rating (1–5) per event, using each event’s latest survey only. */
export interface FeedbackAverageByEvent {
  eventId: string;
  eventName: string;
  eventDate: string;
  avgRating: number;
  responseCount: number;
}

export async function fetchFeedbackAveragesByEvent(
  clubId: string | null
): Promise<FeedbackAverageByEvent[]> {
  if (!clubId) return [];
  const { data: eventRows, error: evErr } = await supabase
    .from("events")
    .select("id, title, event_date")
    .eq("club_id", clubId);
  if (evErr) {
    console.error("[Gauge] fetchFeedbackAveragesByEvent events", evErr);
    return [];
  }
  const eventMeta = new Map<
    string,
    { title: string; date: string }
  >();
  for (const r of eventRows ?? []) {
    const dateStr = r.event_date
      ? String(r.event_date).slice(0, 10)
      : "";
    eventMeta.set(r.id, {
      title: r.title ?? "",
      date: dateStr,
    });
  }
  const eventIds = Array.from(eventMeta.keys());
  if (eventIds.length === 0) return [];

  const { data: surveys, error: sErr } = await supabase
    .from("feedback_surveys")
    .select("id, event_id, created_at")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });
  if (sErr) {
    console.error("[Gauge] fetchFeedbackAveragesByEvent surveys", sErr);
    return [];
  }
  const latestSurveyByEvent = new Map<string, string>();
  for (const s of surveys ?? []) {
    if (!latestSurveyByEvent.has(s.event_id)) {
      latestSurveyByEvent.set(s.event_id, s.id);
    }
  }
  const surveyIds = Array.from(latestSurveyByEvent.values());
  if (surveyIds.length === 0) return [];

  const { data: responses, error: rErr } = await supabase
    .from("survey_responses")
    .select("survey_id, rating")
    .in("survey_id", surveyIds);
  if (rErr) {
    console.error("[Gauge] fetchFeedbackAveragesByEvent responses", rErr);
    return [];
  }

  const surveyToEvent = new Map<string, string>();
  latestSurveyByEvent.forEach((sid, eid) => surveyToEvent.set(sid, eid));

  const agg = new Map<string, { sum: number; count: number }>();
  for (const row of responses ?? []) {
    const eid = surveyToEvent.get(row.survey_id);
    if (!eid) continue;
    const cur = agg.get(eid) ?? { sum: 0, count: 0 };
    cur.sum += row.rating;
    cur.count += 1;
    agg.set(eid, cur);
  }

  /** YYYY-MM-DD in local time — only exclude future-dated events (include today). */
  const todayYmd = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  const out: FeedbackAverageByEvent[] = [];
  Array.from(agg.entries()).forEach(([eid, { sum, count }]) => {
    if (count === 0) return;
    const meta = eventMeta.get(eid);
    if (!meta) return;
    if (meta.date && meta.date > todayYmd) return;
    out.push({
      eventId: eid,
      eventName: meta.title,
      eventDate: meta.date,
      avgRating: sum / count,
      responseCount: count,
    });
  });

  out.sort((a, b) => {
    const ta = a.eventDate ? new Date(a.eventDate).getTime() : 0;
    const tb = b.eventDate ? new Date(b.eventDate).getTime() : 0;
    return tb - ta;
  });

  return out.slice(0, 10);
}

/* ─── Event Categories ─── */

export interface EventCategory {
  id: string;
  clubId: string;
  name: string;
}

/** Fetch all event categories for a club. */
export async function fetchEventCategories(
  clubId: string | null
): Promise<EventCategory[]> {
  if (!clubId) return [];
  const { data, error } = await supabase
    .from("event_categories")
    .select("id, club_id, name")
    .eq("club_id", clubId)
    .order("name", { ascending: true });
  if (error) {
    console.error("[Gauge] fetchEventCategories", error);
    return [];
  }
  return (data ?? []).map((r) => ({ id: r.id, clubId: r.club_id, name: r.name }));
}

/** Create a new event category for a club. */
export async function createEventCategory(params: {
  clubId: string;
  name: string;
}): Promise<{ data: EventCategory | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("event_categories")
    .insert({ club_id: params.clubId, name: params.name.trim() })
    .select("id, club_id, name")
    .single();
  if (error || !data) {
    console.error("[Gauge] createEventCategory", error);
    return { data: null, error: error ?? new Error("No data returned") };
  }
  return { data: { id: data.id, clubId: data.club_id, name: data.name }, error: null };
}

/** Delete an event category. */
export async function deleteEventCategory(params: {
  clubId: string;
  id: string;
}): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("event_categories")
    .delete()
    .eq("id", params.id)
    .eq("club_id", params.clubId);
  if (error) {
    console.error("[Gauge] deleteEventCategory", error);
    return { error };
  }
  return { error: null };
}

function toEventLinks(row: {
  id: string;
  event_id: string;
  flyers_link: string | null;
  budget_link: string | null;
  other_link: string | null;
  created_at: string | null;
  updated_at: string | null;
}): EventLinks {
  return {
    id: row.id,
    eventId: row.event_id,
    flyersLink: row.flyers_link ?? undefined,
    budgetLink: row.budget_link ?? undefined,
    otherLink: row.other_link ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export async function fetchEventLinks(eventId: string): Promise<EventLinks | null> {
  const { data, error } = await supabase
    .from("event_links")
    .select("id, event_id, flyers_link, budget_link, other_link, created_at, updated_at")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) {
    console.error("[Gauge] fetchEventLinks", error);
    return null;
  }

  if (!data) return null;
  return toEventLinks(data);
}

export async function upsertEventLinks(input: {
  eventId: string;
  flyersLink?: string;
  budgetLink?: string;
  otherLink?: string;
}): Promise<{ data: EventLinks | null; error: string | null }> {
  const { data, error } = await supabase
    .from("event_links")
    .upsert(
      {
        event_id: input.eventId,
        flyers_link: input.flyersLink || null,
        budget_link: input.budgetLink || null,
        other_link: input.otherLink || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" }
    )
    .select("id, event_id, flyers_link, budget_link, other_link, created_at, updated_at")
    .single();

  if (error) {
    console.error("[Gauge] upsertEventLinks", error);
    return { data: null, error: error.message };
  }

  return { data: toEventLinks(data), error: null };
}
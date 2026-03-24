"use client";

import { supabase } from "@/lib/supabaseClient";
import type { Event, CheckIn, Member, FeedbackSurvey, SurveyResponse, SavedMinutes } from "@/types";

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

/* ─── Meeting Minutes ─── */

function toMinutes(row: {
  id: string;
  club_id: string;
  title: string;
  meeting_date: string;
  raw_text: string;
  event_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}): SavedMinutes {
  return {
    id: row.id,
    clubId: row.club_id,
    title: row.title,
    date: String(row.meeting_date).slice(0, 10),
    rawText: row.raw_text,
    eventId: row.event_id ?? undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

const MINUTES_COLUMNS =
  "id, club_id, title, meeting_date, raw_text, event_id, created_at, updated_at";

/** Fetch all meeting minutes for a club. */
export async function fetchMinutesForClub(
  clubId: string | null
): Promise<SavedMinutes[]> {
  if (!clubId) return [];
  const { data, error } = await supabase
    .from("meeting_minutes")
    .select(MINUTES_COLUMNS)
    .eq("club_id", clubId)
    .order("meeting_date", { ascending: false });
  if (error) {
    console.error("[Gauge] fetchMinutesForClub", error);
    return [];
  }
  return (data ?? []).map(toMinutes);
}

/** Fetch a single meeting minutes record by id. */
export async function fetchMinutesById(
  id: string
): Promise<SavedMinutes | null> {
  const { data, error } = await supabase
    .from("meeting_minutes")
    .select(MINUTES_COLUMNS)
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return toMinutes(data);
}

/** Insert new meeting minutes. */
export async function insertMinutes(params: {
  clubId: string;
  title: string;
  date: string;
  rawText: string;
  eventId?: string;
}): Promise<{ data: SavedMinutes | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("meeting_minutes")
    .insert({
      club_id: params.clubId,
      title: params.title.trim(),
      meeting_date: params.date,
      raw_text: params.rawText.trim(),
      event_id: params.eventId ?? null,
    })
    .select(MINUTES_COLUMNS)
    .single();
  if (error || !data) {
    console.error("[Gauge] insertMinutes", error);
    return { data: null, error: error ?? new Error("No data returned") };
  }
  return { data: toMinutes(data), error: null };
}

/** Update an existing meeting minutes record. */
export async function updateMinutes(
  id: string,
  params: { title?: string; date?: string; rawText?: string }
): Promise<{ error: Error | null }> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.title !== undefined) updates.title = params.title.trim();
  if (params.date !== undefined) updates.meeting_date = params.date;
  if (params.rawText !== undefined) updates.raw_text = params.rawText.trim();

  const { error } = await supabase
    .from("meeting_minutes")
    .update(updates)
    .eq("id", id);
  if (error) {
    console.error("[Gauge] updateMinutes", error);
    return { error };
  }
  return { error: null };
}

export interface Event {
  id: string;
  name: string;
  date: string; // ISO date (YYYY-MM-DD)
  time?: string; // optional start time, "HH:MM" (24h) local
  endTime?: string; // optional end time, "HH:MM" (24h) local
  description?: string;
  category?: string;
  createdAt: string;
}

export interface CheckIn {
  id: string;
  eventId: string;
  memberName: string;
  memberEmail?: string;
  checkedInAt: string; // ISO datetime
}

export interface Member {
  id: string;
  name: string;
  email?: string;
  firstSeen: string; // from first check-in or manual add
  lastSeen?: string;
  eventsAttended: number;
  /** One row per event attended: latest check-in time if duplicates exist. */
  eventAttendance: { eventId: string; checkedInAt: string }[];
  /** True if this person has a Gauge club account with officer role (matched by email). */
  isOfficerAccount?: boolean;
  notes?: string;
}

export interface FeedbackSurvey {
  id: string;
  eventId: string;
  question1?: string;
  question2?: string;
  question3?: string;
  createdAt: string;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  rating: number; // 1–5
  answer1?: string;
  answer2?: string;
  answer3?: string;
  respondentName?: string;
  respondentEmail?: string;
  createdAt: string;
}

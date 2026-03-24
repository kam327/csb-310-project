export interface Event {
  id: string;
  name: string;
  date: string; // ISO date (YYYY-MM-DD)
  time?: string; // optional start time, "HH:MM" (24h) local
  endTime?: string; // optional end time, "HH:MM" (24h) local
  description?: string;
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
  notes?: string;
}

export interface SavedMinutes {
  id: string;
  clubId?: string;
  title: string;
  date: string; // ISO date (YYYY-MM-DD)
  rawText: string;
  eventId?: string;
  createdAt: string;
  updatedAt: string;
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

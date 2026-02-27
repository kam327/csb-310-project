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
  notes?: string;
}

export interface ExtractedMinutes {
  date: string;
  title: string;
  attendees: string[];
  keyDecisions: string[];
  actionItems: { task: string; assignee?: string; due?: string }[];
  nextMeeting?: string;
  notes?: string;
}

export interface SavedMinutes {
  id: string;
  eventId?: string; // optional link to an event
  rawText?: string;
  extracted: ExtractedMinutes;
  createdAt: string;
  updatedAt: string;
}

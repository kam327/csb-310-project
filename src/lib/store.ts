"use client";

import type { Event, CheckIn, Member, SavedMinutes } from "@/types";

const EVENTS_KEY = "club-continuity-events";
const CHECK_INS_KEY = "club-continuity-checkins";
const MEMBERS_KEY = "club-continuity-members";
const MINUTES_KEY = "club-continuity-minutes";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save to localStorage", e);
  }
}

function events(): Event[] {
  return load(EVENTS_KEY, []);
}
function checkIns(): CheckIn[] {
  return load(CHECK_INS_KEY, []);
}
function members(): Member[] {
  return load(MEMBERS_KEY, []);
}
function minutes(): SavedMinutes[] {
  return load(MINUTES_KEY, []);
}

export const store = {
  events: {
    getAll: (): Event[] => events(),
    add: (event: Event) => {
      const all = load<Event[]>(EVENTS_KEY, []);
      all.push(event);
      save(EVENTS_KEY, all);
    },
    update: (id: string, updates: Partial<Event>) => {
      const all = load<Event[]>(EVENTS_KEY, []);
      const i = all.findIndex((e) => e.id === id);
      if (i >= 0) {
        all[i] = { ...all[i], ...updates };
        save(EVENTS_KEY, all);
      }
    },
    remove: (id: string) => {
      save(EVENTS_KEY, load<Event[]>(EVENTS_KEY, []).filter((e) => e.id !== id));
    },
    getById: (id: string): Event | undefined => events().find((e) => e.id === id),
  },

  checkIns: {
    getAll: (): CheckIn[] => checkIns(),
    getByEventId: (eventId: string): CheckIn[] =>
      checkIns().filter((c) => c.eventId === eventId),
    add: (checkIn: CheckIn) => {
      const all = load<CheckIn[]>(CHECK_INS_KEY, []);
      all.push(checkIn);
      save(CHECK_INS_KEY, all);
    },
  },

  members: {
    getAll: (): Member[] => members(),
    add: (member: Member) => {
      const all = load<Member[]>(MEMBERS_KEY, []);
      if (!all.some((m) => m.id === member.id)) all.push(member);
      save(MEMBERS_KEY, all);
    },
    update: (id: string, updates: Partial<Member>) => {
      const all = load<Member[]>(MEMBERS_KEY, []);
      const i = all.findIndex((m) => m.id === id);
      if (i >= 0) {
        all[i] = { ...all[i], ...updates };
        save(MEMBERS_KEY, all);
      }
    },
    getOrCreateFromCheckIn: (name: string, email?: string): Member => {
      const all = load<Member[]>(MEMBERS_KEY, []);
      const now = new Date().toISOString();
      const existing = all.find(
        (m) =>
          m.name.toLowerCase() === name.toLowerCase() ||
          (email && m.email?.toLowerCase() === email.toLowerCase())
      );
      if (existing) {
        existing.lastSeen = now;
        save(MEMBERS_KEY, all);
        return existing;
      }
      const member: Member = {
        id: crypto.randomUUID(),
        name,
        email,
        firstSeen: now,
        lastSeen: now,
        eventsAttended: 1,
      };
      all.push(member);
      save(MEMBERS_KEY, all);
      return member;
    },
  },

  minutes: {
    getAll: (): SavedMinutes[] => minutes(),
    add: (minutesData: SavedMinutes) => {
      const all = load<SavedMinutes[]>(MINUTES_KEY, []);
      all.unshift(minutesData);
      save(MINUTES_KEY, all);
    },
    update: (id: string, updates: Partial<SavedMinutes>) => {
      const all = load<SavedMinutes[]>(MINUTES_KEY, []);
      const i = all.findIndex((m) => m.id === id);
      if (i >= 0) {
        all[i] = { ...all[i], ...updates };
        save(MINUTES_KEY, all);
      }
    },
    getById: (id: string): SavedMinutes | undefined =>
      minutes().find((m) => m.id === id),
  },
};

export function generateId(): string {
  return crypto.randomUUID();
}

import type { Event, CheckIn, Member, SavedMinutes } from "@/types";

const DEMO_MODE_KEY = "gauge-demo-mode";

export function getDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DEMO_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setDemoMode(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DEMO_MODE_KEY, enabled ? "true" : "false");
  } catch (e) {
    console.error("Failed to set demo mode", e);
  }
}

function weeksAgo(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() - weeks * 7);
  return d.toISOString().slice(0, 10);
}

export const demoEvents: Event[] = (() => {
  const items: {
    name: string;
    weeksBack: number;
    description?: string;
    time: string;
    endTime: string;
  }[] = [
    {
      name: "General Meeting – Fall Kickoff",
      weeksBack: 11,
      description: "Welcome back, semester goals, and introductions.",
      time: "18:00",
      endTime: "19:00",
    },
    {
      name: "Workshop: Resume & LinkedIn",
      weeksBack: 10,
      description: "One-on-one resume reviews with industry guests.",
      time: "18:30",
      endTime: "20:00",
    },
    { name: "Guest Speaker: Product at Stripe", weeksBack: 9, time: "19:00", endTime: "20:30" },
    {
      name: "Social: Trivia Night",
      weeksBack: 9,
      description: "Team trivia and pizza.",
      time: "20:00",
      endTime: "22:00",
    },
    { name: "General Meeting – October", weeksBack: 8, time: "18:00", endTime: "19:00" },
    {
      name: "Career Panel: Engineering Paths",
      weeksBack: 7,
      description: "Panel with 4 engineers from different companies.",
      time: "18:30",
      endTime: "20:00",
    },
    { name: "Hackathon Kickoff", weeksBack: 6, time: "17:00", endTime: "19:00" },
    { name: "Workshop: System Design", weeksBack: 5, time: "18:00", endTime: "19:30" },
    { name: "General Meeting – November", weeksBack: 5, time: "18:00", endTime: "19:00" },
    {
      name: "Alumni Networking Happy Hour",
      weeksBack: 4,
      description: "Casual networking with recent grads.",
      time: "19:00",
      endTime: "21:00",
    },
    {
      name: "Mock Interviews",
      weeksBack: 3,
      description: "Technical and behavioral practice.",
      time: "18:00",
      endTime: "20:00",
    },
    {
      name: "End of Semester Social",
      weeksBack: 2,
      description: "Holiday party and awards.",
      time: "19:30",
      endTime: "22:00",
    },
    { name: "General Meeting – Spring Planning", weeksBack: 1, time: "18:00", endTime: "19:00" },
    { name: "Workshop: Interview Prep", weeksBack: 0, time: "18:00", endTime: "19:30" },
  ];
  return items.map((item, i) => ({
    id: `demo-event-${i}`,
    name: item.name,
    date: weeksAgo(item.weeksBack),
    time: item.time,
    endTime: item.endTime,
    description: item.description,
    createdAt: new Date(Date.now() - item.weeksBack * 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));
})();

const DEMO_NAMES = [
  "Alex Chen", "Jordan Smith", "Sam Rivera", "Taylor Kim", "Morgan Lee",
  "Casey Jones", "Riley Davis", "Quinn Wilson", "Jamie Brown", "Drew Martinez",
  "Skyler White", "Blake Johnson", "Avery Clark", "Reese Taylor", "Parker Moore",
  "Jordan Lee", "Sam Kim", "Charlie Zhang", "Dakota Brooks", "Emery Hall",
];

export const demoCheckIns: CheckIn[] = (() => {
  const list: CheckIn[] = [];
  demoEvents.forEach((ev, eventIndex) => {
    // Varied attendance: some events packed, some small, some mid; occasional dip
    const variance = [1.2, 0.6, 1.0, 1.4, 0.8, 1.1, 1.3, 0.7, 1.0, 1.2, 0.9, 1.5, 1.0, 0.85][eventIndex % 14] ?? 1;
    const baseCount = Math.round((6 + eventIndex * 1.5 + (eventIndex % 4)) * variance);
    const count = Math.min(Math.max(baseCount, 3), DEMO_NAMES.length);
    const shuffled = [...DEMO_NAMES].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      const eventDate = new Date(ev.date);
      eventDate.setHours(18 + (i % 2), (i * 7) % 60, 0, 0);
      list.push({
        id: `demo-checkin-${eventIndex}-${i}`,
        eventId: ev.id,
        memberName: shuffled[i],
        memberEmail: `${shuffled[i].replace(/\s+/g, "").toLowerCase()}@university.edu`,
        checkedInAt: eventDate.toISOString(),
      });
    }
  });
  return list;
})();

export const demoMembers: Member[] = (() => {
  const seen = new Set<string>();
  const list: Member[] = [];
  demoCheckIns.forEach((c) => {
    if (seen.has(c.memberName)) return;
    seen.add(c.memberName);
    const first = demoCheckIns.filter((x) => x.memberName === c.memberName).sort(
      (a, b) => new Date(a.checkedInAt).getTime() - new Date(b.checkedInAt).getTime()
    )[0];
    const last = demoCheckIns.filter((x) => x.memberName === c.memberName).sort(
      (a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime()
    )[0];
    list.push({
      id: `demo-member-${list.length}`,
      name: c.memberName,
      email: c.memberEmail,
      firstSeen: first.checkedInAt,
      lastSeen: last.checkedInAt,
    });
  });
  return list;
})();

const DEMO_DECISIONS = [
  "Approved budget for fall events.",
  "Set date for career panel with alumni.",
  "Voted on new meeting time: Tuesdays 6pm.",
  "Decided to co-host hackathon with CS club.",
  "Approved funding for conference travel (2 members).",
  "Elected to use Slack for async updates.",
  "Agreed on spring retreat weekend in March.",
  "Decided to run workshop series on system design.",
  "Approved new logo and branding refresh.",
  "Set cap of 80 for next semester recruitment.",
];

const DEMO_ACTION_ITEMS = [
  { task: "Book room for next meeting", assignee: "Alex" },
  { task: "Send recap email to list", assignee: "Jordan" },
  { task: "Create event signup form", assignee: "Sam" },
  { task: "Reach out to 3 potential speakers", assignee: "Taylor" },
  { task: "Update website with new events", assignee: "Casey" },
  { task: "Order catering for social", assignee: "Riley" },
  { task: "Draft sponsorship ask", assignee: "Quinn" },
  { task: "Reserve AV for panel", assignee: "Morgan" },
];

export const demoMinutes: SavedMinutes[] = (() => {
  const meetings = [
    { title: "General Meeting – September", weeksBack: 10 },
    { title: "Board Meeting – Budget", weeksBack: 9 },
    { title: "General Meeting – October", weeksBack: 7 },
    { title: "Planning: Career Panel", weeksBack: 6 },
    { title: "General Meeting – October (2)", weeksBack: 5 },
    { title: "Hackathon Planning", weeksBack: 4 },
    { title: "General Meeting – November", weeksBack: 3 },
    { title: "E-board Retreat", weeksBack: 2 },
    { title: "Spring Planning", weeksBack: 1 },
  ];
  return meetings.map((m, i) => {
    const date = weeksAgo(m.weeksBack);
    const numDecisions = 1 + (i % 3);
    const numActions = 2 + (i % 3);
    return {
      id: `demo-minutes-${i}`,
      extracted: {
        date,
        title: m.title,
        attendees: demoMembers.slice(0, 5 + (i % 8)).map((mem) => mem.name),
        keyDecisions: DEMO_DECISIONS.slice(i % 5, i % 5 + numDecisions),
        actionItems: DEMO_ACTION_ITEMS.slice(i % 4, i % 4 + numActions),
        nextMeeting: weeksAgo(Math.max(0, m.weeksBack - 1)),
        notes: i % 3 === 0 ? "Great turnout. Follow up on speaker confirmations." : undefined,
      },
      createdAt: new Date(Date.now() - m.weeksBack * 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - m.weeksBack * 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
})();

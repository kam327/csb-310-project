import { NextRequest, NextResponse } from "next/server";
import type { ExtractedMinutes } from "@/types";

/**
 * Extracts structured data from meeting minutes text using a simple heuristic
 * parser. For production, replace with an OpenAI/Claude API call.
 *
 * Set OPENAI_API_KEY in .env.local and use the OpenAI route below for real AI.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text } = body as { text?: string };

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'text' in body" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const extracted = await extractWithOpenAI(text, apiKey);
      return NextResponse.json(extracted);
    }

    // Fallback: heuristic extraction (no API key)
    const extracted = extractHeuristic(text);
    return NextResponse.json(extracted);
  } catch (e) {
    console.error("extract-minutes error", e);
    return NextResponse.json(
      { error: "Failed to extract meeting data" },
      { status: 500 }
    );
  }
}

async function extractWithOpenAI(
  text: string,
  apiKey: string
): Promise<ExtractedMinutes> {
  const systemPrompt = `You are a meeting minutes parser. Extract structured data from the given meeting notes.
Return ONLY valid JSON matching this TypeScript type (no markdown, no explanation):
{
  "date": "YYYY-MM-DD" or today's date if not found,
  "title": "short meeting title",
  "attendees": ["name1", "name2"],
  "keyDecisions": ["decision1", "decision2"],
  "actionItems": [{"task": "description", "assignee": "name or null", "due": "date string or null"}],
  "nextMeeting": "date or null",
  "notes": "optional extra notes"
}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${err}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("No content from OpenAI");

  let parsed: unknown;
  try {
    const cleaned = content.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("Invalid JSON from OpenAI");
  }

  return normalizeExtracted(parsed);
}

function extractHeuristic(text: string): ExtractedMinutes {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lower = text.toLowerCase();

  let date = new Date().toISOString().slice(0, 10);
  const dateMatch = text.match(/\b(20\d{2})[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])\b/);
  if (dateMatch) date = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;

  let title = "Meeting notes";
  const firstLine = lines[0];
  if (firstLine && firstLine.length < 80 && !firstLine.match(/^\d/)) {
    title = firstLine.replace(/^#+\s*/, "").trim();
  }

  const attendees: string[] = [];
  const keyDecisions: string[] = [];
  const actionItems: { task: string; assignee?: string; due?: string }[] = [];

  const attendeeKeywords = ["attendees", "present", "attendance", "in attendance", "members present"];
  const decisionKeywords = ["decided", "decision", "agreed", "approved", "voted"];
  const actionKeywords = ["action", "todo", "to do", "follow up", "assign", "task"];

  let inAttendees = false;
  let inDecisions = false;
  let inActions = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();

    if (attendeeKeywords.some((k) => lineLower.includes(k))) {
      inAttendees = true;
      inDecisions = false;
      inActions = false;
      continue;
    }
    if (decisionKeywords.some((k) => lineLower.includes(k)) || lineLower.startsWith("decisions")) {
      inDecisions = true;
      inAttendees = false;
      inActions = false;
      continue;
    }
    if (actionKeywords.some((k) => lineLower.includes(k)) || lineLower.startsWith("action items")) {
      inActions = true;
      inAttendees = false;
      inDecisions = false;
      continue;
    }

    if (inAttendees && line.match(/^[-*•]\s+.+/) && line.length < 60) {
      const name = line.replace(/^[-*•]\s+/, "").trim();
      if (name && !name.match(/^\d/)) attendees.push(name);
    }
    if (inDecisions && line.match(/^[-*•]\s+.+/) && line.length > 10) {
      keyDecisions.push(line.replace(/^[-*•]\s+/, "").trim());
    }
    if (inActions && line.match(/^[-*•]\s+.+/) && line.length > 5) {
      actionItems.push({ task: line.replace(/^[-*•]\s+/, "").trim() });
    }
  }

  if (attendees.length === 0) {
    const nameLike = /(?:^|\s)([A-Z][a-z]+ [A-Z][a-z]+)(?:\s|$|,|\.)/g;
    let m: RegExpExecArray | null;
    while ((m = nameLike.exec(text)) !== null) {
      if (!attendees.includes(m[1])) attendees.push(m[1]);
    }
  }

  return {
    date,
    title,
    attendees: Array.from(new Set(attendees)).slice(0, 30),
    keyDecisions: keyDecisions.slice(0, 20),
    actionItems: actionItems.slice(0, 20),
    nextMeeting: undefined,
    notes: undefined,
  };
}

function normalizeExtracted(raw: unknown): ExtractedMinutes {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    date: typeof o.date === "string" ? o.date : new Date().toISOString().slice(0, 10),
    title: typeof o.title === "string" ? o.title : "Meeting notes",
    attendees: Array.isArray(o.attendees)
      ? o.attendees.filter((x): x is string => typeof x === "string")
      : [],
    keyDecisions: Array.isArray(o.keyDecisions)
      ? o.keyDecisions.filter((x): x is string => typeof x === "string")
      : [],
    actionItems: Array.isArray(o.actionItems)
      ? o.actionItems.map((x) => {
          const item = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
          return {
            task: typeof item.task === "string" ? item.task : String(item.task ?? ""),
            assignee: typeof item.assignee === "string" ? item.assignee : undefined,
            due: typeof item.due === "string" ? item.due : undefined,
          };
        })
      : [],
    nextMeeting: typeof o.nextMeeting === "string" ? o.nextMeeting : undefined,
    notes: typeof o.notes === "string" ? o.notes : undefined,
  };
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface ClubRow {
  id: string;
  name: string;
  action_reminder_days: number | null;
}

interface CriticalActionItemRow {
  id: string;
  club_id: string;
  task: string;
  assignee_email: string;
  due_date: string;
  created_at: string;
  reminder_sent: boolean;
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.REMINDER_FROM_EMAIL;
  if (!resendApiKey || !fromEmail) {
    return NextResponse.json(
      { error: "Email environment variables not configured" },
      { status: 500 }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase admin client is not configured" },
      { status: 500 }
    );
  }

  const { data: clubs, error: clubsError } = await supabaseAdmin
    .from("clubs")
    .select("id, name, action_reminder_days");

  if (clubsError || !clubs) {
    console.error("send-action-reminders: clubs error", clubsError);
    return NextResponse.json(
      { error: "Failed to load clubs" },
      { status: 500 }
    );
  }

  const clubById = new Map<string, ClubRow>();
  for (const c of clubs as ClubRow[]) {
    clubById.set(c.id, c);
  }

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("critical_action_items")
    .select(
      "id, club_id, task, assignee_email, due_date, created_at, reminder_sent"
    )
    .eq("reminder_sent", false);

  if (itemsError || !items) {
    console.error("send-action-reminders: items error", itemsError);
    return NextResponse.json(
      { error: "Failed to load critical action items" },
      { status: 500 }
    );
  }

  const today = new Date();
  const todayMidnight = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const toSend: {
    item: CriticalActionItemRow;
    club: ClubRow;
  }[] = [];

  for (const raw of items as CriticalActionItemRow[]) {
    const club = clubById.get(raw.club_id);
    if (!club || club.action_reminder_days == null) continue;

    const due = new Date(`${raw.due_date}T00:00:00Z`);
    const diffMs = due.getTime() - todayMidnight.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === club.action_reminder_days) {
      toSend.push({ item: raw, club });
    }
  }

  const sentIds: string[] = [];

  for (const { item, club } of toSend) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: item.assignee_email,
          subject: `Reminder: "${item.task}" due for ${club.name}`,
          text: [
            `You have a critical action item for ${club.name}:`,
            ``,
            `Task: ${item.task}`,
            `Due date: ${item.due_date}`,
            ``,
            `This reminder was sent ${club.action_reminder_days} day(s) before the due date.`,
          ].join("\n"),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(
          "send-action-reminders: email send failed",
          res.status,
          text
        );
        continue;
      }

      sentIds.push(item.id);
    } catch (e) {
      console.error("send-action-reminders: email error", e);
    }
  }

  if (sentIds.length > 0) {
    const { error: updateError } = await supabaseAdmin
      .from("critical_action_items")
      .update({ reminder_sent: true })
      .in("id", sentIds);
    if (updateError) {
      console.error("send-action-reminders: update error", updateError);
    }
  }

  return NextResponse.json({
    checked: (items as CriticalActionItemRow[]).length,
    emailsSent: sentIds.length,
  });
}


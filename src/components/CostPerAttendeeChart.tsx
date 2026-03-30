"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Event, CheckIn } from "@/types";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function shortLabel(name: string, max = 14) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function CostPerAttendeeChart({
  events = [],
  checkIns = [],
}: {
  events?: Event[];
  checkIns?: CheckIn[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo(() => {
    if (!mounted) return [];
    const now = new Date();
    const past = events
      .filter((e) => new Date(e.date) < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
    return past.map((e) => {
      const attendees = checkIns.filter((c) => c.eventId === e.id).length;
      const expenseNum =
        e.expenses !== null && e.expenses !== undefined
          ? Number(e.expenses)
          : null;
      const totalExpense =
        expenseNum !== null && Number.isFinite(expenseNum) ? expenseNum : null;
      const costPerAttendee =
        attendees > 0 && totalExpense !== null
          ? totalExpense / attendees
          : attendees > 0
            ? 0
            : 0;
      return {
        name: shortLabel(e.name),
        fullName: e.name,
        costPerAttendee,
        attendees,
        totalExpense,
        date: new Date(e.date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
      };
    });
  }, [mounted, events, checkIns]);

  if (!mounted) {
    return <div className="h-[280px] w-full" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-forest-400">
        No past events yet. Cost per attendee will appear here once you have
        events with expenses and check-ins.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2d453d" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "#8fa88d", fontSize: 10 }}
            tickLine={{ stroke: "#2d453d" }}
            interval={0}
            angle={-32}
            textAnchor="end"
            height={56}
          />
          <YAxis
            type="number"
            tick={{ fill: "#8fa88d", fontSize: 11 }}
            tickLine={{ stroke: "#2d453d" }}
            tickFormatter={(v) =>
              new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(v)
            }
            label={{
              value: "Cost per attendee",
              angle: -90,
              position: "insideLeft",
              fill: "#8fa88d",
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a2e24",
              border: "1px solid #2d453d",
              borderRadius: "8px",
            }}
            formatter={(
              value: number,
              _name: string,
              item: { payload?: { attendees?: number; totalExpense?: number | null } }
            ) => {
              const attendees = item?.payload?.attendees ?? 0;
              const total = item?.payload?.totalExpense;
              if (attendees === 0) {
                return ["No check-ins — cannot divide cost", "Per attendee"];
              }
              if (total === null || total === undefined) {
                return [
                  `${money.format(value)} (expense not set; $0 assumed)`,
                  "Per attendee",
                ];
              }
              return [
                `${money.format(value)} (${money.format(total)} ÷ ${attendees} attendee${attendees === 1 ? "" : "s"})`,
                "Per attendee",
              ];
            }}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload as {
                fullName?: string;
                date?: string;
              };
              if (!p?.fullName) return "";
              return p.date ? `${p.fullName} (${p.date})` : p.fullName;
            }}
          />
          <Bar
            dataKey="costPerAttendee"
            name="Cost per attendee"
            fill="#8fa88d"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

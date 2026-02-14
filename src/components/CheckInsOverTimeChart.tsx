"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { store } from "@/lib/store";

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function getWeekLabel(weekKey: string): string {
  const d = new Date(weekKey);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

export function CheckInsOverTimeChart() {
  const data = useMemo(() => {
    const checkIns = store.checkIns.getAll();
    const byWeek: Record<string, number> = {};
    const now = new Date();
    for (let w = 0; w < 12; w++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (11 - w) * 7);
      const key = getWeekKey(weekStart);
      byWeek[key] = 0;
    }
    checkIns.forEach((c) => {
      const key = getWeekKey(new Date(c.checkedInAt));
      if (byWeek[key] !== undefined) byWeek[key]++;
    });
    const sorted = Object.keys(byWeek).sort();
    return sorted.map((key) => ({
      week: getWeekLabel(key),
      fullDate: key,
      checkIns: byWeek[key],
    }));
  }, []);

  if (data.every((d) => d.checkIns === 0)) {
    return (
      <div className="flex h-[260px] items-center justify-center text-forest-400">
        No check-in data yet. Check-ins will appear here by week.
      </div>
    );
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2d453d" />
          <XAxis
            dataKey="week"
            tick={{ fill: "#8fa88d", fontSize: 11 }}
            tickLine={{ stroke: "#2d453d" }}
          />
          <YAxis
            tick={{ fill: "#8fa88d", fontSize: 11 }}
            tickLine={{ stroke: "#2d453d" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a2e24",
              border: "1px solid #2d453d",
              borderRadius: "8px",
            }}
            labelStyle={{ color: "#8fa88d" }}
            formatter={(value: number) => [`${value} check-ins`, "Check-ins"]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.week ?? ""
            }
          />
          <Bar
            dataKey="checkIns"
            name="Check-ins"
            fill="#8fa88d"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

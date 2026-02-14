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

export function EventAttendanceChart() {
  const data = useMemo(() => {
    const events = store.events.getAll();
    const now = new Date();
    const past = events
      .filter((e) => new Date(e.date) < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
    return past.map((e) => ({
      name: e.name.length > 20 ? e.name.slice(0, 18) + "…" : e.name,
      fullName: e.name,
      attendance: store.checkIns.getByEventId(e.id).length,
      date: new Date(e.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    }));
  }, []);

  if (data.length === 0) return null;

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2d453d" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "#8fa88d", fontSize: 11 }}
            tickLine={{ stroke: "#2d453d" }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={100}
            tick={{ fill: "#8fa88d", fontSize: 10 }}
            tickLine={{ stroke: "#2d453d" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a2e24",
              border: "1px solid #2d453d",
              borderRadius: "8px",
            }}
            formatter={(value: number) => [`${value}`, "Attendance"]}
            labelFormatter={(_, payload) => {
              const p = payload?.[0]?.payload;
              return p ? `${p.fullName} (${p.date})` : "";
            }}
          />
          <Bar
            dataKey="attendance"
            name="Attendance"
            fill="#8fa88d"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

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
import type { FeedbackAverageByEvent } from "@/lib/supabaseData";

function shortLabel(name: string, max = 14) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function FeedbackScoresByEventChart({
  rows = [],
}: {
  rows?: FeedbackAverageByEvent[];
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo(() => {
    if (!mounted) return [];
    return rows.map((r) => ({
      name: shortLabel(r.eventName),
      fullName: r.eventName,
      avgRating: Math.round(r.avgRating * 10) / 10,
      responseCount: r.responseCount,
      date: r.eventDate
        ? new Date(r.eventDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "",
    }));
  }, [mounted, rows]);

  if (!mounted) {
    return <div className="h-[280px] w-full" />;
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center text-forest-400">
        No feedback yet. Create surveys on past events and collect responses to
        see average scores here.
      </div>
    );
  }

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 48 }}
        >
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
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fill: "#8fa88d", fontSize: 11 }}
            tickLine={{ stroke: "#2d453d" }}
            label={{
              value: "Avg score (1–5)",
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
            formatter={(value: number, _name: string, props: { payload?: { responseCount?: number } }) => {
              const n = props?.payload?.responseCount ?? 0;
              return [`${value} (${n} response${n === 1 ? "" : "s"})`, "Avg rating"];
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
            dataKey="avgRating"
            name="Avg rating"
            fill="#8fa88d"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

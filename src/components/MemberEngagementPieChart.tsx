"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CheckIn, Event, Member } from "@/types";
import { segmentMembersByEngagement } from "@/lib/memberEngagement";

const COLORS = {
  core: "#d4c85c",
  casual: "#8fa88d",
  inactive: "#4a6048",
} as const;

function parseYmdToDate(ymd: string): Date {
  // Avoid timezone shifts by constructing from numbers (local time).
  const [y, m, d] = ymd.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

function formatEngagementWindowRange(windowStart: string, windowEnd: string) {
  const startDate = parseYmdToDate(windowStart);
  const endDate = parseYmdToDate(windowEnd);

  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  });
  const year = new Intl.DateTimeFormat("en-US", { year: "numeric" });

  const start = monthDay.format(startDate);
  const end = monthDay.format(endDate);

  return startDate.getFullYear() === endDate.getFullYear()
    ? `${start} \u2013 ${end}, ${year.format(endDate)}`
    : `${start}, ${year.format(startDate)} \u2013 ${end}, ${year.format(endDate)}`;
}

export function MemberEngagementPieChart({
  members = [],
  events = [],
  checkIns = [],
}: {
  members: Member[];
  events: Event[];
  checkIns: CheckIn[];
}) {
  const [mounted, setMounted] = useState(false);
  const [months, setMonths] = useState(6);

  useEffect(() => {
    setMounted(true);
  }, []);

  const segments = useMemo(
    () => segmentMembersByEngagement(members, checkIns, events, months),
    [members, checkIns, events, months]
  );

  const pieData = useMemo(() => {
    return [
      { name: "Core (≥70% of events)", key: "core" as const, value: segments.core },
      { name: "Casual (30–70%)", key: "casual" as const, value: segments.casual },
      {
        name: "Inactive (<30%)",
        key: "inactive" as const,
        value: segments.inactive,
      },
    ];
  }, [segments.core, segments.casual, segments.inactive]);

  if (!mounted) {
    return <div className="h-[300px] w-full" />;
  }

  if (segments.totalMembers === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center text-forest-400">
        No members on your roster yet. People appear after they check in to an
        event (officers with accounts are included too).
      </div>
    );
  }

  if (segments.totalEventsInWindow === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-1 text-xs text-forest-400">
            <span>Last N months (from today)</span>
            <input
              type="number"
              min={1}
              max={12}
              value={months}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (Number.isNaN(v)) return;
                setMonths(Math.min(12, Math.max(1, v)));
              }}
              className="w-20 rounded-md border border-forest-700 bg-forest-950 px-2 py-1.5 text-sm text-white"
            />
          </label>
        </div>
        <p className="text-sm text-forest-400">
          No events fall in this window ({segments.windowStart} –{" "}
          {segments.windowEnd}). Try increasing the number of months or add
          events in this range.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <label className="flex flex-col gap-1 text-xs text-forest-400">
          <span>Last N months (from today)</span>
          <input
            type="number"
            min={1}
            max={12}
            value={months}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (Number.isNaN(v)) return;
              setMonths(Math.min(12, Math.max(1, v)));
            }}
            className="w-20 rounded-md border border-forest-700 bg-forest-950 px-2 py-1.5 text-sm text-white"
          />
        </label>
        <p className="max-w-md text-xs text-forest-400">
          Members are grouped by attendance:{" "}
          <span className="text-forest-300">Core (70%+)</span>,{" "}
          <span className="text-forest-300">Casual (30–70%)</span>, and{" "}
          <span className="text-forest-300">Inactive (&lt;30%)</span> over the last{" "}
          {segments.totalEventsInWindow} event{segments.totalEventsInWindow === 1 ? "" : "s"} (
          {formatEngagementWindowRange(segments.windowStart, segments.windowEnd)}).
        </p>
      </div>

      <div className="h-[280px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={88}
              paddingAngle={2}
              labelLine={false}
              label={(props: {
                name?: string;
                percent?: number;
                value?: number;
              }) => {
                if (!props.value) return null;
                const short = (props.name ?? "").split(" ")[0] || "";
                return `${short} ${((props.percent ?? 0) * 100).toFixed(0)}%`;
              }}
            >
              {pieData.map((entry) => (
                <Cell key={entry.key} fill={COLORS[entry.key]} stroke="#1a2e24" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a2e24",
                border: "1px solid #2d453d",
                borderRadius: "8px",
              }}
              formatter={(value: number) => [
                `${value} member${value === 1 ? "" : "s"}`,
                "Count",
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#8fa88d" }}
              formatter={(value) => value}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

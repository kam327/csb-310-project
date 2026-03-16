"use client";

import { useEffect, useMemo, useState } from "react";
import type { Event, CheckIn } from "@/types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOUR_LABELS = [
  "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
  "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM",
  "6 PM", "7 PM", "8 PM", "9 PM", "10 PM", "11 PM",
];
const HOUR_START = 6;

function bucketHour(hour: number): number | null {
  if (hour < HOUR_START || hour > 23) return null;
  return hour;
}

export function DayOfWeekHeatmap({
  events = [],
  checkIns = [],
}: {
  events?: Event[];
  checkIns?: CheckIn[];
}) {
  const [mounted, setMounted] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const checkInsByEvent = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of checkIns) {
      map.set(c.eventId, (map.get(c.eventId) ?? 0) + 1);
    }
    return map;
  }, [checkIns]);

  const dayData = useMemo(() => {
    if (!mounted) return [];
    const counts = Array(7).fill(0) as number[];
    for (const e of events) {
      const day = new Date(e.date + "T12:00:00").getDay();
      counts[day] += checkInsByEvent.get(e.id) ?? 0;
    }
    return counts;
  }, [mounted, events, checkInsByEvent]);

  const hourData = useMemo(() => {
    if (selectedDay === null || !mounted) return [];

    const hours = new Array(HOUR_LABELS.length).fill(0) as number[];

    const dayEvents = events.filter((e) => {
      const day = new Date(e.date + "T12:00:00").getDay();
      return day === selectedDay;
    });

    for (const e of dayEvents) {
      const count = checkInsByEvent.get(e.id) ?? 0;
      if (count === 0) continue;

      let hour: number | null = null;
      if (e.time) {
        const [h] = e.time.split(":").map(Number);
        hour = bucketHour(h);
      }

      if (hour === null) {
        const eventCheckIns = checkIns.filter((c) => c.eventId === e.id);
        if (eventCheckIns.length > 0) {
          const h = new Date(eventCheckIns[0].checkedInAt).getHours();
          hour = bucketHour(h);
        }
      }

      if (hour !== null) {
        hours[hour - HOUR_START] += count;
      }
    }

    return hours;
  }, [selectedDay, mounted, events, checkIns, checkInsByEvent]);

  if (!mounted) {
    return <div className="h-[260px] w-full" />;
  }

  const maxDay = Math.max(...dayData, 1);
  const maxHour = Math.max(...hourData, 1);

  const nonZeroHours = hourData
    .map((count, i) => ({ index: i, count }))
    .filter((h) => h.count > 0);

  const bestHourIndex =
    nonZeroHours.length > 0
      ? nonZeroHours.reduce((best, h) => (h.count > best.count ? h : best))
          .index
      : null;

  if (dayData.every((d) => d === 0)) {
    return (
      <div className="flex h-[260px] items-center justify-center text-forest-400">
        No event data yet. Check-ins by day of week will appear here.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-2">
        {DAY_LABELS.map((label, i) => {
          const intensity = dayData[i] / maxDay;
          const isSelected = selectedDay === i;

          return (
            <button
              key={label}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : i)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 transition ${
                isSelected
                  ? "border-gauge-400 ring-1 ring-gauge-400"
                  : "border-forest-700 hover:border-forest-500"
              }`}
              style={{
                backgroundColor:
                  dayData[i] === 0
                    ? "rgba(45, 69, 61, 0.3)"
                    : `rgba(143, 168, 141, ${0.15 + intensity * 0.6})`,
              }}
            >
              <span className="text-xs font-medium text-forest-300">
                {label}
              </span>
              <span className="text-lg font-bold text-white">
                {dayData[i]}
              </span>
              <span className="text-[10px] text-forest-400">check-ins</span>
            </button>
          );
        })}
      </div>

      {selectedDay !== null && (
        <div className="mt-4 rounded-lg border border-forest-700 bg-forest-900/60 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-forest-300">
              {DAY_LABELS[selectedDay]} — check-ins by time of day
            </h4>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-xs text-forest-400 hover:text-forest-200"
            >
              Close
            </button>
          </div>

          {nonZeroHours.length === 0 ? (
            <p className="mt-3 text-sm text-forest-400">
              No time-of-day data available for {DAY_LABELS[selectedDay]}{" "}
              events. Add start times to your events for this breakdown.
            </p>
          ) : (
            <>
              {bestHourIndex !== null && (
                <p className="mt-2 text-sm text-gauge-400">
                  Best time:{" "}
                  <span className="font-semibold text-gauge-300">
                    {HOUR_LABELS[bestHourIndex]}
                  </span>{" "}
                  ({hourData[bestHourIndex]} check-ins)
                </p>
              )}
              <div className="mt-3 space-y-1.5">
                {nonZeroHours.map(({ index, count }) => {
                  const width = (count / maxHour) * 100;
                  const isBest = index === bestHourIndex;

                  return (
                    <div key={index} className="flex items-center gap-2">
                      <span className="w-14 text-right text-xs text-forest-400">
                        {HOUR_LABELS[index]}
                      </span>
                      <div className="relative h-5 flex-1 overflow-hidden rounded bg-forest-800">
                        <div
                          className={`absolute inset-y-0 left-0 rounded transition-all ${
                            isBest ? "bg-gauge-500" : "bg-forest-500"
                          }`}
                          style={{ width: `${Math.max(width, 4)}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-xs font-medium text-forest-300">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

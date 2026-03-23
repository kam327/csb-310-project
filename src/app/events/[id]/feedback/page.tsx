"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, MessageCircle, User } from "lucide-react";
import type { Event, FeedbackSurvey, SurveyResponse } from "@/types";
import {
  fetchEventById,
  fetchSurveyForEvent,
  fetchSurveyResponses,
} from "@/lib/supabaseData";

function StarDisplay({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < value ? "fill-brand-400 text-brand-400" : "text-forest-600"
          }`}
        />
      ))}
    </span>
  );
}

export default function FeedbackResultsPage() {
  const { id } = useParams() as { id: string };
  const [event, setEvent] = useState<Event | null>(null);
  const [survey, setSurvey] = useState<FeedbackSurvey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ev, sv] = await Promise.all([
        fetchEventById(id),
        fetchSurveyForEvent(id),
      ]);
      if (cancelled) return;
      setEvent(ev);
      setSurvey(sv);
      if (sv) {
        const res = await fetchSurveyResponses(sv.id);
        if (!cancelled) setResponses(res);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-forest-400">Loading feedback&hellip;</p>
      </div>
    );
  }

  if (!event || !survey) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-forest-400">
          {!event ? "Event not found." : "No survey has been created for this event yet."}
        </p>
        <Link
          href={`/events/${id}`}
          className="mt-4 inline-block text-gauge-400 hover:text-gauge-300"
        >
          Back to event
        </Link>
      </div>
    );
  }

  const avgRating =
    responses.length > 0
      ? responses.reduce((sum, r) => sum + r.rating, 0) / responses.length
      : 0;

  const ratingDist = [0, 0, 0, 0, 0];
  for (const r of responses) {
    ratingDist[r.rating - 1]++;
  }

  const questions = [survey.question1, survey.question2, survey.question3].filter(
    Boolean
  ) as string[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href={`/events/${id}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-forest-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to event
      </Link>

      <div className="mt-6">
        <h1 className="text-2xl font-bold text-white">Feedback results</h1>
        <p className="mt-1 text-forest-400">{event.name}</p>
      </div>

      {/* Summary card */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-forest-400">
            Average rating
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-4xl font-bold text-white">
              {avgRating > 0 ? avgRating.toFixed(1) : "\u2014"}
            </span>
            <span className="text-forest-400">/ 5</span>
          </div>
          {avgRating > 0 && (
            <div className="mt-2">
              <StarDisplay value={Math.round(avgRating)} />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-forest-400">
            Total responses
          </p>
          <p className="mt-2 text-4xl font-bold text-white">{responses.length}</p>

          {/* Rating distribution */}
          {responses.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = ratingDist[n - 1];
                const pct = responses.length > 0 ? (count / responses.length) * 100 : 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-sm">
                    <span className="w-3 text-right text-forest-400">{n}</span>
                    <Star className="h-3.5 w-3.5 text-brand-400" />
                    <div className="flex-1 overflow-hidden rounded-full bg-forest-800 h-2">
                      <div
                        className="h-full rounded-full bg-brand-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-forest-400">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Individual responses */}
      <h2 className="mt-10 flex items-center gap-2 text-lg font-semibold text-white">
        <MessageCircle className="h-5 w-5 text-forest-400" />
        Individual responses
      </h2>

      {responses.length === 0 ? (
        <p className="mt-4 text-forest-400">
          No responses yet. Share the survey QR code with your attendees!
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {responses.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border border-forest-800 bg-forest-900/80 p-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StarDisplay value={r.rating} />
                  <span className="text-sm font-medium text-white">
                    {r.rating} / 5
                  </span>
                </div>
                <span className="text-xs text-forest-400">
                  {new Date(r.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {(r.respondentName || r.respondentEmail) && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-forest-300">
                  <User className="h-3.5 w-3.5" />
                  {r.respondentName}
                  {r.respondentEmail && (
                    <span className="text-forest-400">
                      ({r.respondentEmail})
                    </span>
                  )}
                </div>
              )}

              {questions.length > 0 && (
                <div className="mt-3 space-y-3">
                  {questions.map((q, i) => {
                    const answer = [r.answer1, r.answer2, r.answer3][i];
                    if (!answer) return null;
                    return (
                      <div key={i}>
                        <p className="text-xs font-medium text-forest-400">{q}</p>
                        <p className="mt-0.5 text-sm text-forest-200">{answer}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

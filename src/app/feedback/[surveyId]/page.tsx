"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, Star } from "lucide-react";
import type { Event, FeedbackSurvey } from "@/types";
import {
  fetchSurveyById,
  fetchEventById,
  insertSurveyResponse,
} from "@/lib/supabaseData";

export default function FeedbackSurveyPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;

  const [survey, setSurvey] = useState<FeedbackSurvey | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [a3, setA3] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSurveyById(surveyId).then(async (s) => {
      setSurvey(s);
      if (s) {
        const ev = await fetchEventById(s.eventId);
        setEvent(ev);
      }
      setLoading(false);
    });
  }, [surveyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError("Please select a rating.");
      return;
    }

    setSubmitting(true);
    const { error: err } = await insertSurveyResponse({
      surveyId,
      rating,
      answer1: a1 || undefined,
      answer2: a2 || undefined,
      answer3: a3 || undefined,
      respondentName: name || undefined,
      respondentEmail: email || undefined,
    });
    setSubmitting(false);

    if (err) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4">
        <p className="text-forest-400">Loading survey&hellip;</p>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4">
        <p className="text-forest-400">Survey not found.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 text-green-400">
          <CheckCircle className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-xl font-bold text-white">
          Thanks for your feedback!
        </h1>
        {event && (
          <p className="mt-2 text-forest-300">
            Your response for{" "}
            <span className="font-medium text-white">{event.name}</span> has
            been recorded.
          </p>
        )}
      </div>
    );
  }

  const questions = [
    survey.question1,
    survey.question2,
    survey.question3,
  ].filter(Boolean) as string[];
  const answers = [a1, a2, a3];
  const setters = [setA1, setA2, setA3];

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-forest-800 bg-forest-900/90 p-6 shadow-xl">
        <h1 className="text-xl font-bold text-white">Event feedback</h1>
        {event && (
          <>
            <p className="mt-1 text-forest-300">{event.name}</p>
            <p className="text-sm text-forest-400">
              {new Date(event.date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Star rating */}
          <div>
            <label className="block text-sm font-medium text-forest-300">
              How would you rate this event? <span className="text-red-400">*</span>
            </label>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="rounded p-1 transition hover:scale-110 focus:outline-none"
                  aria-label={`${n} star${n !== 1 ? "s" : ""}`}
                >
                  <Star
                    className={`h-8 w-8 transition ${
                      n <= (hoverRating || rating)
                        ? "fill-brand-400 text-brand-400"
                        : "text-forest-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="mt-1 text-sm text-forest-400">
                {rating} / 5
              </p>
            )}
          </div>

          {/* Custom questions */}
          {questions.map((q, i) => (
            <div key={i}>
              <label className="block text-sm font-medium text-forest-300">
                {q}
              </label>
              <textarea
                value={answers[i]}
                onChange={(e) => setters[i](e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-3 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
              />
            </div>
          ))}

          {/* Optional name / email */}
          <div className="space-y-3 rounded-lg border border-forest-700/50 bg-forest-800/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-forest-400">
              Optional &mdash; identify yourself
            </p>
            <div>
              <label className="block text-sm font-medium text-forest-300">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-forest-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                autoComplete="email"
                className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-white placeholder-forest-400 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 py-3 font-semibold text-slate-900 transition hover:bg-brand-400 disabled:opacity-60"
          >
            {submitting ? "Submitting\u2026" : "Submit feedback"}
          </button>
        </form>
      </div>
    </div>
  );
}

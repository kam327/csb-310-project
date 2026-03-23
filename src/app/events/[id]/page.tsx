"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  Users,
  Copy,
  ExternalLink,
  Smartphone,
  MessageSquarePlus,
  ClipboardList,
  Star,
} from "lucide-react";
import type { Event, CheckIn, FeedbackSurvey } from "@/types";
import {
  fetchEventById,
  fetchAttendanceForEvent,
  fetchSurveyForEvent,
  createFeedbackSurvey,
} from "@/lib/supabaseData";

const BASE_URL_KEY = "gauge-checkin-base-url";

function isLocalhost(origin: string): boolean {
  try {
    const u = new URL(origin);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [copied, setCopied] = useState(false);
  const [baseUrlOverride, setBaseUrlOverride] = useState("");
  const [baseUrlInput, setBaseUrlInput] = useState("");

  const [survey, setSurvey] = useState<FeedbackSurvey | null>(null);
  const [showSurveySetup, setShowSurveySetup] = useState(false);
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [creatingSurvey, setCreatingSurvey] = useState(false);
  const [surveyLinkCopied, setSurveyLinkCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchEventById(id),
      fetchAttendanceForEvent(id),
      fetchSurveyForEvent(id),
    ]).then(([e, cis, s]) => {
      if (!cancelled) {
        setEvent(e ?? null);
        setCheckIns(cis);
        setSurvey(s);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(BASE_URL_KEY);
    if (saved) setBaseUrlOverride(saved);
  }, []);

  const effectiveOrigin =
    baseUrlOverride.trim() || (typeof window !== "undefined" ? window.location.origin : "");
  const checkInUrl = effectiveOrigin ? `${effectiveOrigin.replace(/\/$/, "")}/checkin/${id}` : "";
  const showLocalhostWarning =
    typeof window !== "undefined" && isLocalhost(window.location.origin) && !baseUrlOverride.trim();

  const surveyUrl =
    survey && effectiveOrigin
      ? `${effectiveOrigin.replace(/\/$/, "")}/feedback/${survey.id}`
      : "";

  const copyCheckInLink = () => {
    if (!checkInUrl) return;
    navigator.clipboard.writeText(checkInUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copySurveyLink = () => {
    if (!surveyUrl) return;
    navigator.clipboard.writeText(surveyUrl);
    setSurveyLinkCopied(true);
    setTimeout(() => setSurveyLinkCopied(false), 2000);
  };

  const handleCreateSurvey = async () => {
    setCreatingSurvey(true);
    const { data } = await createFeedbackSurvey({
      eventId: id,
      question1: q1 || undefined,
      question2: q2 || undefined,
      question3: q3 || undefined,
    });
    setCreatingSurvey(false);
    if (data) {
      setSurvey(data);
      setShowSurveySetup(false);
    }
  };

  const applyBaseUrl = () => {
    const value = baseUrlInput.trim().replace(/\/$/, "");
    if (!value) return;
    try {
      new URL(value);
      setBaseUrlOverride(value);
      sessionStorage.setItem(BASE_URL_KEY, value);
    } catch {
      const withScheme = value.startsWith("http") ? value : `http://${value}`;
      try {
        new URL(withScheme);
        setBaseUrlOverride(withScheme);
        sessionStorage.setItem(BASE_URL_KEY, withScheme);
      } catch {
        setBaseUrlInput("Invalid URL");
      }
    }
  };

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-forest-400">Event not found.</p>
        <Link href="/events" className="mt-4 inline-block text-gauge-400 hover:text-gauge-300">
          Back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        href="/events"
        className="inline-flex items-center gap-2 text-sm font-medium text-forest-300 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Left column */}
        <div className="flex flex-col gap-6 lg:min-w-[280px]">
          {/* Check-in QR */}
          <section className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
            <h2 className="text-lg font-semibold text-white">QR code check-in</h2>
            <p className="mt-1 text-sm text-forest-400">
              Members scan this to check in. Or share the link below.
            </p>

            {showLocalhostWarning && (
              <div className="mt-4 flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-left">
                <Smartphone className="h-5 w-5 shrink-0 text-amber-400" />
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-amber-200">
                    Scanning from a phone? localhost won&apos;t work.
                  </p>
                  <p className="mt-1 text-amber-200/90">
                    Enter your computer&apos;s URL (same WiFi) so the QR works on other devices:
                  </p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      type="text"
                      value={baseUrlInput}
                      onChange={(e) => setBaseUrlInput(e.target.value)}
                      placeholder="http://192.168.1.5:3000"
                      className="flex-1 rounded border border-forest-600 bg-forest-800 px-3 py-1.5 text-sm text-white placeholder-forest-400"
                    />
                    <button
                      type="button"
                      onClick={applyBaseUrl}
                      className="shrink-0 rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
                    >
                      Use for QR
                    </button>
                  </div>
                </div>
              </div>
            )}

            {checkInUrl ? (
              <div className="mt-4 flex justify-center rounded-lg bg-white p-4">
                <QRCodeSVG value={checkInUrl} size={200} level="M" />
              </div>
            ) : (
              <div className="mt-4 flex h-[232px] items-center justify-center rounded-lg bg-forest-800 text-forest-400">
                Set base URL above to generate QR
              </div>
            )}
            {baseUrlOverride && (
              <p className="mt-2 text-center text-xs text-forest-400">
                QR points to: {baseUrlOverride}
                <button
                  type="button"
                  onClick={() => {
                    setBaseUrlOverride("");
                    setBaseUrlInput("");
                    sessionStorage.removeItem(BASE_URL_KEY);
                  }}
                  className="ml-1 text-gauge-400 hover:text-gauge-300"
                >
                  Reset
                </button>
              </p>
            )}
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={copyCheckInLink}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-forest-600 bg-forest-800 px-4 py-2.5 text-sm font-medium text-forest-300 transition hover:bg-forest-700"
              >
                <Copy className="h-4 w-4" />
                {copied ? "Copied!" : "Copy check-in link"}
              </button>
              <a
                href={checkInUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-400"
              >
                <ExternalLink className="h-4 w-4" />
                Open check-in page
              </a>
            </div>
          </section>

          {/* Feedback Survey */}
          <section className="rounded-xl border border-forest-800 bg-forest-900/80 p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Star className="h-5 w-5 text-brand-400" />
              Feedback survey
            </h2>

            {survey ? (
              <>
                <p className="mt-1 text-sm text-forest-400">
                  Share this QR so attendees can rate the event and answer your
                  questions.
                </p>
                {surveyUrl && (
                  <div className="mt-4 flex justify-center rounded-lg bg-white p-4">
                    <QRCodeSVG value={surveyUrl} size={200} level="M" />
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  <button
                    type="button"
                    onClick={copySurveyLink}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-forest-600 bg-forest-800 px-4 py-2.5 text-sm font-medium text-forest-300 transition hover:bg-forest-700"
                  >
                    <Copy className="h-4 w-4" />
                    {surveyLinkCopied ? "Copied!" : "Copy survey link"}
                  </button>
                  <a
                    href={surveyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-forest-600 bg-forest-800 px-4 py-2.5 text-sm font-medium text-forest-300 transition hover:bg-forest-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open survey page
                  </a>
                  <Link
                    href={`/events/${id}/feedback`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-400"
                  >
                    <ClipboardList className="h-4 w-4" />
                    View feedback results
                  </Link>
                </div>
              </>
            ) : showSurveySetup ? (
              <>
                <p className="mt-1 text-sm text-forest-400">
                  Every survey includes a 1&ndash;5 event rating. Add up to 3 custom
                  open-ended questions below (optional).
                </p>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-forest-300">
                      Question 1
                    </label>
                    <input
                      type="text"
                      value={q1}
                      onChange={(e) => setQ1(e.target.value)}
                      placeholder="e.g. What did you enjoy most?"
                      className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-sm text-white placeholder-forest-500 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-forest-300">
                      Question 2
                    </label>
                    <input
                      type="text"
                      value={q2}
                      onChange={(e) => setQ2(e.target.value)}
                      placeholder="e.g. How can we improve?"
                      className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-sm text-white placeholder-forest-500 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-forest-300">
                      Question 3
                    </label>
                    <input
                      type="text"
                      value={q3}
                      onChange={(e) => setQ3(e.target.value)}
                      placeholder="e.g. Any other thoughts?"
                      className="mt-1 w-full rounded-lg border border-forest-700 bg-forest-800 px-4 py-2.5 text-sm text-white placeholder-forest-500 focus:border-gauge-500 focus:ring-1 focus:ring-gauge-500"
                    />
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSurveySetup(false)}
                    className="flex-1 rounded-lg border border-forest-600 bg-forest-800 px-4 py-2.5 text-sm font-medium text-forest-300 transition hover:bg-forest-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSurvey}
                    disabled={creatingSurvey}
                    className="flex-1 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-400 disabled:opacity-60"
                  >
                    {creatingSurvey ? "Creating\u2026" : "Create survey"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-forest-400">
                  No survey yet. Create one to collect attendee feedback.
                </p>
                <button
                  type="button"
                  onClick={() => setShowSurveySetup(true)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-brand-400"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  Open feedback survey
                </button>
              </>
            )}
          </section>
        </div>

        {/* Right column */}
        <section className="flex-1 rounded-xl border border-forest-800 bg-forest-900/80 p-6">
          <h2 className="text-lg font-semibold text-white">{event.name}</h2>
          <p className="mt-1 text-forest-400">
            {new Date(event.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
            {event.time && (
              <>
                {" \u00b7 "}
                {new Date(`${event.date}T${event.time}`).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {event.endTime && (
                  <>
                    {" \u2013 "}
                    {new Date(`${event.date}T${event.endTime}`).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </>
                )}
              </>
            )}
          </p>
          {event.description && (
            <p className="mt-3 text-forest-300">{event.description}</p>
          )}

          <div className="mt-6 flex items-center gap-2 text-forest-300">
            <Users className="h-5 w-5" />
            <span className="font-medium text-white">
              {checkIns.length} check-in{checkIns.length !== 1 ? "s" : ""}
            </span>
          </div>

          {checkIns.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {checkIns
                .sort(
                  (a, b) =>
                    new Date(b.checkedInAt).getTime() -
                    new Date(a.checkedInAt).getTime()
                )
                .map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border border-forest-800 bg-forest-800/50 px-4 py-3"
                  >
                    <span className="font-medium text-white">{c.memberName}</span>
                    <span className="text-sm text-forest-400">
                      {new Date(c.checkedInAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-4 text-forest-400">
              No check-ins yet. Share the QR code or link at your event.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

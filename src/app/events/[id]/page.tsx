"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Users, Copy, ExternalLink, Smartphone } from "lucide-react";
import { store } from "@/lib/store";
import type { Event, CheckIn } from "@/types";

const BASE_URL_KEY = "gauge-checkin-base-url";

function getDefaultOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

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

  useEffect(() => {
    const e = store.events.getById(id);
    setEvent(e ?? null);
    setCheckIns(store.checkIns.getByEventId(id));
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

  const copyCheckInLink = () => {
    if (!checkInUrl) return;
    navigator.clipboard.writeText(checkInUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyBaseUrl = () => {
    const value = baseUrlInput.trim().replace(/\/$/, "");
    if (!value) return;
    try {
      new URL(value);
      setBaseUrlOverride(value);
      sessionStorage.setItem(BASE_URL_KEY, value);
    } catch {
      // allow relative-looking values like "192.168.1.5:3000", normalize to http
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
        <p className="text-slate-500">Event not found.</p>
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
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to events
      </Link>

      <div className="mt-6 flex flex-col gap-8 lg:flex-row lg:items-start">
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 lg:min-w-[280px]">
          <h2 className="text-lg font-semibold text-white">QR code check-in</h2>
          <p className="mt-1 text-sm text-slate-500">
            Members scan this to check in. Or share the link below.
          </p>

          {showLocalhostWarning && (
            <div className="mt-4 flex gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-left">
              <Smartphone className="h-5 w-5 shrink-0 text-amber-400" />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-amber-200">
                  Scanning from a phone? localhost won’t work.
                </p>
                <p className="mt-1 text-amber-200/90">
                  Enter your computer’s URL (same WiFi) so the QR works on other devices:
                </p>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    placeholder="http://192.168.1.5:3000"
                    className="flex-1 rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-white placeholder-slate-500"
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
            <div className="mt-4 flex h-[232px] items-center justify-center rounded-lg bg-slate-800 text-slate-500">
              Set base URL above to generate QR
            </div>
          )}
          {baseUrlOverride && (
            <p className="mt-2 text-center text-xs text-slate-500">
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
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

        <section className="flex-1 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <h2 className="text-lg font-semibold text-white">{event.name}</h2>
          <p className="mt-1 text-slate-500">
            {new Date(event.date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {event.description && (
            <p className="mt-3 text-slate-400">{event.description}</p>
          )}

          <div className="mt-6 flex items-center gap-2 text-slate-400">
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
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/50 px-4 py-3"
                  >
                    <span className="font-medium text-white">{c.memberName}</span>
                    <span className="text-sm text-slate-500">
                      {new Date(c.checkedInAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-4 text-slate-500">
              No check-ins yet. Share the QR code or link at your event.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";
import { Calendar, Users, FileText, QrCode, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          Keep your club&apos;s story
          <span className="text-gauge-400"> across every transition</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
          Consolidate attendance, events, and meeting minutes so incoming leaders
          can make data-driven decisions—without hunting down old docs or
          guessing what worked before.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-6 py-3 font-semibold text-slate-900 shadow-lg shadow-brand-500/25 transition hover:bg-brand-400"
          >
            Open Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-lg border border-gauge-700 bg-gauge-500/10 px-6 py-3 font-semibold text-gauge-400 transition hover:bg-gauge-500/20"
          >
            Create an event
          </Link>
        </div>
      </section>

      <section className="mt-24 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard
          icon={QrCode}
          title="QR check-in"
          description="Generate a QR code for any event. Members scan to check in—names and attendance are stored automatically for future leaders."
        />
        <FeatureCard
          icon={FileText}
          title="Meeting minutes + AI"
          description="Upload or paste meeting notes. AI extracts attendees, decisions, and action items into a structured form you can track over time."
        />
        <FeatureCard
          icon={Calendar}
          title="Events & history"
          description="See past and upcoming events in one place. Attendance and engagement history stay with the club, not with individual officers."
        />
        <FeatureCard
          icon={Users}
          title="Member roster"
          description="A single view of who’s involved, derived from check-ins and minutes. No more scattered spreadsheets or lost contact lists."
        />
      </section>

      <section className="mt-24 rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <h2 className="text-xl font-semibold text-white">
          Built for leadership turnover
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-slate-400">
          When officers graduate or rotate, important context often disappears.
          Gauge keeps attendance, events, and decisions in one place so
          new leaders can hit the ground running—and your club keeps momentum.
        </p>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition hover:border-slate-700 hover:bg-slate-900/80">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gauge-500/20 text-gauge-400">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </div>
  );
}

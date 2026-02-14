"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Users, FileText } from "lucide-react";
import { getDemoMode, setDemoMode } from "@/lib/demo-data";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/members", label: "Members", icon: Users },
  { href: "/minutes", label: "Meeting Minutes", icon: FileText },
];

export function Nav() {
  const pathname = usePathname();
  const [demoMode, setDemoModeState] = useState(false);
  useEffect(() => {
    setDemoModeState(getDemoMode());
  }, []);

  const handleDemoToggle = () => {
    const next = !getDemoMode();
    setDemoMode(next);
    setDemoModeState(next);
    // Defer reload so the event handler completes without triggering React updates during unmount (avoids "1 error" overlay)
    setTimeout(() => {
      window.location.reload();
    }, 0);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-forest-800 bg-forest-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-gauge-400"
        >
          <span className="rounded-lg bg-gauge-500/20 px-2 py-0.5">Gauge</span>
        </Link>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-forest-700 bg-forest-800/80 px-3 py-1.5 text-sm text-forest-300 transition hover:bg-forest-800">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={handleDemoToggle}
              className="h-3.5 w-3.5 rounded border-forest-600 bg-forest-800 text-gauge-500 focus:ring-gauge-500"
            />
            <span>Demo data</span>
          </label>
          <div className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-gauge-500/20 text-gauge-400"
                    : "text-forest-300 hover:bg-forest-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
          </div>
        </div>
      </div>
    </nav>
  );
}

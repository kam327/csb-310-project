"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Calendar, Users, FileText, User as UserIcon } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/events", label: "Events", icon: Calendar },
  { href: "/members", label: "Members", icon: Users },
  { href: "/minutes", label: "Meeting Minutes", icon: FileText },
];

export function Nav() {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const displayName =
    profile?.display_name || profile?.email || user?.email || "Profile";

  return (
    <nav className="sticky top-0 z-50 border-b border-forest-800 bg-forest-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold text-gauge-400"
        >
          <span className="rounded-lg bg-gauge-500/20 px-2 py-0.5">Gauge</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || (href !== "/" && pathname.startsWith(href));
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
          {user ? (
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-full border border-forest-700 bg-forest-900/80 px-3 py-1.5 text-xs font-medium text-forest-200 hover:bg-forest-800"
            >
              <UserIcon className="h-4 w-4" />
              <span className="max-w-[120px] truncate">{displayName}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-gauge-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-gauge-400"
            >
              <UserIcon className="h-4 w-4" />
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

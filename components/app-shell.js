"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboard } from "@/components/dashboard-provider";
import { StatusBadge } from "@/components/status-badge";
import { classes } from "@/lib/classes";

const navItems = [
  {
    href: "/chats",
    label: "Chats",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    )
  },
  {
    href: "/auto-reply",
    label: "Auto Reply",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
    )
  },
  {
    href: "/schedule",
    label: "Schedule",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M17.66 17.66l-1.41-1.41M6.34 6.34l-1.41-1.41M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41"/>
      </svg>
    )
  },
  {
    href: "/session",
    label: "Session",
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    )
  }
];

export function AppShell({ children }) {
  const pathname = usePathname();
  const { snapshot, error, actions } = useDashboard();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const isConnected = snapshot.status.value === "connected";

  return (
    <div className="min-h-screen bg-shell">
      {/* Top glow bar */}
      <div className="top-glow-bar" />

      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">

        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside className="relative flex-shrink-0 border-b border-white/[0.06] bg-panel/80 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:border-white/[0.06] lg:flex lg:flex-col">

          {/* Sidebar top noise texture */}
          <div className="pointer-events-none absolute inset-0 opacity-30 subtle-grid rounded-none" />

          <div className="relative flex flex-col h-full p-5">

            {/* Brand */}
            <div className="flex items-center gap-3 pb-5 border-b border-white/[0.06]">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 shadow-glowAccent">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent/80">Personal Chat</p>
                <p className="mt-0.5 text-base font-semibold text-white truncate">Control Room</p>
              </div>
            </div>

            {/* Status badge */}
            <div className="mt-4">
              <StatusBadge status={snapshot.status.value} />
            </div>

            {/* Nav */}
            <nav className="mt-5 flex flex-col gap-1">
              {navItems.map((item) => {
                const active = item.href === "/chats"
                  ? pathname === "/" || pathname === "/chats"
                  : pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={classes(
                      "group flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
                      active
                        ? "nav-item-active border-accent/30 text-white"
                        : "border-transparent text-slate-400 hover:border-white/[0.06] hover:bg-white/[0.03] hover:text-slate-200"
                    )}
                  >
                    <span className={classes("transition-colors", active ? "text-accent" : "text-slate-500 group-hover:text-slate-300")}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                    {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent shadow-glowAccent" />}
                  </Link>
                );
              })}
            </nav>

            {/* Account card */}
            <div className="mt-auto pt-5">
              <div className="rounded-xl border border-white/[0.06] bg-panelMid/60 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Account</p>
                <p className="mt-2 truncate text-sm font-medium text-slate-200">
                  {snapshot.status.clientName || "Not connected"}
                </p>

                {/* Stats grid */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Metric label="Chats" value={String(snapshot.stats.totalChats)} color="text-sky" />
                  <Metric label="Unread" value={String(snapshot.stats.unreadChats)} color="text-amber-400" />
                  <Metric label="AI" value={snapshot.settings.aiEnabled ? "On" : "Off"} color={snapshot.settings.aiEnabled ? "text-accent" : "text-red-400"} />
                  <Metric label="Sent" value={String(snapshot.stats.aiRepliedCount)} color="text-accent" />
                </div>

                {/* Logout */}
                <button
                  onClick={actions.logout}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.03] py-2 text-xs font-medium text-slate-500 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                  Sign out
                </button>
              </div>

              {error && (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/8 p-3 text-xs leading-5 text-red-300">
                  {error}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────── */}
        <main className="min-w-0 flex-1 flex flex-col">
          {/* Top bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-shell/80 px-5 py-3.5 backdrop-blur-xl lg:px-7">
            <div className="flex items-center gap-3 min-w-0">
              <div className={classes(
                "relative flex h-2 w-2 rounded-full",
                isConnected ? "bg-accent live-dot" : "bg-slate-600"
              )} />
              <p className="text-sm text-slate-400 truncate">
                {snapshot.settings.aiEnabled
                  ? <span>Auto reply is <span className="text-accent font-medium">active</span></span>
                  : <span>Auto reply is <span className="text-slate-500 font-medium">paused</span></span>
                }
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
              {error ? (
                <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-red-300">⚠ Needs attention</span>
              ) : (
                <span className="rounded-lg border border-accent/20 bg-accent/8 px-3 py-1.5 text-accent font-medium">● Live</span>
              )}
            </div>
          </div>

          {/* Page content */}
          <div className="flex-1 p-4 sm:p-5 lg:p-7 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Metric({ label, value, color = "text-white" }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-shell/60 p-2.5">
      <p className="text-[9px] uppercase tracking-[0.2em] text-slate-600">{label}</p>
      <p className={classes("mt-1 text-base font-bold", color)}>{value}</p>
    </div>
  );
}

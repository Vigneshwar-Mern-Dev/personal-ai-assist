"use client";

import { useDeferredValue, useState } from "react";
import { ChatList } from "@/components/chat-list";
import { classes } from "@/lib/classes";
import { Panel } from "@/components/panel";
import { PageIntro } from "@/components/page-intro";
import { RecentMessagesList } from "@/components/recent-messages-list";
import { useDashboard } from "@/components/dashboard-provider";

export default function ChatsPage() {
  const { snapshot } = useDashboard();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const deferredQuery = useDeferredValue(query);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredChats = snapshot.chats.filter((chat) => {
    const matchesQuery =
      !normalizedQuery ||
      chat.name?.toLowerCase().includes(normalizedQuery) ||
      chat.lastMessage?.toLowerCase().includes(normalizedQuery);
    if (!matchesQuery) return false;
    if (filter === "unread") return (chat.unreadCount || 0) > 0;
    if (filter === "pending") return Boolean(chat.pendingReply);
    return true;
  });

  return (
    <div className="space-y-6 animate-slide-up">
      <PageIntro
        eyebrow="Chats"
        title="Personal Conversations"
        description="Direct one-to-one chats only. Groups, channels, and broadcasts are ignored."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        {/* Chats panel */}
        <Panel
          title="Active Chats"
          description="Last active personal chats with unread counts and reply status."
        >
          {/* Search + filters */}
          <div className="mb-5 space-y-3">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                className="input-field pl-10"
                placeholder="Search by name or message…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={filter === "all"}
                label={`All`}
                count={snapshot.chats.length}
                onClick={() => setFilter("all")}
              />
              <FilterButton
                active={filter === "unread"}
                label="Unread"
                count={snapshot.stats.unreadChats}
                onClick={() => setFilter("unread")}
              />
              <FilterButton
                active={filter === "pending"}
                label="Queued"
                count={snapshot.stats.pendingReplies}
                onClick={() => setFilter("pending")}
              />
            </div>
          </div>

          <ChatList chats={filteredChats} />
        </Panel>

        {/* Messages panel */}
        <Panel
          title="Latest Messages"
          description="Real-time feed of the newest incoming and outgoing messages."
        >
          <RecentMessagesList messages={snapshot.recentMessages} />
        </Panel>
      </div>
    </div>
  );
}

function FilterButton({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classes(
        "inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-all duration-200",
        active
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-white/[0.07] bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-slate-200"
      )}
    >
      {label}
      <span className={classes(
        "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
        active ? "bg-accent/20 text-accent" : "bg-white/[0.06] text-slate-500"
      )}>
        {count}
      </span>
    </button>
  );
}

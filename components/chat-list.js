"use client";

import { formatDateTime } from "@/lib/format";
import { useState } from "react";
import { apiRequest } from "@/lib/api";
import { classes } from "@/lib/classes";

export function ChatList({ chats }) {
  const [submitting, setSubmitting] = useState(null);
  const [activeChatInput, setActiveChatInput] = useState(null);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  async function handleTogglePause(chatId, isCurrentlyPaused) {
    setSubmitting(chatId);
    try {
      const endpoint = isCurrentlyPaused
        ? `/api/chats/${chatId}/resume`
        : `/api/chats/${chatId}/pause`;
      await apiRequest(endpoint, { method: "POST" });
    } catch (err) {
      console.error("Failed to toggle pause:", err);
    } finally {
      setSubmitting(null);
    }
  }

  async function handleSendManualMessage(chatId, e) {
    e.preventDefault();
    if (!messageText.trim()) return;

    setSendingMessage(true);
    try {
      await apiRequest(`/api/chats/${encodeURIComponent(chatId)}/send`, {
        method: "POST",
        body: JSON.stringify({ message: messageText.trim() })
      });
      setMessageText("");
      setActiveChatInput(null);
    } catch (err) {
      alert(err.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  }

  if (!chats?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-400">No chats yet</p>
        <p className="max-w-xs text-xs text-slate-600">Connect WhatsApp first. Your personal chats will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {chats.map((chat) => {
        const isReplying = activeChatInput === chat.id;

        return (
          <div key={chat.id} className="group panel-card flex flex-col p-4 gap-3">
            <div className="flex gap-4 items-start">
              {/* Avatar */}
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 text-sm font-bold text-accent border border-accent/15">
                {getInitials(chat.name)}
                {(chat.unreadCount || 0) > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-slate-950">
                    {chat.unreadCount > 9 ? "9+" : chat.unreadCount}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">{chat.name}</p>
                  {chat.isPaused && <span className="chip-red">Human Mode</span>}
                  {chat.pendingReply && (
                    <span className="chip-amber">
                      Queued{chat.pendingReplyCount > 1 ? ` (${chat.pendingReplyCount})` : ""}
                    </span>
                  )}
                  {chat.aiReplied
                    ? <span className="chip-green">Replied</span>
                    : <span className="chip-slate">Waiting</span>
                  }
                </div>
                <p className="mt-1.5 truncate text-xs leading-5 text-slate-400">
                  {chat.lastMessage || "No message preview"}
                </p>
              </div>

              {/* Right side buttons */}
              <div className="flex shrink-0 flex-col items-end gap-2">
                <p className="text-[10px] text-slate-600 whitespace-nowrap">
                  {formatDateTime(chat.lastMessageAt)}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      if (isReplying) {
                        setActiveChatInput(null);
                      } else {
                        setActiveChatInput(chat.id);
                        setMessageText("");
                      }
                    }}
                    title="Send manual WhatsApp reply"
                    className={classes(
                      "rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all duration-200",
                      isReplying
                        ? "border-sky/40 bg-sky/20 text-sky"
                        : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
                    )}
                  >
                    💬 {isReplying ? "Close" : "Reply"}
                  </button>
                  <button
                    onClick={() => handleTogglePause(chat.id, chat.isPaused)}
                    disabled={submitting === chat.id}
                    className={classes(
                      "rounded-lg border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-all duration-200 min-w-[85px]",
                      submitting === chat.id
                        ? "cursor-wait opacity-50 border-white/10 text-slate-500"
                        : chat.isPaused
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        : "border-red-500/25 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    )}
                  >
                    {submitting === chat.id ? "…" : chat.isPaused ? "Resume AI" : "Pause AI"}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick manual message reply form */}
            {isReplying && (
              <form onSubmit={(e) => handleSendManualMessage(chat.id, e)} className="mt-2 flex gap-2 animate-fade-in border-t border-white/[0.06] pt-3">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={`Type a manual reply to ${chat.name}…`}
                  className="input-field py-2 text-xs flex-1"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !messageText.trim()}
                  className="btn-primary py-2 px-4 text-xs font-semibold shrink-0"
                >
                  {sendingMessage ? "Sending…" : "Send"}
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}

function getInitials(value) {
  return String(value || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

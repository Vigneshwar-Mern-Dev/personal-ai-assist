"use client";

import { useState } from "react";
import { useDashboard } from "@/components/dashboard-provider";
import { formatDateTime } from "@/lib/format";
import { apiRequest } from "@/lib/api";
import { classes } from "@/lib/classes";
import { StatCard } from "@/components/stat-card";

export function ScheduleManager() {
  const { snapshot } = useDashboard();
  const { scheduledMessages = [], chats = [], stats = {} } = snapshot;

  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [selectedChatId, setSelectedChatId] = useState("");
  const [customChatName, setCustomChatName] = useState("");
  const [messageText, setMessageText] = useState("");
  const [scheduledDateTime, setScheduledDateTime] = useState(getInitialDateTime());

  function getInitialDateTime() {
    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
    // Format YYYY-MM-DDTHH:mm for datetime-local
    const year = nextHour.getFullYear();
    const month = String(nextHour.getMonth() + 1).padStart(2, "0");
    const day = String(nextHour.getDate()).padStart(2, "0");
    const hours = String(nextHour.getHours()).padStart(2, "0");
    const minutes = String(nextHour.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function handleQuickTemplate(type) {
    const chatObj = chats.find((c) => c.id === selectedChatId);
    const name = chatObj ? chatObj.name : "there";

    if (type === "followup") {
      setMessageText(`Hi ${name}, following up on our previous conversation! Hope you're doing well. Let me know when you're free to catch up.`);
    } else if (type === "meeting") {
      setMessageText(`Hey ${name}, gentle reminder about our meeting scheduled for today. Looking forward to speaking with you!`);
    } else if (type === "greeting") {
      setMessageText(`Good morning ${name}! Have a fantastic day ahead.`);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");

    if (!selectedChatId) {
      setError("Please select a recipient contact");
      return;
    }

    if (!messageText.trim()) {
      setError("Please enter a message to send");
      return;
    }

    if (!scheduledDateTime) {
      setError("Please select date and time");
      return;
    }

    const chatObj = chats.find((c) => c.id === selectedChatId);
    const chatName = chatObj ? chatObj.name : customChatName || selectedChatId;

    setSubmitting(true);
    try {
      await apiRequest("/api/schedule", {
        method: "POST",
        body: JSON.stringify({
          chatId: selectedChatId,
          chatName,
          text: messageText.trim(),
          sendAt: new Date(scheduledDateTime).toISOString()
        })
      });

      setShowModal(false);
      setMessageText("");
      setSelectedChatId("");
    } catch (err) {
      setError(err.message || "Failed to schedule message");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(id) {
    try {
      await apiRequest(`/api/schedule/${encodeURIComponent(id)}/cancel`, { method: "POST" });
    } catch (err) {
      alert(err.message || "Failed to cancel message");
    }
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this scheduled item?")) return;
    try {
      await apiRequest(`/api/schedule/${encodeURIComponent(id)}`, { method: "DELETE" });
    } catch (err) {
      alert(err.message || "Failed to delete message");
    }
  }

  const filteredItems = scheduledMessages.filter((item) => {
    if (filter === "all") return true;
    return item.status === filter;
  });

  const pendingCount = scheduledMessages.filter((s) => s.status === "pending").length;
  const sentCount = scheduledMessages.filter((s) => s.status === "sent").length;
  const failedCount = scheduledMessages.filter((s) => s.status === "failed").length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Top metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Upcoming Pending"
          value={String(pendingCount)}
          hint="Scheduled messages queued for delivery"
          accent={pendingCount > 0}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          }
        />
        <StatCard
          title="Successfully Delivered"
          value={String(sentCount)}
          hint="Total messages sent on schedule"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          }
        />
        <StatCard
          title="Delivery Failures"
          value={String(failedCount)}
          hint="Messages that could not be delivered"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          }
        />
      </div>

      {/* Main card */}
      <div className="panel">
        <div className="flex flex-col gap-4 border-b border-white/[0.06] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-base font-bold text-white">Scheduled Messages</p>
            <p className="mt-1 text-xs text-slate-500">Plan and automate outgoing WhatsApp broadcasts and reminders.</p>
          </div>
          <button
            onClick={() => {
              setShowModal(true);
              setScheduledDateTime(getInitialDateTime());
            }}
            className="btn-primary shrink-0 text-xs"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Schedule New Message
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <FilterBtn active={filter === "all"} label="All" count={scheduledMessages.length} onClick={() => setFilter("all")} />
            <FilterBtn active={filter === "pending"} label="Pending" count={pendingCount} onClick={() => setFilter("pending")} />
            <FilterBtn active={filter === "sent"} label="Sent" count={sentCount} onClick={() => setFilter("sent")} />
            <FilterBtn active={filter === "failed"} label="Failed" count={failedCount} onClick={() => setFilter("failed")} />
          </div>

          {/* List */}
          {!filteredItems.length ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-500">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-400">No scheduled messages</p>
              <p className="max-w-xs text-xs text-slate-600">Click "Schedule New Message" to set up a reminder or broadcast.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div key={item.id} className="panel-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex gap-3.5 items-start min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 border border-accent/15 text-xs font-bold text-accent">
                      {getInitials(item.chatName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{item.chatName}</p>
                        <StatusChip status={item.status} />
                      </div>
                      <p className="mt-1 text-xs text-slate-300 break-words line-clamp-2">{item.text}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                        <span>🕒 Send at: <strong className="text-slate-300">{formatDateTime(item.sendAt)}</strong></span>
                        {item.status === "pending" && (
                          <span className="text-accent">⏳ {getTimeRemaining(item.sendAt)}</span>
                        )}
                        {item.errorReason && (
                          <span className="text-red-400">⚠️ Error: {item.errorReason}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2 shrink-0 border-t border-white/[0.04] pt-2 sm:border-t-0 sm:pt-0">
                    {item.status === "pending" && (
                      <button
                        onClick={() => handleCancel(item.id)}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold text-amber-300 transition hover:bg-amber-500/20"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold text-slate-400 transition hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/20"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Form Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-panel p-6 shadow-glass">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Schedule WhatsApp Message</h3>
                  <p className="text-xs text-slate-500">Program an automated message to send at an exact time.</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-500 hover:text-slate-300 text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                  {error}
                </div>
              )}

              {/* Recipient */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Recipient Contact
                </label>
                <select
                  value={selectedChatId}
                  onChange={(e) => setSelectedChatId(e.target.value)}
                  className="input-field py-2.5 text-xs text-white"
                  required
                >
                  <option value="">-- Select Contact --</option>
                  {chats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.id.split("@")[0]})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Time */}
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Schedule Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDateTime}
                  onChange={(e) => setScheduledDateTime(e.target.value)}
                  className="input-field py-2.5 text-xs text-white"
                  required
                />
              </div>

              {/* Quick AI templates */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Message Content
                  </label>
                  <span className="text-[10px] text-accent font-medium">Quick Templates:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <button
                    type="button"
                    onClick={() => handleQuickTemplate("followup")}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-slate-300 hover:border-accent/30 hover:text-accent transition"
                  >
                    📌 Follow-up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickTemplate("meeting")}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-slate-300 hover:border-accent/30 hover:text-accent transition"
                  >
                    📅 Meeting Reminder
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickTemplate("greeting")}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] text-slate-300 hover:border-accent/30 hover:text-accent transition"
                  >
                    ☀️ Morning Wish
                  </button>
                </div>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type the message text to be delivered automatically..."
                  className="textarea-field min-h-24 text-xs"
                  required
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary py-2 px-5 text-xs font-semibold"
                >
                  {submitting ? "Scheduling…" : "Confirm Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function FilterBtn({ active, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classes(
        "inline-flex items-center gap-2 rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200",
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

function StatusChip({ status }) {
  if (status === "pending") return <span className="chip-amber">Pending</span>;
  if (status === "sent") return <span className="chip-green">Sent</span>;
  if (status === "failed") return <span className="chip-red">Failed</span>;
  return <span className="chip-slate">{status}</span>;
}

function getInitials(name) {
  return String(name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

function getTimeRemaining(sendAt) {
  const diff = new Date(sendAt).getTime() - Date.now();
  if (diff <= 0) return "Due now";

  const mins = Math.floor(diff / (60 * 1000));
  if (mins < 60) return `in ${mins} min${mins === 1 ? "" : "s"}`;

  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (hours < 24) return `in ${hours}h ${remainingMins}m`;

  const days = Math.floor(hours / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

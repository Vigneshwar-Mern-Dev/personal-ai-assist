import { classes } from "@/lib/classes";
import { formatDateTime } from "@/lib/format";

export function RecentMessagesList({ messages, emptyLabel = "No messages yet." }) {
  if (!messages?.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/[0.02] py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-slate-500">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {messages.map((message) => {
        const isIncoming = message.direction === "incoming";
        return (
          <div
            key={message.id}
            className="panel-card p-4"
          >
            <div className="flex gap-3.5">
              {/* Direction indicator */}
              <div className={classes(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold border",
                isIncoming
                  ? "border-sky/15 bg-sky/10 text-sky"
                  : "border-accent/15 bg-accent/10 text-accent"
              )}>
                {isIncoming ? "IN" : "ME"}
              </div>

              <div className="min-w-0 flex-1">
                {/* Header row */}
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <p className="text-xs font-semibold text-white">{message.chatName}</p>
                  <span className={classes(
                    "rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                    isIncoming
                      ? "border-sky/20 bg-sky/8 text-sky"
                      : "border-accent/20 bg-accent/8 text-accent"
                  )}>
                    {message.direction}
                  </span>
                  {message.aiReplied && (
                    <span className="chip-green">AI replied</span>
                  )}
                </div>

                {/* Message body */}
                <p className="break-words text-xs leading-5 text-slate-400">{message.body}</p>
              </div>

              {/* Time */}
              <p className="shrink-0 text-[10px] text-slate-600 whitespace-nowrap">
                {formatDateTime(message.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

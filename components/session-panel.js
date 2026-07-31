"use client";

import { useDashboard } from "@/components/dashboard-provider";
import { formatDateTime } from "@/lib/format";
import { classes } from "@/lib/classes";

export function SessionPanel() {
  const { snapshot, actions, submitting } = useDashboard();
  const { status, session } = snapshot;

  function runSessionAction(action) {
    action().catch(() => {});
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      {/* QR panel */}
      <div className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white p-3 shadow-glow">
          {status.qrCode ? (
            <img
              alt="WhatsApp QR Code"
              className="w-full rounded-xl object-contain"
              src={status.qrCode}
            />
          ) : (
            <div className="flex aspect-square flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300/30 px-6 text-center">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><path d="M14 14h1v1h-1z"/>
                <path d="M14 17h1v1h-1z"/><path d="M17 14h1v1h-1z"/>
                <path d="M20 14h1v1h-1z"/><path d="M17 17h4v4h-4z"/>
              </svg>
              <p className="text-sm text-slate-500">No QR available. Regenerate or reconnect to get one.</p>
            </div>
          )}
        </div>

        {/* Session meta */}
        <div className="space-y-2">
          <SessionMeta
            label="Saved session"
            value={session.hasLocalSession ? "Yes — local auth cached" : "No session file"}
            accent={session.hasLocalSession}
          />
          <SessionMeta label="Connected at" value={formatDateTime(status.connectedAt)} />
          <SessionMeta label="Last action" value={formatDateTime(session.lastActionAt)} />
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <ActionRow
          title="Reconnect"
          description="Restart the client and try to restore the current session. Try this first if the connection drops."
          label="Reconnect"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          }
          busy={submitting === "session"}
          onClick={() => runSessionAction(actions.reconnect)}
          variant="default"
        />
        <ActionRow
          title="Regenerate QR"
          description="Force a fresh QR cycle if the current one is stale, missing, or expired."
          label="Regenerate"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h1v1h-1z"/>
            </svg>
          }
          busy={submitting === "session"}
          onClick={() => runSessionAction(actions.regenerateQr)}
          variant="default"
        />
        <ActionRow
          title="Logout WhatsApp"
          description="Logs out the current WhatsApp Web session but keeps the dashboard and settings intact."
          label="Logout"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          }
          busy={submitting === "session"}
          onClick={() => runSessionAction(actions.whatsappLogout)}
          variant="warning"
        />
        <ActionRow
          title="Reset Session"
          description="Deletes the local auth cache entirely and starts fresh. Only use this if the session is genuinely broken."
          label="Reset"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          }
          busy={submitting === "session"}
          onClick={() => runSessionAction(actions.resetSession)}
          variant="danger"
        />
      </div>
    </div>
  );
}

function ActionRow({ title, description, label, onClick, busy, icon, variant = "default" }) {
  const btnClass = variant === "danger"
    ? "btn-danger"
    : "btn-secondary";

  return (
    <div className="panel-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 max-w-lg text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <button className={classes(btnClass, "shrink-0 gap-2")} disabled={busy} onClick={onClick}>
          {busy ? (
            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          ) : icon}
          {label}
        </button>
      </div>
    </div>
  );
}

function SessionMeta({ label, value, accent }) {
  return (
    <div className={classes(
      "rounded-xl border px-4 py-3",
      accent ? "border-accent/15 bg-accent/[0.05]" : "border-white/[0.06] bg-panelMid/60"
    )}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">{label}</p>
      <p className={classes("mt-1.5 text-xs font-medium", accent ? "text-accent" : "text-slate-300")}>
        {value || "—"}
      </p>
    </div>
  );
}

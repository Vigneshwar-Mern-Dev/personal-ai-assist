import { classes } from "@/lib/classes";

const statusConfig = {
  connected: {
    dot: "bg-emerald-400",
    ring: "bg-emerald-400/30",
    text: "text-emerald-300",
    border: "border-emerald-500/20",
    bg: "bg-emerald-500/8",
    label: "Connected"
  },
  reconnecting: {
    dot: "bg-amber-400",
    ring: "bg-amber-400/30",
    text: "text-amber-300",
    border: "border-amber-500/20",
    bg: "bg-amber-500/8",
    label: "Reconnecting"
  },
  disconnected: {
    dot: "bg-red-400",
    ring: "",
    text: "text-red-300",
    border: "border-red-500/20",
    bg: "bg-red-500/8",
    label: "Disconnected"
  }
};

export function StatusBadge({ status }) {
  const key = status || "disconnected";
  const cfg = statusConfig[key] || statusConfig.disconnected;
  const isPulsing = key === "connected" || key === "reconnecting";

  return (
    <div className={classes(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium",
      cfg.border, cfg.bg, cfg.text
    )}>
      <span className="relative flex h-2 w-2">
        {isPulsing && (
          <span className={classes("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", cfg.ring)} />
        )}
        <span className={classes("relative inline-flex h-2 w-2 rounded-full", cfg.dot)} />
      </span>
      {cfg.label}
    </div>
  );
}

export function StatCard({ title, value, hint, icon, accent = false }) {
  return (
    <div className={`panel-card relative overflow-hidden p-5 ${accent ? "border-accent/20" : ""}`}>
      {accent && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/[0.05] to-transparent" />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
          <p className={`mt-3 text-3xl font-bold ${accent ? "text-accent" : "text-white"}`}>{value}</p>
          {hint && <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p>}
        </div>
        {icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${accent ? "border-accent/20 bg-accent/10 text-accent" : "border-white/[0.06] bg-white/[0.04] text-slate-400"}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

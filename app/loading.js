export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-shell p-6">
      <div className="flex flex-col items-center gap-5 text-center">
        {/* Animated logo */}
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent/10 shadow-glowAccent">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
          <span className="absolute inset-0 rounded-2xl border border-accent/20 animate-ping opacity-30" />
        </div>

        <p className="text-[10px] uppercase tracking-[0.28em] text-accent/70">Personal Chat</p>
        <h1 className="text-xl font-bold text-white">Loading dashboard…</h1>
        <p className="max-w-xs text-sm text-slate-500">
          Connecting to your WhatsApp assistant. This only takes a moment.
        </p>

        {/* Loading dots */}
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-accent/40 animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

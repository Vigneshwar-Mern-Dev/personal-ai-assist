export function PageIntro({ eyebrow, title, description, children }) {
  return (
    <div className="page-intro flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-accent/70">{eyebrow}</p>
        <h2 className="mt-1.5 text-xl font-bold text-white">{title}</h2>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}

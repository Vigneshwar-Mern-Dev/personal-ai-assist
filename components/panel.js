export function Panel({ title, description, children, action }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">{title}</p>
          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

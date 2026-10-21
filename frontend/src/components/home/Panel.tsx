/** White section box with a title row and divider, as in the reference layout. */
export function Panel({ title, id, actions, children, className = '', bodyClassName = '' }: { title: string; id: string; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <section aria-labelledby={id} className={`bg-paper shadow-[0_1px_6px_var(--color-panel-shadow)] ${className}`}>
      <div className="mx-5 flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-flour py-4">
        <h2 id={id} className="mr-auto font-sans text-lg font-bold uppercase tracking-wide text-charcoal">{title}</h2>
        {actions}
      </div>
      <div className={`p-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function ArrowButtons({ onPrev, onNext, label, prevDisabled, nextDisabled }: { onPrev: () => void; onNext: () => void; label: string; prevDisabled?: boolean; nextDisabled?: boolean }) {
  const cls = 'inline-flex size-8 items-center justify-center rounded-sm bg-flour text-cocoa hover:bg-crust disabled:opacity-40';
  return (
    <div className="flex gap-2">
      <button type="button" className={cls} onClick={onPrev} disabled={prevDisabled} aria-label={`Previous ${label}`}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 6-6 6 6 6" /></svg>
      </button>
      <button type="button" className={cls} onClick={onNext} disabled={nextDisabled} aria-label={`Next ${label}`}>
        <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 6 6 6-6 6" /></svg>
      </button>
    </div>
  );
}

import { Link } from 'react-router-dom';

/** Section holder shared by the homepage sections: H2 + optional "view all" link. */
export function HomeSection({ id, title, subtitle, to, linkLabel = 'عرض الكل', className = '', children }) {
  const headingId = `${id}-title`;
  return (
    <section aria-labelledby={headingId} className={`container mx-auto px-4 py-10 sm:py-12 ${className}`}>
      <div className="mb-5 sm:mb-6 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={headingId} className="font-display text-xl sm:text-2xl md:text-[1.65rem] font-bold text-ink-800 tracking-tight dark:text-white">
            {title}
          </h2>
          {subtitle ? <p className="mt-1 text-sm text-ink-500">{subtitle}</p> : null}
        </div>
        {to ? (
          <Link
            to={to}
            className="shrink-0 text-sm sm:text-base font-medium text-primary-600 underline underline-offset-4 decoration-primary-600/40 hover:decoration-primary-600 transition"
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** Mobile: swipeable row with a peek of the next card; md+: grid. Same pattern as the brands row. */
export const SCROLL_ROW =
  '-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 pt-0.5 snap-x snap-mandatory scroll-px-4 scrollbar-none';

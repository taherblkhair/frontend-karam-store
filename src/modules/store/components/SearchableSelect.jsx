import { forwardRef, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';

/** Loose Arabic matching: ignore diacritics/tatweel and unify common letter variants. */
export function normalizeArabic(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
}

/**
 * Dropdown with an instant search box on top.
 * options: [{ value, label, hint? }] — value is compared as string.
 *
 * variant="inline": the trigger is a link-style word inside a sentence, and the list opens under
 * the nearest positioned ancestor (give the surrounding row `relative`) so it spans that row.
 */
export const SearchableSelect = forwardRef(function SearchableSelect(
  {
    options = [],
    value,
    onChange,
    placeholder = 'اختر',
    searchPlaceholder = 'ابحث...',
    emptyText = 'لا توجد نتائج مطابقة للبحث',
    disabled = false,
    invalid = false,
    describedBy,
    variant = 'input',
    ariaLabel,
  },
  ref
) {
  const listId = useId();
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const dropRef = useRef(null);
  const inline = variant === 'inline';
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);

  const selected = options.find((o) => String(o.value) === String(value)) || null;

  const filtered = useMemo(() => {
    const q = normalizeArabic(query);
    if (!q) return options;
    return options.filter((o) => normalizeArabic(o.label).includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const idx = selected ? options.indexOf(selected) : 0;
    setHighlight(Math.max(0, idx));
    // preventScroll: on phones the page jump is handled by scrollIntoView below
    searchRef.current?.focus({ preventScroll: true });
    // inline: bring the whole list into view (it may open near the sticky bottom bars)
    (inline ? dropRef : rootRef).current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setHighlight(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [highlight, open]);

  const choose = (option) => {
    onChange?.(String(option.value));
    setOpen(false);
  };

  const onSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) choose(filtered[highlight]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={inline ? 'inline-block min-w-0' : 'relative'}>
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel ? `${ariaLabel}: ${selected ? selected.label : placeholder}` : undefined}
        className={
          inline
            ? 'inline-flex max-w-[11rem] items-center gap-1 rounded-md font-semibold text-primary-700 underline decoration-dotted decoration-1 underline-offset-4 hover:text-primary-800 disabled:cursor-wait disabled:opacity-60 dark:text-primary-300'
            : `input flex items-center justify-between gap-2 text-start disabled:opacity-60 disabled:cursor-not-allowed ${
                invalid ? '!border-red-400 ring-2 ring-red-200 dark:ring-red-900/40' : ''
              }`
        }
      >
        <span className={`truncate ${selected || inline ? '' : 'text-ink-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={inline ? 15 : 18}
          className={`shrink-0 text-ink-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          ref={dropRef}
          className="absolute inset-x-0 top-full z-30 mt-1.5 scroll-mb-40 scroll-mt-20 overflow-hidden rounded-xl border border-ink-100 bg-white text-start shadow-lg md:scroll-mb-6 dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="relative border-b border-ink-100 p-2 dark:border-gray-700">
            <Search
              size={16}
              className="pointer-events-none absolute start-5 top-1/2 -translate-y-1/2 text-ink-400"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              className="input !py-2 ps-9"
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-autocomplete="list"
              autoComplete="off"
            />
          </div>
          {filtered.length ? (
            <ul ref={listRef} id={listId} role="listbox" className="max-h-60 overflow-y-auto overscroll-contain py-1">
              {filtered.map((o, i) => {
                const isSelected = selected && String(o.value) === String(selected.value);
                return (
                  <li
                    key={o.value}
                    role="option"
                    aria-selected={isSelected}
                    onPointerEnter={() => setHighlight(i)}
                    onClick={() => choose(o)}
                    className={`flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-sm ${
                      i === highlight ? 'bg-primary-50 dark:bg-primary-900/30' : ''
                    } ${isSelected ? 'font-semibold text-primary-700 dark:text-primary-200' : 'text-ink-700 dark:text-gray-100'}`}
                  >
                    <span className="truncate">{o.label}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {o.hint && <span className="text-xs text-ink-400">{o.hint}</span>}
                      {isSelected && <Check size={16} className="text-primary-600" aria-hidden />}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-ink-500">{emptyText}</p>
          )}
        </div>
      )}
    </div>
  );
});

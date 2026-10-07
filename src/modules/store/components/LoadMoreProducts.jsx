import { useEffect, useMemo, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { storeApi } from '@modules/store/api/store.api';

export const PRODUCTS_BATCH_SIZE = 24;

/**
 * Store product list that grows in place: each batch is appended to the
 * previous ones (deduped by id, in case the catalog shifts between requests).
 */
export function useInfiniteProducts(
  queryKey,
  params,
  { enabled = true, limit = PRODUCTS_BATCH_SIZE, keepPrevious = false } = {}
) {
  const query = useInfiniteQuery({
    queryKey: [...queryKey, params, limit],
    queryFn: ({ pageParam }) => storeApi.products({ ...params, page: pageParam, limit }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const p = lastPage?.pagination;
      if (!p) return undefined;
      return Number(p.page) < Number(p.pages) ? Number(p.page) + 1 : undefined;
    },
    enabled,
    placeholderData: keepPrevious ? (prev) => prev : undefined,
  });

  const products = useMemo(() => {
    const seen = new Set();
    return (query.data?.pages || []).reduce((all, page) => {
      const fresh = (page?.data || []).filter((p) => !seen.has(p.id) && seen.add(p.id));
      return [...all, ...fresh];
    }, []);
  }, [query.data]);

  const total = query.data?.pages?.[0]?.pagination?.total ?? null;

  return { ...query, products, total };
}

/**
 * «مشاهدة المزيد» footer: button + automatic loading when the shopper
 * scrolls near the end of the grid.
 */
export function LoadMoreFooter({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  shown,
  total,
  autoLoad = true,
  batchSize = PRODUCTS_BATCH_SIZE,
  className = 'mt-10',
}) {
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!autoLoad || !el || !hasNextPage || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: '0px 0px 400px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoLoad, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!hasNextPage) {
    // A short single-batch result needs no "end of list" note.
    if (shown <= batchSize && !(total > batchSize)) return null;
    return (
      <p className={`${className} flex items-center justify-center gap-2 text-sm font-medium text-ink-400`} role="status">
        <CheckCircle2 size={16} className="text-primary-600" aria-hidden />
        تم عرض جميع المنتجات
      </p>
    );
  }

  const progress = total ? Math.min(100, Math.round((shown / total) * 100)) : null;

  return (
    <div ref={sentinelRef} className={`${className} flex flex-col items-center gap-3`}>
      {total != null && (
        <div className="w-full max-w-[14rem] text-center">
          <p className="text-xs text-ink-400">
            عرض <span className="font-bold tabular-nums text-ink-600">{shown}</span> من{' '}
            <span className="font-bold tabular-nums text-ink-600">{total}</span> منتج
          </p>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-tertiary-200 dark:bg-gray-700" aria-hidden>
            <div className="h-full rounded-full bg-primary-600 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => fetchNextPage()}
        disabled={isFetchingNextPage}
        aria-busy={isFetchingNextPage || undefined}
        className="inline-flex h-12 min-w-[13rem] items-center justify-center gap-2 rounded-full border-2 border-primary-600 bg-white px-6 text-sm font-bold text-primary-600 shadow-sm transition hover:bg-primary-600 hover:text-white active:scale-[0.98] disabled:cursor-wait disabled:hover:bg-white disabled:hover:text-primary-600 dark:bg-gray-800"
      >
        {isFetchingNextPage ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            جاري تحميل المزيد…
          </>
        ) : (
          <>
            مشاهدة المزيد
            <ChevronDown size={18} />
          </>
        )}
      </button>
    </div>
  );
}

/** Placeholder cards shown at the end of the grid while the next batch loads. */
export function ProductCardSkeletons({ count = 4 }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={`sk-${i}`} className="rounded-2xl border border-ink-100/80 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800" aria-hidden>
      <div className="aspect-[4/5] animate-pulse rounded-xl bg-tertiary-200 dark:bg-gray-700" />
      <div className="mt-2 flex justify-center gap-2.5">
        {[0, 1, 2].map((k) => (
          <div key={k} className="h-9 w-9 animate-pulse rounded-full bg-tertiary-100 dark:bg-gray-700" />
        ))}
      </div>
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-tertiary-200 dark:bg-gray-700" />
      <div className="mt-2 h-5 w-1/3 animate-pulse rounded bg-primary-100/60 dark:bg-gray-700" />
      <div className="mt-2.5 h-10 animate-pulse rounded-xl bg-tertiary-100 dark:bg-gray-700" />
    </div>
  ));
}

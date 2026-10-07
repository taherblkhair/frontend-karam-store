import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { salesApi } from '../api/sales.api';

export const POS_PAGE_SIZE = 12;

function nextPage(lastPage) {
  const p = lastPage?.pagination;
  if (!p) return undefined;
  return Number(p.page) < Number(p.pages) ? Number(p.page) + 1 : undefined;
}

/** Flattens the loaded pages (deduped by id) and exposes the server total. */
function usePagedList(query) {
  const products = useMemo(() => {
    const seen = new Set();
    return (query.data?.pages || []).flatMap((page) =>
      (page?.data || []).filter((p) => !seen.has(p.id) && seen.add(p.id))
    );
  }, [query.data]);
  const total = query.data?.pages?.at(-1)?.pagination?.total ?? null;
  return { ...query, products, total };
}

export function usePosReadyProducts() {
  return usePagedList(
    useInfiniteQuery({
      queryKey: ['pos-ready-products', POS_PAGE_SIZE],
      queryFn: ({ pageParam }) => salesApi.readyProducts({ page: pageParam, limit: POS_PAGE_SIZE }),
      initialPageParam: 1,
      getNextPageParam: nextPage,
    })
  );
}

export function usePosSearch(search) {
  const term = search.trim();
  return usePagedList(
    useInfiniteQuery({
      queryKey: ['pos-search', term, POS_PAGE_SIZE],
      queryFn: ({ pageParam }) => salesApi.searchProducts(term, { page: pageParam, limit: POS_PAGE_SIZE }),
      initialPageParam: 1,
      getNextPageParam: nextPage,
      enabled: term.length >= 2,
    })
  );
}

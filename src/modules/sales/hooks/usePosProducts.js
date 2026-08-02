import { useQuery } from '@tanstack/react-query';
import { salesApi } from '../api/sales.api';

export function usePosReadyProducts() {
  return useQuery({
    queryKey: ['pos-ready-products'],
    queryFn: () => salesApi.readyProducts(),
  });
}

export function usePosSearch(search) {
  const term = search.trim();
  return useQuery({
    queryKey: ['pos-search', term],
    queryFn: () => salesApi.searchProducts(term),
    enabled: term.length >= 2,
  });
}

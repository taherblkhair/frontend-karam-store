import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildListParams } from '../utils/listParams.js';

/**
 * Shared search + pagination state for admin list pages.
 * - Resets to page 1 when search changes
 * - Debounces search input (300ms)
 */
export function useListParams(initialSearch = '') {
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const params = useMemo(
    () => buildListParams({ page, search: debouncedSearch }),
    [page, debouncedSearch]
  );

  const withExtra = useCallback(
    (extra = {}) => buildListParams({ page, search: debouncedSearch, extra }),
    [page, debouncedSearch]
  );

  return {
    search,
    setSearch,
    page,
    setPage,
    params,
    withExtra,
    debouncedSearch,
  };
}

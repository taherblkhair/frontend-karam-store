/** Page size for normal list browsing */
export const LIST_PAGE_SIZE = 10;
/** Page size when searching */
export const SEARCH_PAGE_SIZE = 5;

/**
 * Build list query params: page + limit (10 default, 5 when searching).
 */
export function buildListParams({ page = 1, search = '', extra = {} } = {}) {
  const term = String(search || '').trim();
  return {
    page,
    limit: term ? SEARCH_PAGE_SIZE : LIST_PAGE_SIZE,
    ...(term ? { search: term } : {}),
    ...extra,
  };
}

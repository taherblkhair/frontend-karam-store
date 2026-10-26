/**
 * Responses started by the inline script in index.html before the bundle loaded.
 * Each one is handed out once (first page render); later calls go through axios.
 */
const store = (typeof window !== 'undefined' && window.__KARAM_EARLY_FETCH__) || {};

/**
 * @param {string} path API path relative to the API base, e.g. `/store/settings`
 * @param {() => Promise<any>} fallback normal axios request
 */
export function withEarlyFetch(path, fallback) {
  const pending = store[path];
  if (!pending) return fallback();
  delete store[path];
  return pending.then((body) =>
    body && typeof body === 'object' && body.success === true ? body : fallback()
  );
}

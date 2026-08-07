/**
 * API origin & base paths.
 *
 * Dev (recommended — no CORS issues):
 *   VITE_API_BASE_URL=          (empty)
 *   VITE_API_PROXY_TARGET=https://api.karamstore.ly
 *   → browser calls same-origin /api, Vite proxies to remote
 *
 * Production build:
 *   VITE_API_BASE_URL=https://api.karamstore.ly
 *   → browser calls the real API host
 */

function stripTrailingSlash(url = '') {
  return String(url).replace(/\/+$/, '');
}

/** e.g. https://api.karamstore.ly — empty when using Vite proxy */
export const API_ORIGIN = stripTrailingSlash(import.meta.env.VITE_API_BASE_URL || '');

/** Media origin for /uploads */
export const MEDIA_ORIGIN = stripTrailingSlash(
  import.meta.env.VITE_MEDIA_BASE_URL || import.meta.env.VITE_API_BASE_URL || ''
);

/** Axios base — absolute remote API or relative `/api` for proxy */
export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';

/**
 * Resolve media/upload paths returned by the API (e.g. `/uploads/images/x.jpg`).
 * @param {string} [url]
 * @returns {string}
 */
export function resolveMediaUrl(url) {
  if (!url) return '';
  const value = String(url).trim();
  if (!value) return '';
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  if (value.startsWith('//')) return `https:${value}`;

  const path = value.startsWith('/') ? value : `/${value}`;
  if (!MEDIA_ORIGIN) return path;
  return `${MEDIA_ORIGIN}${path}`;
}

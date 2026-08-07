/**
 * Clean storefront product URL paths (SEO-friendly slugs).
 * Example: /product/black-leather-bag
 */

export const PRODUCT_PATH_PREFIX = '/product';

/**
 * @param {{ slug?: string, id?: string|number } | string} productOrSlug
 * @returns {string} absolute path starting with /product/
 */
export function productPath(productOrSlug) {
  if (!productOrSlug) return '/products';
  if (typeof productOrSlug === 'string' || typeof productOrSlug === 'number') {
    const s = String(productOrSlug).trim();
    return s ? `${PRODUCT_PATH_PREFIX}/${s}` : '/products';
  }
  const slug = String(productOrSlug.slug || productOrSlug.id || '').trim();
  if (!slug) return '/products';
  return `${PRODUCT_PATH_PREFIX}/${slug}`;
}

/**
 * Full absolute URL for sharing / copy-link.
 * @param {{ slug?: string, id?: string|number } | string} productOrSlug
 */
export function productAbsoluteUrl(productOrSlug) {
  const path = productPath(productOrSlug);
  if (typeof window === 'undefined') return path;
  // Encode path segment(s) after /product/ for safe clipboard URLs
  try {
    const url = new URL(path, window.location.origin);
    return url.href;
  } catch {
    return `${window.location.origin}${path}`;
  }
}

/**
 * Decode slug from route param (handles URI-encoded Arabic).
 * @param {string} [param]
 */
export function decodeProductSlug(param = '') {
  try {
    return decodeURIComponent(String(param || '').trim());
  } catch {
    return String(param || '').trim();
  }
}

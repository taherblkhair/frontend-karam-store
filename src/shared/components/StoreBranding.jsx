import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@modules/store/api/store.api';
import { resolveMediaUrl } from '@core/api/config.js';

const DEFAULT_FAVICON = '/favicon-32x32.png';
const DEFAULT_TITLE = 'كرم للحقائب | Karam Bags';

function setLinkRel(rel, href, attrs = {}) {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"][data-brand-icon]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute('data-brand-icon', '1');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
}

/**
 * Syncs document title + favicon from admin store settings (`logo`, `store_name`).
 * Falls back to the packaged brand logo in /public.
 */
export function useStoreBranding() {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => storeApi.settings(),
    staleTime: 60_000,
  });

  const settings = data?.data || {};

  useEffect(() => {
    const name = String(settings.store_name || '').trim();
    document.title = name ? `${name} | Karam Bags` : DEFAULT_TITLE;

    const logo = resolveMediaUrl(settings.logo);
    const href = logo || DEFAULT_FAVICON;

    // Browsers cache favicons aggressively — bust cache when logo URL changes
    const cacheBust = logo ? `${href}${href.includes('?') ? '&' : '?'}v=${encodeURIComponent(logo)}` : href;

    setLinkRel('icon', cacheBust, { type: 'image/png' });
    setLinkRel('shortcut icon', cacheBust, { type: 'image/png' });
    setLinkRel('apple-touch-icon', cacheBust);
  }, [settings.store_name, settings.logo]);
}

/** Mount inside React tree (Providers) so react-query is available. */
export function StoreBranding() {
  useStoreBranding();
  return null;
}

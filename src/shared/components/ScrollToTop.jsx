import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function scrollWindowToTop() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/**
 * Reset window scroll on every route/search change.
 * Without this, SPA navigation keeps the previous page offset
 * (e.g. product detail sticky "order now" → checkout opens on order summary).
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    scrollWindowToTop();
    // Second pass after paint (images / sticky layout may reflow)
    const id = requestAnimationFrame(scrollWindowToTop);
    return () => cancelAnimationFrame(id);
  }, [pathname, search]);

  return null;
}

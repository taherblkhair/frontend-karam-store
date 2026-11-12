import { useEffect } from 'react';

let pageMetaOwners = 0;
/** True while a page has set its own title (StoreBranding then keeps its hands off). */
export const hasPageMeta = () => pageMetaOwners > 0;

function setMeta(selector, attr, value) {
  if (!value) return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    const [, key, name] = selector.match(/\[(\w+)="([^"]+)"\]/) || [];
    if (key) el.setAttribute(key, name);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/** Page <title> + meta description (+ og/twitter copies) for SPA pages. */
export function usePageMeta({ title, description }) {
  useEffect(() => {
    pageMetaOwners += 1;
    return () => {
      pageMetaOwners -= 1;
    };
  }, []);

  useEffect(() => {
    if (title) {
      document.title = title;
      setMeta('meta[property="og:title"]', 'content', title);
      setMeta('meta[name="twitter:title"]', 'content', title);
    }
    if (description) {
      setMeta('meta[name="description"]', 'content', description);
      setMeta('meta[property="og:description"]', 'content', description);
      setMeta('meta[name="twitter:description"]', 'content', description);
    }
  }, [title, description]);
}

export default usePageMeta;

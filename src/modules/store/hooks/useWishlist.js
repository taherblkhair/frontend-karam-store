import { useCallback, useEffect, useState } from 'react';

/** Favourites live in this browser only (localStorage), as product ids. */
export const WISHLIST_KEY = 'karam-wishlist-ids';
const WISHLIST_EVENT = 'karam-wishlist';

export function readWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? [...new Set(list.map(String))] : [];
  } catch {
    return [];
  }
}

export function writeWishlist(ids) {
  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids));
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new CustomEvent(WISHLIST_EVENT));
}

/** Shared by product cards, the header counter and the favourites page (kept in sync across tabs). */
export function useWishlist() {
  const [ids, setIds] = useState(() => (typeof window === 'undefined' ? [] : readWishlist()));

  useEffect(() => {
    const sync = () => setIds(readWishlist());
    window.addEventListener('storage', sync);
    window.addEventListener(WISHLIST_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(WISHLIST_EVENT, sync);
    };
  }, []);

  const isSaved = useCallback((id) => ids.includes(String(id)), [ids]);

  const toggle = useCallback((id) => {
    const key = String(id);
    const current = readWishlist();
    const next = current.includes(key) ? current.filter((x) => x !== key) : [...current, key];
    writeWishlist(next);
    setIds(next);
  }, []);

  const remove = useCallback((removeIds) => {
    const drop = new Set([].concat(removeIds).map(String));
    const next = readWishlist().filter((x) => !drop.has(x));
    writeWishlist(next);
    setIds(next);
  }, []);

  return { ids, count: ids.length, isSaved, toggle, remove };
}

import { useCallback, useEffect, useState } from 'react';

/** Products this browser opened, newest first (ids only, localStorage). */
const KEY = 'karam-recently-viewed';
const EVENT = 'karam-recently-viewed';
const MAX = 12;

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(list) ? list.map(String).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(id) {
  if (id == null) return;
  const key = String(id);
  const next = [key, ...read().filter((x) => x !== key)].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useRecentlyViewed() {
  const [ids, setIds] = useState(() => (typeof window === 'undefined' ? [] : read()));
  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setIds([]);
  }, []);
  return { ids, clear };
}

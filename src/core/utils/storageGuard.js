/**
 * Some in-app browsers / WebViews block or disable Web Storage; any access then throws
 * and blanks the whole app. Swap in an in-memory store so the session still works.
 */
function createMemoryStorage() {
  const data = new Map();
  return {
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => (data.has(String(k)) ? data.get(String(k)) : null),
    setItem: (k, v) => data.set(String(k), String(v)),
    removeItem: (k) => data.delete(String(k)),
    clear: () => data.clear(),
  };
}

function isUsable(name) {
  try {
    const storage = window[name];
    if (!storage) return false;
    const probe = '__karam_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

if (typeof window !== 'undefined') {
  for (const name of ['localStorage', 'sessionStorage']) {
    if (isUsable(name)) continue;
    try {
      Object.defineProperty(window, name, { value: createMemoryStorage(), configurable: true });
    } catch {
      // Non-configurable on this engine — app-level try/catch still guards reads.
    }
  }
}

/** JSON.parse for persisted values; corrupt data falls back instead of crashing. */
export function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

import { readJSON } from '@core/utils/storageGuard';
import { storeApi } from './store.api';

const CACHE_KEY = 'karam-store-settings';

/**
 * Shared `['settings']` query. The last response is kept in localStorage and used as
 * initial data (marked stale), so returning visitors skip the blocking settings round-trip
 * while it is revalidated in the background.
 */
export const storeSettingsQuery = {
  queryKey: ['settings'],
  queryFn: async () => {
    const res = await storeApi.settings();
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(res));
    } catch {
      /* storage full / blocked */
    }
    return res;
  },
  initialData: () => readJSON(CACHE_KEY, undefined),
  initialDataUpdatedAt: 0,
};

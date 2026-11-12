import { useMemo } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { storeApi } from '@modules/store/api/store.api';
import { StoreProductSection } from '@modules/store/components/StoreProductCard';
import { useRecentlyViewed } from '@modules/store/hooks/useRecentlyViewed';

/**
 * "شاهدته مؤخراً" from this browser's history. No history → no request and nothing rendered.
 * Products come from the store API (current prices, campaigns, stock); hidden ones drop out.
 */
export function RecentlyViewedSection({ excludeId, limit = 4, className = '' }) {
  const { ids } = useRecentlyViewed();
  const wanted = useMemo(
    () => ids.filter((id) => id !== String(excludeId ?? '')).slice(0, limit),
    [ids, excludeId, limit]
  );
  const { data } = useQuery({
    queryKey: ['recently-viewed', wanted.join(',')],
    queryFn: () => storeApi.products({ ids: wanted.join(','), limit }),
    enabled: wanted.length > 0,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
  const products = useMemo(() => {
    const byId = new Map((data?.data || []).map((p) => [String(p.id), p]));
    return wanted.map((id) => byId.get(id)).filter(Boolean);
  }, [data, wanted]);

  if (!wanted.length || !products.length) return null;
  return <StoreProductSection title="شاهدته مؤخراً" products={products} className={className} />;
}

export default RecentlyViewedSection;

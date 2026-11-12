import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Heart, Trash2 } from 'lucide-react';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner } from '@shared/ui';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { useConfirm } from '@shared/hooks/useConfirm';
import { storeApi } from '@modules/store/api/store.api';
import { storeSettingsQuery } from '@modules/store/api/storeSettings.query';
import { StoreProductCard } from '@modules/store/components/StoreProductCard';
import { useWishlist } from '@modules/store/hooks/useWishlist';
import { brandFromSettings } from '@modules/store/utils/brand';

const MAX_IDS = 60;

/**
 * Favourites saved in this browser (localStorage ids). Products are re-read from the store API,
 * so prices / campaigns / stock are always current; ids that no longer come back (deleted or
 * hidden products) are listed so the visitor can clear them.
 */
export default function WishlistPage() {
  const { ids, remove } = useWishlist();
  const confirm = useConfirm();
  const { data: settingsData } = useQuery({ ...storeSettingsQuery, staleTime: 60_000 });
  const brand = brandFromSettings(settingsData?.data || {});
  usePageMeta({ title: `المفضلة | ${brand.full}` });

  const wanted = useMemo(() => ids.slice(-MAX_IDS), [ids]);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['wishlist-products', wanted.join(',')],
    queryFn: () => storeApi.products({ ids: wanted.join(','), limit: MAX_IDS }),
    enabled: wanted.length > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  // Keep the order the visitor saved them in (newest first); only ids still saved
  const products = useMemo(() => {
    const byId = new Map((data?.data || []).map((p) => [String(p.id), p]));
    return [...wanted].reverse().map((id) => byId.get(id)).filter(Boolean);
  }, [data, wanted]);
  const missing = data && !isError ? wanted.filter((id) => !(data.data || []).some((p) => String(p.id) === id)) : [];
  const unavailableCount = products.filter((p) => p.total_stock != null && Number(p.total_stock) <= 0).length;

  const clearAll = async () => {
    const ok = await confirm({ title: 'إفراغ المفضلة', message: 'إزالة كل المنتجات من المفضلة؟', confirmText: 'إزالة الكل', variant: 'danger' });
    if (ok) remove(ids);
  };

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8 sm:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-800 dark:text-white">المفضلة</h1>
            <p className="mt-1 text-sm text-ink-500">
              {ids.length ? `${ids.length} منتج محفوظ في هذا المتصفح` : 'المنتجات التي تحفظها تظهر هنا'}
            </p>
          </div>
          {ids.length ? (
            <button type="button" onClick={clearAll} className="btn-outline text-sm rounded-full">
              <Trash2 size={16} aria-hidden /> إفراغ المفضلة
            </button>
          ) : null}
        </div>

        {!ids.length ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30">
              <Heart size={34} aria-hidden />
            </span>
            <p className="text-lg font-bold text-ink-800 dark:text-white">لا توجد منتجات في المفضلة بعد</p>
            <p className="mt-2 max-w-sm text-ink-500">اضغط على رمز القلب في أي منتج لحفظه والرجوع إليه لاحقاً.</p>
            <Link to="/products" className="btn-primary rounded-full mt-6 px-7">تصفّح المنتجات</Link>
          </div>
        ) : isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <div className="py-16 text-center">
            <p className="text-ink-600 mb-4">تعذر تحميل المفضلة</p>
            <button type="button" className="btn-primary rounded-full" onClick={() => refetch()}>إعادة المحاولة</button>
          </div>
        ) : (
          <>
            {missing.length ? (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-yellow-50 p-4 text-sm dark:bg-yellow-900/20">
                <p>{missing.length === 1 ? 'منتج واحد' : `${missing.length} منتجات`} من المفضلة لم يعد متاحاً في المتجر.</p>
                <button type="button" onClick={() => remove(missing)} className="font-semibold text-primary-700 underline underline-offset-4 dark:text-primary-300">
                  إزالتها من المفضلة
                </button>
              </div>
            ) : null}
            {unavailableCount ? (
              <p className="mb-4 text-sm text-ink-500">
                {unavailableCount === 1 ? 'منتج واحد غير متوفر حالياً' : `${unavailableCount} منتجات غير متوفرة حالياً`} — يبقى في المفضلة حتى يعود.
              </p>
            ) : null}
            {products.length ? (
              <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8">
                {products.map((p) => (
                  <li key={p.id} className="flex flex-col">
                    <StoreProductCard product={p} className="flex-1" />
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      className="mt-2 inline-flex items-center justify-center gap-1.5 self-center rounded-full px-3 py-1.5 text-sm text-ink-500 hover:bg-tertiary-200 hover:text-red-600 dark:hover:bg-gray-800"
                      aria-label={`إزالة «${p.name_ar}» من المفضلة`}
                    >
                      <Trash2 size={15} aria-hidden /> إزالة
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>
    </StoreLayout>
  );
}

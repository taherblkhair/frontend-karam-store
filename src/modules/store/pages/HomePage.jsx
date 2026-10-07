import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner } from '@shared/ui';
import { CategoryCard } from '@modules/store/components/CategoryCard';
import { BannerCarousel } from '@modules/store/components/BannerCarousel';
import { StoreProductSection } from '@modules/store/components/StoreProductCard';
import { BrandShowcaseCard, useStoreBrands } from '@modules/store/components/BrandTile';
import { Search } from 'lucide-react';

const HOME_BRANDS_LIMIT = 10;

function BrandsSection() {
  const { data: brands = [] } = useStoreBrands();
  if (!brands.length) return null;
  const visible = brands.slice(0, HOME_BRANDS_LIMIT);

  return (
    <section className="container mx-auto px-4 pb-6 sm:pb-8">
      <div className="mb-4 sm:mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl sm:text-2xl md:text-[1.65rem] font-bold text-ink-800 tracking-tight">
          البراندات
        </h2>
        <div className="flex shrink-0 items-center gap-4">
          <Link
            to="/brands"
            className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-primary-600/20 bg-primary-50/70 px-3.5 py-1.5 text-sm font-medium text-primary-700 transition hover:border-primary-600/50 dark:bg-primary-900/20 dark:text-primary-200"
          >
            <Search size={15} aria-hidden /> ابحث عن براند
          </Link>
          <Link
            to="/brands"
            className="text-sm sm:text-base font-medium text-primary-600 underline underline-offset-4 decoration-primary-600/40 hover:decoration-primary-600 transition"
          >
            عرض الكل
          </Link>
        </div>
      </div>
      {/* Mobile: ~2 cards in view with a peek of the next; md+: grid */}
      <div className="-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-3 pt-0.5 snap-x snap-mandatory scroll-px-4 scrollbar-none md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 md:pb-0">
        {visible.map((brand) => (
          <BrandShowcaseCard key={brand.id} brand={brand} className="w-[45%] shrink-0 snap-start sm:w-[30%] md:w-auto" />
        ))}
        <Link
          to="/brands"
          aria-label="ابحث عن براند"
          className="flex w-24 shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-primary-600/30 bg-primary-50/50 px-2 text-center text-primary-700 transition hover:border-primary-600/60 hover:bg-primary-50 md:hidden dark:bg-primary-900/20 dark:text-primary-200"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
            <Search size={18} aria-hidden />
          </span>
          <span className="text-xs font-semibold leading-snug">ابحث عن براند</span>
        </Link>
      </div>
    </section>
  );
}

function CategoriesSection({ categories }) {
  if (!categories?.length) return null;
  return (
    <section className="container mx-auto px-4 py-10 sm:py-12">
      <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl sm:text-2xl md:text-[1.65rem] font-bold text-ink-800 tracking-tight">
          التصنيفات
        </h2>
        <Link
          to="/products"
          className="shrink-0 text-sm sm:text-base font-medium text-primary-600 underline underline-offset-4 decoration-primary-600/40 hover:decoration-primary-600 transition"
        >
          عرض الكل
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {categories.map((cat) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['store-home'],
    queryFn: () => storeApi.home(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const home = data?.data;

  return (
    <StoreLayout>
      <BannerCarousel banners={home?.banners || []} />

      {isLoading && !home ? (
        <LoadingSpinner />
      ) : isError && !home ? (
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-ink-600 mb-4">تعذر تحميل الصفحة الرئيسية</p>
          <p className="text-sm text-ink-400 mb-6">{error?.message || ''}</p>
          <button type="button" className="btn-primary rounded-full" onClick={() => refetch()}>
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          {isFetching && home ? (
            <div className="h-0.5 w-full bg-primary-100 overflow-hidden" aria-hidden>
              <div className="h-full w-1/3 bg-primary-600/40 animate-pulse" />
            </div>
          ) : null}

          <CategoriesSection categories={home?.categories} />

          <BrandsSection />

          <StoreProductSection
            title="عروض مميزة"
            to="/products?featured=true"
            products={home?.featuredProducts || []}
            badge="مميز"
            showVariantImages
            priorityFirst
          />

          <StoreProductSection
            title="وصل حديثاً"
            to="/products?is_new=true"
            products={home?.newProducts || []}
            showNewBadge
            showVariantImages
          />

          <StoreProductSection
            title="الأكثر مبيعاً"
            to="/products"
            products={home?.topSelling || []}
            badge="رائج"
            showVariantImages
          />
        </>
      )}
    </StoreLayout>
  );
}
// import { useQuery } from '@tanstack/react-query';
// import { storeApi } from '@modules/store/api/store.api';
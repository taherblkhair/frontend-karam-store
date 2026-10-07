import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner } from '@shared/ui';
import { CategoryCard } from '@modules/store/components/CategoryCard';
import { BannerCarousel } from '@modules/store/components/BannerCarousel';
import { StoreProductSection } from '@modules/store/components/StoreProductCard';
import { BrandTile, useStoreBrands } from '@modules/store/components/BrandTile';
import { Search } from 'lucide-react';

const HOME_BRANDS_LIMIT = 11;

function BrandsSection() {
  const { data: brands = [] } = useStoreBrands();
  if (!brands.length) return null;
  const visible = brands.slice(0, HOME_BRANDS_LIMIT);

  return (
    <section className="container mx-auto px-4 pb-4 sm:pb-6">
      <div className="mb-4 sm:mb-5 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl sm:text-2xl md:text-[1.65rem] font-bold text-ink-800 tracking-tight">
          البراندات
        </h2>
        <Link
          to="/brands"
          className="shrink-0 text-sm sm:text-base font-medium text-primary-600 underline underline-offset-4 decoration-primary-600/40 hover:decoration-primary-600 transition"
        >
          عرض الكل ({brands.length})
        </Link>
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto overscroll-x-contain px-4 pb-2 snap-x scrollbar-none md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0">
        <Link
          to="/brands"
          className="card flex min-h-[5.5rem] w-28 shrink-0 snap-start flex-col items-center justify-center gap-1.5 border-dashed border-primary-600/30 bg-primary-50/60 px-3 text-center text-primary-700 transition hover:border-primary-600/60 md:w-auto dark:bg-primary-900/20 dark:text-primary-200"
        >
          <Search size={20} aria-hidden />
          <span className="text-sm font-semibold">ابحث عن براند</span>
        </Link>
        {visible.map((brand) => (
          <BrandTile key={brand.id} brand={brand} className="w-32 shrink-0 snap-start md:w-auto" />
        ))}
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
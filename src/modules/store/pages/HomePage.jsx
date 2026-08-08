import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner } from '@shared/ui';
import { CategoryCard } from '@modules/store/components/CategoryCard';
import { BannerCarousel } from '@modules/store/components/BannerCarousel';
import { StoreProductSection } from '@modules/store/components/StoreProductCard';

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
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['store-home'],
    queryFn: () => storeApi.home(),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const home = data?.data;

  return (
    <StoreLayout>
      <BannerCarousel banners={home?.banners || []} />

      {isLoading && !home ? (
        <LoadingSpinner />
      ) : (
        <>
          {isFetching && home ? (
            <div className="h-0.5 w-full bg-primary-100 overflow-hidden" aria-hidden>
              <div className="h-full w-1/3 bg-primary-600/40 animate-pulse" />
            </div>
          ) : null}

          <CategoriesSection categories={home?.categories} />

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

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { ProductCard, LoadingSpinner } from '@shared/ui';
import { CategoryCard } from '@modules/store/components/CategoryCard';
import { BannerCarousel } from '@modules/store/components/BannerCarousel';

export default function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['store-home'],
    queryFn: () => storeApi.home(),
  });

  const home = data?.data;

  return (
    <StoreLayout>
      {/* Full-width responsive banner carousel */}
      <BannerCarousel banners={home?.banners || []} />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {home?.categories?.length > 0 && (
            <section className="container mx-auto px-4 py-10 sm:py-12">
              <h2 className="text-xl sm:text-2xl font-bold mb-5 sm:mb-6">التصنيفات</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {home.categories.map((cat) => (
                  <CategoryCard key={cat.id} category={cat} />
                ))}
              </div>
            </section>
          )}

          {home?.newProducts?.length > 0 && (
            <section className="container mx-auto px-4 py-10 sm:py-12">
              <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">وصل حديثاً</h2>
                <Link to="/products?is_new=true" className="text-primary-600 hover:underline text-sm sm:text-base shrink-0">
                  عرض الكل
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {home.newProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {home?.topSelling?.length > 0 && (
            <section className="container mx-auto px-4 py-10 sm:py-12">
              <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold">الأكثر مبيعاً</h2>
                <Link to="/products" className="text-primary-600 hover:underline text-sm sm:text-base shrink-0">
                  عرض الكل
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {home.topSelling.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {home?.featuredProducts?.length > 0 && (
            <section className="container mx-auto px-4 py-10 sm:py-12">
              <div className="rounded-2xl bg-primary-50 dark:bg-primary-900/20 p-4 sm:p-6 md:p-8">
                <h2 className="text-xl sm:text-2xl font-bold mb-5 sm:mb-6">عروض مميزة</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                  {home.featuredProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </StoreLayout>
  );
}

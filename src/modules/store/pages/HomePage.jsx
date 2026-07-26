import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { ProductCard, LoadingSpinner } from '@shared/ui';

export default function HomePage() {
  const { data, isLoading } = useQuery({
    queryKey: ['store-home'],
    queryFn: () => storeApi.home(),
  });

  const home = data?.data;

  return (
    <StoreLayout>
      {/* Hero Banners */}
      <section className="relative">
        {home?.banners?.length > 0 ? (
          <div className="relative h-64 md:h-96 bg-gradient-to-l from-primary-600 to-primary-800 overflow-hidden">
            <div className="absolute inset-0 flex items-center">
              <div className="container mx-auto px-4 text-white">
                <h1 className="text-3xl md:text-5xl font-bold mb-4">{home.banners[0].title_ar}</h1>
                <p className="text-lg md:text-xl opacity-90 mb-6">{home.banners[0].subtitle_ar}</p>
                <Link to="/products" className="btn bg-white text-primary-700 hover:bg-gray-100">
                  تسوق الآن
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 md:h-96 bg-gradient-to-l from-primary-600 to-primary-800 flex items-center">
            <div className="container mx-auto px-4 text-white">
              <h1 className="text-3xl md:text-5xl font-bold mb-4">مرحباً بكم في متجر كرم</h1>
              <p className="text-lg opacity-90 mb-6">أفضل المنتجات بأسعار منافسة - الدفع عند الاستلام</p>
              <Link to="/products" className="btn bg-white text-primary-700">تسوق الآن</Link>
            </div>
          </div>
        )}
      </section>

      {isLoading ? <LoadingSpinner /> : (
        <>
          {/* Categories */}
          {home?.categories?.length > 0 && (
            <section className="container mx-auto px-4 py-12">
              <h2 className="text-2xl font-bold mb-6">التصنيفات</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {home.categories.map((cat) => (
                  <Link key={cat.id} to={`/products?category=${cat.id}`} className="card p-6 text-center hover:shadow-md transition">
                    <div className="w-16 h-16 mx-auto mb-3 bg-primary-50 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-2xl">
                      📦
                    </div>
                    <h3 className="font-medium">{cat.name_ar}</h3>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* New Products */}
          {home?.newProducts?.length > 0 && (
            <section className="container mx-auto px-4 py-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">وصل حديثاً</h2>
                <Link to="/products?is_new=true" className="text-primary-600 hover:underline">عرض الكل</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {home.newProducts.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}

          {/* Top Selling */}
          {home?.topSelling?.length > 0 && (
            <section className="container mx-auto px-4 py-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">الأكثر مبيعاً</h2>
                <Link to="/products" className="text-primary-600 hover:underline">عرض الكل</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                {home.topSelling.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}

          {/* Featured */}
          {home?.featuredProducts?.length > 0 && (
            <section className="container mx-auto px-4 py-12 bg-primary-50 dark:bg-primary-900/20 rounded-2xl mb-12">
              <h2 className="text-2xl font-bold mb-6 px-4">عروض مميزة</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 px-4">
                {home.featuredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}
        </>
      )}
    </StoreLayout>
  );
}

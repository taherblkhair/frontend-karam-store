import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, PackageCheck, Truck } from 'lucide-react';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner } from '@shared/ui';
import { CategoryCard } from '@modules/store/components/CategoryCard';
import { BannerCarousel } from '@modules/store/components/BannerCarousel';
import { StoreProductSection } from '@modules/store/components/StoreProductCard';

function CategoriesSection({ categories }) {
  if (!categories?.length) return null;
  return (
    <section className="container mx-auto px-4 py-12 sm:py-16">
      <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="store-section-kicker">اختاري أسلوبك</p>
          <h2 className="store-section-title">تسوّقي حسب التصنيف</h2>
        </div>
        <Link
          to="/products"
          className="store-link shrink-0"
        >
          عرض الكل <ArrowLeft size={16} />
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

function TrustStrip() {
  const items = [
    { icon: Truck, title: 'توصيل لكل ليبيا', text: 'نوصل طلبك لباب البيت' },
    { icon: BadgeCheck, title: 'معاينة قبل الاستلام', text: 'تأكدي من اختيارك براحتك' },
    { icon: PackageCheck, title: 'تغليف مرتب', text: 'كل طلب يوصلك بعناية' },
  ];

  return (
    <section className="container mx-auto -mt-1 px-4 pt-6 sm:pt-8">
      <div className="grid gap-3 rounded-3xl border border-[#eee5df] bg-white p-4 shadow-soft sm:grid-cols-3 sm:p-5">
        {items.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3 rounded-2xl bg-blush-50/60 p-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-primary-700 shadow-sm">
              <Icon size={20} strokeWidth={1.8} />
            </span>
            <div>
              <p className="text-sm font-bold text-ink-800">{title}</p>
              <p className="mt-0.5 text-xs text-ink-400">{text}</p>
            </div>
          </div>
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
      <TrustStrip />

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

          <StoreProductSection
            title="عروض مميزة"
            kicker="مختارات كرم"
            to="/products?featured=true"
            products={home?.featuredProducts || []}
            badge="مميز"
            showVariantImages
            priorityFirst
          />

          <StoreProductSection
            title="وصل حديثاً"
            kicker="جديدنا"
            to="/products?is_new=true"
            products={home?.newProducts || []}
            showNewBadge
            showVariantImages
          />

          <StoreProductSection
            title="الأكثر مبيعاً"
            kicker="اختيارات عميلاتنا"
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

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { storeApi } from '@modules/store/api/store.api';
import { storeSettingsQuery } from '@modules/store/api/storeSettings.query';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner } from '@shared/ui';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { CategoryCard } from '@modules/store/components/CategoryCard';
import { BannerCarousel } from '@modules/store/components/BannerCarousel';
import { StoreProductSection } from '@modules/store/components/StoreProductCard';
import { BrandShowcaseCard, useStoreBrands } from '@modules/store/components/BrandTile';
import { HomeHero, HomeIntro } from '@modules/store/components/home/HomeHero';
import { HomeSection, SCROLL_ROW } from '@modules/store/components/home/HomeSection';
import { HomeCampaigns } from '@modules/store/components/home/HomeCampaigns';
import { PromoBanner } from '@modules/store/components/home/PromoBanner';
import { WhyKaramSection } from '@modules/store/components/home/WhyKaramSection';
import { SocialSection } from '@modules/store/components/home/SocialSection';
import { brandFromSettings } from '@modules/store/utils/brand';
import { RecentlyViewedSection } from '@modules/store/components/RecentlyViewedSection';

const HOME_BRANDS_LIMIT = 10;

function BrandsSection() {
  const { data: brands = [] } = useStoreBrands();
  if (!brands.length) return null;
  const visible = brands.slice(0, HOME_BRANDS_LIMIT);

  return (
    <HomeSection id="home-brands" title="البراندات" to="/brands" className="!pt-4">
      <div className={`${SCROLL_ROW} md:mx-0 md:grid md:grid-cols-5 md:gap-4 md:overflow-visible md:px-0 md:pb-0`}>
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
    </HomeSection>
  );
}

/** Tablet 4 / desktop 6 per row: only full rows are shown there (the rest via «عرض الكل»); phones scroll all. */
const fullRows = (count, cols) => (count <= cols ? count : Math.floor(count / cols) * cols);

function CategoriesSection({ categories }) {
  if (!categories?.length) return null;
  const tablet = fullRows(categories.length, 4);
  const desktop = fullRows(categories.length, 6);
  return (
    <HomeSection id="home-categories" title="تسوّق حسب التصنيف" to="/products">
      <div className={`${SCROLL_ROW} sm:mx-0 sm:grid sm:grid-cols-4 lg:grid-cols-6 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0`}>
        {categories.map((cat, i) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            className={`w-[38%] shrink-0 snap-start sm:w-auto ${i >= tablet ? 'sm:max-lg:hidden' : ''} ${i >= desktop ? 'lg:hidden' : ''}`}
          />
        ))}
      </div>
    </HomeSection>
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
  // Same cached ['settings'] query as the layout — no extra request
  const { data: settingsData } = useQuery({ ...storeSettingsQuery, staleTime: 60_000 });
  const settings = settingsData?.data || {};
  const brand = brandFromSettings(settings);

  usePageMeta({
    title: `${brand.full} — ${brand.tagline}`,
    description: String(settings.meta_description || '').trim() || undefined,
  });

  const home = data?.data;
  const banners = home?.banners || [];
  const campaigns = home?.campaigns || [];
  const firstHasTitle = Boolean(banners[0]?.title_ar);

  return (
    <StoreLayout>
      {isLoading && !home ? (
        <>
          <h1 className="sr-only">{brand.full}</h1>
          <div className="aspect-[5/4] sm:aspect-[16/7] lg:aspect-[21/8] w-full animate-pulse bg-tertiary-200 dark:bg-gray-800" aria-hidden />
          <LoadingSpinner />
        </>
      ) : isError && !home ? (
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-3">{brand.ar}</h1>
          <p className="text-ink-600 mb-4">تعذر تحميل الصفحة الرئيسية</p>
          <p className="text-sm text-ink-400 mb-6">{error?.message || ''}</p>
          <button type="button" className="btn-primary rounded-full" onClick={() => refetch()}>
            إعادة المحاولة
          </button>
        </div>
      ) : (
        <>
          {/* One H1: first banner title → or a visible intro under an image-only banner → or the hero */}
          <BannerCarousel
            banners={banners}
            firstTitleAsH1={firstHasTitle}
            fallback={<HomeHero campaign={campaigns.find((c) => c.banner_image)} brand={brand} />}
          />
          {banners.length > 0 && !firstHasTitle ? <HomeIntro brand={brand} /> : null}

          {isFetching && home ? (
            <div className="h-0.5 w-full bg-primary-100 overflow-hidden" aria-hidden>
              <div className="h-full w-1/3 bg-primary-600/40 animate-pulse" />
            </div>
          ) : null}

          <CategoriesSection categories={home?.categories} />

          <HomeCampaigns campaigns={campaigns} serverTime={home?.server_time} />

          <StoreProductSection
            title="الأكثر مبيعاً"
            to="/products"
            products={home?.topSelling || []}
            showVariantImages
            priorityFirst={!banners.length && !campaigns.length}
          />

          <PromoBanner banners={home?.promoBanners || []} />

          <StoreProductSection
            title="وصل حديثاً"
            to="/products?is_new=true"
            products={home?.newProducts || []}
            showNewBadge
            showVariantImages
          />

          <StoreProductSection
            title="اخترنا لك"
            to="/products?featured=true"
            products={home?.featuredProducts || []}
            showVariantImages
          />

          <RecentlyViewedSection />

          <BrandsSection />

          <WhyKaramSection brand={brand} settings={settings} />

          <SocialSection brand={brand} settings={settings} />
        </>
      )}
    </StoreLayout>
  );
}

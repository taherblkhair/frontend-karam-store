import { useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, TimerOff } from 'lucide-react';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner, EmptyState } from '@shared/ui';
import { buildResponsiveMedia } from '@core/api/config.js';
import { StoreProductCard } from '@modules/store/components/StoreProductCard';
import NotFoundPage from '@modules/store/pages/NotFoundPage';
import { storeCampaignsApi } from '@modules/campaigns/api/campaigns.api';
import { CampaignCountdown } from '@modules/campaigns/components/CampaignCountdown';
import { formatDateTime } from '@modules/campaigns/utils/campaign';
import { parseApiError } from '@shared/utils/apiMessage.js';

function decodeSlug(raw) {
  try {
    return decodeURIComponent(raw || '');
  } catch {
    return raw || '';
  }
}

export const campaignQuery = (slug, preview = false) => ({
  queryKey: ['store-campaign', slug, preview],
  queryFn: () => storeCampaignsApi.bySlug(slug, { preview }),
  staleTime: 30_000,
  retry: false,
});

/**
 * Public campaign landing page: /campaigns/:slug (also reachable as /:slug).
 * Prices shown are the exact prices the cart and the order will use.
 */
export default function CampaignPage({ slug: slugProp }) {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const slug = decodeSlug(slugProp || params.slug);
  const preview = searchParams.get('preview') === '1';
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery(campaignQuery(slug, preview));

  const onExpire = useCallback(() => queryClient.invalidateQueries(), [queryClient]);

  if (isLoading) {
    return (
      <StoreLayout>
        <LoadingSpinner />
      </StoreLayout>
    );
  }

  if (error) {
    const { code } = parseApiError(error);
    if (code === 'CAMPAIGN_ENDED') {
      return (
        <StoreLayout>
          <div className="container mx-auto px-4 py-16 md:py-24 flex flex-col items-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary-900/30">
              <TimerOff size={36} strokeWidth={1.75} />
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-ink-800 dark:text-white mb-3">
              انتهت هذه الحملة
            </h1>
            <p className="max-w-md text-ink-500 dark:text-gray-400 mb-8">
              شكراً لاهتمامك — انتهت فترة التخفيض وعادت المنتجات إلى أسعارها المعتادة.
            </p>
            <Link to="/products" className="btn-primary rounded-full min-w-[10rem]">
              تصفح المنتجات
            </Link>
          </div>
        </StoreLayout>
      );
    }
    return <NotFoundPage />;
  }

  const campaign = data?.data?.campaign;
  const products = data?.data?.products || [];
  const serverTime = data?.data?.server_time;
  if (!campaign) return <NotFoundPage />;

  const isLive = campaign.status === 'active';
  const banner = buildResponsiveMedia(campaign.banner_image, { widths: [800, 1200] });

  return (
    <StoreLayout>
      {preview && !isLive ? (
        <div className="bg-amber-100 text-amber-900 text-center text-sm py-2 px-4 dark:bg-amber-900/40 dark:text-amber-100">
          معاينة للإدارة فقط — الحملة غير ظاهرة للزوار حالياً
        </div>
      ) : null}

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-800 text-white">
        {banner.src ? (
          // Full-width hero: same responsive pattern as the home BannerCarousel
          // (800 / 1200 / full-size master), positioned behind the text.
          <img
            src={banner.src}
            srcSet={banner.srcSet || undefined}
            sizes="100vw"
            alt={campaign.name_ar}
            className="absolute inset-0 h-full w-full object-cover object-center"
            loading="eager"
            decoding="async"
            fetchPriority="high"
            draggable={false}
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" aria-hidden />
        <div className="relative container mx-auto px-4 py-12 sm:py-16 md:py-20 flex flex-col items-center text-center">
          {campaign.max_discount_percent > 0 ? (
            <span className="mb-3 rounded-full bg-secondary-400 px-3 py-1 text-xs sm:text-sm font-bold text-ink-800">
              تخفيضات تصل إلى {campaign.max_discount_percent}%
            </span>
          ) : null}
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-white drop-shadow">
            {campaign.name_ar}
          </h1>
          {campaign.name_en ? (
            <p className="mt-1 text-sm sm:text-base font-semibold tracking-widest uppercase text-secondary-400" dir="ltr">
              {campaign.name_en}
            </p>
          ) : null}
          {campaign.description ? (
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-white/85 leading-relaxed whitespace-pre-line">
              {campaign.description}
            </p>
          ) : null}

          {isLive ? (
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-sm font-medium text-white/80">ينتهي العرض خلال</p>
              <CampaignCountdown variant="hero" endsAt={campaign.ends_at} serverTime={serverTime} onExpire={onExpire} />
            </div>
          ) : null}
          <p className="mt-4 inline-flex items-center gap-1.5 text-xs sm:text-sm text-white/75">
            <CalendarClock size={16} aria-hidden />
            ينتهي التخفيض في {formatDateTime(campaign.ends_at)}
          </p>
        </div>
      </section>

      {/* Products */}
      <section className="container mx-auto px-4 py-8 sm:py-10">
        <div className="mb-5 sm:mb-6 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-ink-800 tracking-tight dark:text-white">
            منتجات الحملة
          </h2>
          <span className="text-sm text-ink-500">{products.length} منتج</span>
        </div>

        {products.length === 0 ? (
          <EmptyState message="لا توجد منتجات في هذه الحملة حالياً" />
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-4 sm:gap-y-8">
            {products.map((p, i) => (
              <StoreProductCard key={p.id} product={p} priority={i < 2} />
            ))}
          </div>
        )}
      </section>
    </StoreLayout>
  );
}

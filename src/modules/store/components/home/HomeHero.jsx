import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import { buildResponsiveMedia } from '@core/api/config.js';
import { campaignPath } from '@modules/campaigns/utils/campaign';
import { formatCampaignEnd } from '@modules/store/utils/campaignDisplay';

/**
 * Hero when no banner is published: the strongest live campaign (with its image), otherwise the
 * brand itself from settings. Always carries the page's single H1.
 */
export function HomeHero({ campaign, brand }) {
  if (campaign?.banner_image) {
    const media = buildResponsiveMedia(campaign.banner_image, { widths: [800, 1200] });
    const ends = formatCampaignEnd(campaign.ends_at);
    return (
      <section className="relative w-full overflow-hidden bg-primary-900" aria-label="حملة العروض">
        <div className="relative aspect-[5/4] sm:aspect-[16/7] lg:aspect-[21/8]">
          <img
            src={media.src}
            srcSet={media.srcSet || undefined}
            sizes="100vw"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent sm:bg-gradient-to-l sm:from-black/70 sm:via-black/30" />
          <div className="relative z-10 h-full flex items-end sm:items-center pb-10 sm:pb-0">
            <div className="container mx-auto px-4 text-white">
              <div className="max-w-2xl space-y-3 sm:space-y-4">
                {campaign.max_discount_percent ? (
                  <span className="inline-flex rounded-full bg-secondary-400 px-3 py-1 text-sm font-bold text-primary-900">
                    خصم حتى {campaign.max_discount_percent}%
                  </span>
                ) : null}
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight text-white drop-shadow-md">{campaign.name_ar}</h1>
                {campaign.description ? (
                  <p className="text-sm sm:text-lg text-white/90 line-clamp-2 max-w-xl">{campaign.description}</p>
                ) : null}
                {ends ? (
                  <p className="inline-flex items-center gap-1.5 text-sm text-white/80">
                    <CalendarClock size={16} aria-hidden /> ينتهي العرض {ends}
                  </p>
                ) : null}
                <div>
                  <Link to={campaignPath(campaign)} className="btn bg-white text-primary-700 hover:bg-tertiary-100 rounded-full px-6">
                    مشاهدة العرض <ArrowLeft size={18} aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-bl from-primary-50 via-tertiary-50 to-tertiary-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-14 sm:py-20 lg:py-24">
        <div className="max-w-2xl space-y-5">
          <p className="text-xs sm:text-sm font-semibold tracking-[0.25em] text-primary-600 uppercase" dir="ltr">{brand.en}</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-ink-800 dark:text-white">
            {brand.ar}
          </h1>
          <p className="text-base sm:text-lg text-ink-600 dark:text-gray-300 max-w-xl leading-relaxed">{brand.tagline}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/products" className="btn-primary rounded-full px-7">تسوق الآن</Link>
            <Link to="/products?is_new=true" className="btn-outline rounded-full px-7">وصل حديثاً</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Visible H1 under an image-only banner (no title) — the page still has exactly one H1. */
export function HomeIntro({ brand }) {
  return (
    <div className="container mx-auto px-4 pt-8 sm:pt-10">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-800 dark:text-white">
        {brand.ar} <span className="text-ink-400 font-medium text-lg sm:text-xl" dir="ltr">{brand.en}</span>
      </h1>
      <p className="mt-1 text-sm sm:text-base text-ink-500">{brand.tagline}</p>
    </div>
  );
}

export default HomeHero;

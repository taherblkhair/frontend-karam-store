import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Tag } from 'lucide-react';
import { OptimizedImage } from '@shared/components/OptimizedImage';
import { campaignPath } from '@modules/campaigns/utils/campaign';
import { CampaignCountdown } from '@modules/campaigns/components/CampaignCountdown';
import { formatCampaignEnd } from '@modules/store/utils/campaignDisplay';
import { HomeSection, SCROLL_ROW } from './HomeSection';
import { productsCountLabel } from '@modules/store/components/BrandTile';

const COUNTDOWN_WITHIN_MS = 72 * 3600 * 1000;

function CampaignCard({ campaign, serverTime, featured, onExpire }) {
  const ends = formatCampaignEnd(campaign.ends_at);
  const endsSoon = new Date(campaign.ends_at).getTime() - Date.now() < COUNTDOWN_WITHIN_MS;
  const href = campaignPath(campaign);

  return (
    <article
      className={`group relative flex overflow-hidden rounded-3xl bg-primary-900 text-white shadow-sm ${
        featured ? 'flex-col md:flex-row md:min-h-[22rem]' : 'flex-col'
      }`}
    >
      <Link to={href} className={`relative block shrink-0 overflow-hidden ${featured ? 'aspect-[16/10] md:aspect-auto md:w-3/5' : 'aspect-[16/10]'}`} tabIndex={-1} aria-hidden>
        {campaign.banner_image ? (
          <OptimizedImage
            src={campaign.banner_image}
            alt=""
            className="h-full w-full"
            imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
            sizes={featured ? '(max-width: 768px) 100vw, 60vw' : '(max-width: 768px) 85vw, 33vw'}
            widths={[800, 1200]}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900">
            <Tag size={48} className="text-secondary-400" />
          </div>
        )}
        {campaign.max_discount_percent ? (
          <span className="absolute top-3 right-3 rounded-full bg-secondary-400 px-3 py-1 text-sm font-bold text-primary-900 shadow">
            خصم حتى {campaign.max_discount_percent}%
          </span>
        ) : null}
      </Link>
      <div className={`flex flex-1 flex-col gap-3 p-5 sm:p-6 ${featured ? 'md:justify-center md:p-10' : ''}`}>
        <h3 className={`font-display font-bold leading-snug text-white ${featured ? 'text-2xl md:text-3xl' : 'text-xl'}`}>
          <Link to={href} className="text-white hover:text-secondary-300">{campaign.name_ar}</Link>
        </h3>
        {campaign.description ? (
          <p className="text-sm sm:text-base text-white/80 line-clamp-2">{campaign.description}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm text-white/75">
          {ends ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock size={16} aria-hidden /> ينتهي {ends}
            </span>
          ) : null}
          {campaign.products_count ? <span>{productsCountLabel(campaign.products_count)}</span> : null}
        </div>
        {endsSoon ? (
          <CampaignCountdown endsAt={campaign.ends_at} serverTime={serverTime} variant="inline" onExpire={onExpire} className="text-secondary-300" />
        ) : null}
        <div>
          <Link to={href} className="btn bg-white text-primary-700 hover:bg-tertiary-100 rounded-full px-6 text-sm">
            مشاهدة العرض <ArrowLeft size={16} aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

/**
 * Live campaigns from the homepage payload (server keeps only published, started, not ended).
 * A card that reaches its end while the page is open removes itself. No campaigns → nothing.
 */
export function HomeCampaigns({ campaigns = [], serverTime }) {
  const [expired, setExpired] = useState(() => new Set());
  const live = campaigns.filter((c) => !expired.has(c.id) && new Date(c.ends_at).getTime() > Date.now());
  if (!live.length) return null;
  const expire = (id) => () => setExpired((prev) => new Set(prev).add(id));

  return (
    <HomeSection id="home-campaigns" title="العروض والتخفيضات" subtitle="حملات سارية الآن — لفترة محدودة">
      {live.length === 1 ? (
        <CampaignCard campaign={live[0]} serverTime={serverTime} featured onExpire={expire(live[0].id)} />
      ) : (
        <div className={`${SCROLL_ROW} md:mx-0 md:grid md:grid-cols-2 ${live.length > 2 ? 'lg:grid-cols-3' : ''} md:gap-5 md:overflow-visible md:px-0 md:pb-0`}>
          {live.map((c) => (
            <div key={c.id} className="w-[85%] shrink-0 snap-start sm:w-[60%] md:w-auto">
              <CampaignCard campaign={c} serverTime={serverTime} onExpire={expire(c.id)} />
            </div>
          ))}
        </div>
      )}
    </HomeSection>
  );
}

export default HomeCampaigns;

import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import { storeCampaignsApi } from '@modules/campaigns/api/campaigns.api';
import { CampaignCountdown } from '@modules/campaigns/components/CampaignCountdown';
import { campaignPath } from '@modules/campaigns/utils/campaign';
import { readJSON } from '@core/utils/storageGuard';

export const ANNOUNCEMENT_QUERY_KEY = ['store-campaign-announcement'];
const CACHE_KEY = 'karam-campaign-announcement';

/**
 * Last answer kept in localStorage and used as (stale) initial data, like store settings:
 * a returning visitor gets the bar in the first paint instead of it pushing the page down
 * when the request returns. An ended campaign in the cache is ignored.
 */
function cachedAnnouncement() {
  const cached = readJSON(CACHE_KEY, undefined);
  const endsAt = cached?.data?.campaign?.ends_at;
  if (endsAt && new Date(endsAt).getTime() <= Date.now()) return undefined;
  return cached;
}

/** Shared by the bar and StoreAccessGate (same key → one request). */
export const announcementQuery = {
  queryKey: ANNOUNCEMENT_QUERY_KEY,
  queryFn: async () => {
    const res = await storeCampaignsApi.announcement();
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(res));
    } catch {
      /* storage full / blocked */
    }
    return res;
  },
  initialData: cachedAnnouncement,
  initialDataUpdatedAt: 0,
  staleTime: 60_000,
  retry: false,
};

/**
 * Top-of-store strip for the primary active campaign (chosen server-side by priority).
 * Hidden when no campaign is live; disappears by itself when the countdown reaches zero.
 */
export function CampaignAnnouncementBar() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ ...announcementQuery, refetchInterval: 5 * 60_000 });

  const payload = data?.data;
  const campaign = payload?.campaign;

  // At zero: refresh the bar and every price shown (campaign prices stop applying)
  const handleExpire = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  if (!campaign) return null;

  const tagline =
    campaign.announcement_text ||
    (campaign.max_discount_percent > 0 ? `تخفيضات تصل إلى ${campaign.max_discount_percent}%` : 'تخفيضات لفترة محدودة');

  return (
    <Link
      to={campaignPath(campaign)}
      className="block bg-ink-800 text-white hover:bg-ink-900 transition dark:bg-black"
      aria-label={`${campaign.name_ar} — ${tagline}`}
    >
      <div className="container mx-auto px-4 py-1.5 sm:py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-xs sm:text-sm">
        <span className="inline-flex items-center gap-1.5 font-bold">
          <Flame size={16} className="text-secondary-400 shrink-0" aria-hidden />
          <span className="text-secondary-400">{campaign.name_en || campaign.name_ar}</span>
          <span className="opacity-50" aria-hidden>|</span>
          <span>{tagline}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="opacity-80">ينتهي العرض خلال:</span>
          <CampaignCountdown endsAt={campaign.ends_at} serverTime={payload.server_time} onExpire={handleExpire} />
        </span>
      </div>
    </Link>
  );
}

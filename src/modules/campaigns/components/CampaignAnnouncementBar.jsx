import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import { storeCampaignsApi } from '@modules/campaigns/api/campaigns.api';
import { CampaignCountdown } from '@modules/campaigns/components/CampaignCountdown';
import { campaignPath } from '@modules/campaigns/utils/campaign';

export const ANNOUNCEMENT_QUERY_KEY = ['store-campaign-announcement'];

/**
 * Top-of-store strip for the primary active campaign (chosen server-side by priority).
 * Hidden when no campaign is live; disappears by itself when the countdown reaches zero.
 */
export function CampaignAnnouncementBar() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ANNOUNCEMENT_QUERY_KEY,
    queryFn: () => storeCampaignsApi.announcement(),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: false,
  });

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

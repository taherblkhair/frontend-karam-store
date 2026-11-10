import { CAMPAIGN_STATUS_META } from '@modules/campaigns/utils/campaign';

export function CampaignStatusBadge({ status }) {
  const meta = CAMPAIGN_STATUS_META[status] || CAMPAIGN_STATUS_META.draft;
  return <span className={`badge shrink-0 ${meta.className}`}>{meta.label}</span>;
}

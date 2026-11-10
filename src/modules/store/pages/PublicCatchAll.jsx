import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@modules/store/api/store.api';
import { LoadingSpinner } from '@shared/ui';
import SiteClosedPage from '@modules/store/pages/SiteClosedPage';
import NotFoundPage from '@modules/store/pages/NotFoundPage';
import CampaignPage, { campaignQuery } from '@modules/store/pages/CampaignPage';
import { parseApiError } from '@shared/utils/apiMessage.js';
import {
  isSiteClosed,
  normalizeSiteStatus,
} from '@modules/store/utils/siteStatus';

/**
 * Single path segment that may be a campaign short link, e.g. /black-friday
 */
function shortCampaignSlug(pathname) {
  const m = /^\/([^/]+)\/?$/.exec(pathname || '');
  return m ? m[1] : null;
}

/**
 * Final catch-all: campaign short link → campaign page; otherwise 404 when open,
 * closed page when storefront is disabled.
 */
export default function PublicCatchAll() {
  const { pathname } = useLocation();
  const slug = shortCampaignSlug(pathname);
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => storeApi.settings(),
    staleTime: 30_000,
  });
  const siteOpen = !isLoading && !isSiteClosed(normalizeSiteStatus(data?.data?.site_status));
  const campaign = useQuery({ ...campaignQuery(slug, false), enabled: Boolean(slug) && siteOpen });

  if (isLoading || (slug && siteOpen && campaign.isLoading)) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-tertiary-100 dark:bg-gray-950">
        <LoadingSpinner />
      </div>
    );
  }

  const settings = data?.data || {};
  const status = normalizeSiteStatus(settings.site_status);

  if (isSiteClosed(status)) {
    return (
      <SiteClosedPage
        status={status}
        message={settings.site_status_message}
        storeName={settings.store_name || 'كرم للحقائب'}
        logo={settings.logo}
        contactPhone={settings.store_phone}
      />
    );
  }

  if (slug && (campaign.data || parseApiError(campaign.error).code === 'CAMPAIGN_ENDED')) {
    return <CampaignPage slug={slug} />;
  }

  return <NotFoundPage />;
}

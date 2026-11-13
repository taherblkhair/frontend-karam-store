import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { announcementQuery } from '@modules/campaigns/components/CampaignAnnouncementBar';
import { storeSettingsQuery } from '@modules/store/api/storeSettings.query';
import { LoadingSpinner } from '@shared/ui';
import SiteClosedPage from '@modules/store/pages/SiteClosedPage';
import {
  isSiteClosed,
  normalizeSiteStatus,
} from '@modules/store/utils/siteStatus';

/**
 * Wraps all public storefront routes. When site_status is not online,
 * customers only see the closed page (no browse / cart / checkout).
 * Admin routes are outside this gate.
 */
const ANNOUNCEMENT_WAIT_MS = 1200;

export default function StoreAccessGate() {
  const { data, isLoading, isError } = useQuery({
    ...storeSettingsQuery,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  // First visit only (nothing cached): the announcement bar is requested with the page, in
  // parallel with settings. Waiting for it here (max ANNOUNCEMENT_WAIT_MS) lets the header be
  // drawn once at its final height instead of the bar pushing the whole page down later.
  const announcement = useQuery(announcementQuery);
  const [announcementWaitOver, setAnnouncementWaitOver] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnnouncementWaitOver(true), ANNOUNCEMENT_WAIT_MS);
    return () => clearTimeout(t);
  }, []);
  const waitForAnnouncement = announcement.isLoading && !announcementWaitOver;

  if (isLoading || waitForAnnouncement) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-tertiary-100 dark:bg-gray-950">
        <LoadingSpinner />
      </div>
    );
  }

  // If settings fail, fail open so the shop is not hard-down due to network glitch
  if (isError) {
    return <Outlet />;
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

  return <Outlet />;
}

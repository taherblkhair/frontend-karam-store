import { Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@modules/store/api/store.api';
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
export default function StoreAccessGate() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['settings'],
    queryFn: () => storeApi.settings(),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
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

import { useQuery } from '@tanstack/react-query';
import { storeApi } from '@modules/store/api/store.api';
import { LoadingSpinner } from '@shared/ui';
import SiteClosedPage from '@modules/store/pages/SiteClosedPage';
import NotFoundPage from '@modules/store/pages/NotFoundPage';
import {
  isSiteClosed,
  normalizeSiteStatus,
} from '@modules/store/utils/siteStatus';

/**
 * Final catch-all: 404 when open, closed page when storefront is disabled.
 */
export default function PublicCatchAll() {
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => storeApi.settings(),
    staleTime: 30_000,
  });

  if (isLoading) {
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

  return <NotFoundPage />;
}

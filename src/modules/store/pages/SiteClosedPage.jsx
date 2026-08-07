import { Construction, Wrench } from 'lucide-react';
import {
  SITE_STATUS,
  normalizeSiteStatus,
  resolveSiteStatusMessage,
  siteStatusTitleAr,
} from '@modules/store/utils/siteStatus';

/**
 * Full-screen storefront closed state (maintenance / development).
 * No commerce UI — customers cannot browse or order.
 */
export default function SiteClosedPage({
  status = SITE_STATUS.MAINTENANCE,
  message,
  storeName = 'كرم للحقائب',
  logo,
  contactPhone,
}) {
  const mode = normalizeSiteStatus(status);
  const title = siteStatusTitleAr(mode);
  const body = resolveSiteStatusMessage(mode, message);
  const Icon = mode === SITE_STATUS.DEVELOPMENT ? Construction : Wrench;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-tertiary-100 via-white to-primary-50/40 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-md text-center">
        {logo ? (
          <img
            src={logo}
            alt={storeName}
            className="mx-auto mb-6 h-16 w-16 rounded-2xl object-cover shadow-sm border border-ink-100 dark:border-gray-700"
          />
        ) : (
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-sm">
            <Icon size={30} strokeWidth={2} />
          </div>
        )}

        <p className="text-sm font-semibold text-primary-600 mb-2">{storeName}</p>
        <h1 className="text-2xl md:text-3xl font-display font-bold text-ink-800 dark:text-white mb-3">
          {title}
        </h1>
        <p className="text-ink-500 dark:text-gray-400 leading-relaxed mb-8">{body}</p>

        <div className="inline-flex items-center gap-2 rounded-full bg-secondary-400/90 text-ink-800 text-sm font-bold px-4 py-2">
          <Icon size={16} />
          {mode === SITE_STATUS.DEVELOPMENT ? 'قريباً' : 'نعمل على التحسين'}
        </div>

        {contactPhone ? (
          <p className="mt-8 text-sm text-ink-500 dark:text-gray-400">
            للاستفسار:{' '}
            <a
              href={`tel:${contactPhone}`}
              className="font-semibold text-primary-600 hover:underline"
              dir="ltr"
            >
              {contactPhone}
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}

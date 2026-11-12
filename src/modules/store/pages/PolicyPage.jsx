import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner } from '@shared/ui';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { storeSettingsQuery } from '@modules/store/api/storeSettings.query';
import { brandFromSettings } from '@modules/store/utils/brand';
import { policyBySlug } from '@modules/store/utils/policies';
import NotFoundPage from '@modules/store/pages/NotFoundPage';

/** Policy text written by the owner in admin settings — shown as plain text (paragraphs kept), never HTML. */
export default function PolicyPage() {
  const { slug } = useParams();
  const policy = policyBySlug(slug);
  const { data, isLoading } = useQuery({ ...storeSettingsQuery, staleTime: 60_000 });
  const settings = data?.data || {};
  const brand = brandFromSettings(settings);
  const text = policy ? String(settings[policy.key] || '').trim() : '';

  usePageMeta({ title: policy ? `${policy.title} | ${brand.full}` : brand.full });

  if (!policy || (!isLoading && !text)) return <NotFoundPage />;

  return (
    <StoreLayout>
      <article className="container mx-auto px-4 py-10 sm:py-14 max-w-3xl">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink-800 dark:text-white">{policy.title}</h1>
        <p className="mt-1 text-sm text-ink-500">{brand.full}</p>
        {isLoading && !text ? (
          <LoadingSpinner />
        ) : (
          <div className="card mt-8 p-6 sm:p-8 text-ink-700 dark:text-gray-200 leading-8 whitespace-pre-line break-words">
            {text}
          </div>
        )}
      </article>
    </StoreLayout>
  );
}

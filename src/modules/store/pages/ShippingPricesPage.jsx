import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Search, Truck } from 'lucide-react';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner } from '@shared/ui';
import { usePageMeta } from '@shared/hooks/usePageMeta';
import { storeSettingsQuery } from '@modules/store/api/storeSettings.query';
import { brandFromSettings } from '@modules/store/utils/brand';
import { normalizeArabic } from '@modules/store/components/SearchableSelect';
import { DELIVERY_NOTES } from '@modules/store/components/ProductDetailAccordions';
import { formatShippingAmount, useShippingCity } from '@modules/store/hooks/useShippingCity';

/**
 * /shipping — delivery price for every city, from the same rates checkout charges.
 * Shareable: the page can send this link instead of typing prices in Messenger.
 */
export default function ShippingPricesPage() {
  const { cities, cityId, setCityId, isLoading, isError } = useShippingCity();
  const { data: settingsData } = useQuery({ ...storeSettingsQuery, staleTime: 60_000 });
  const brand = brandFromSettings(settingsData?.data || {});
  const [query, setQuery] = useState('');

  usePageMeta({
    title: `أسعار التوصيل | ${brand.full}`,
    description: 'سعر التوصيل إلى مدينتك في ليبيا — الدفع عند الاستلام.',
  });

  const shown = useMemo(() => {
    const q = normalizeArabic(query);
    return q ? cities.filter((c) => normalizeArabic(c.name_ar).includes(q)) : cities;
  }, [cities, query]);

  return (
    <StoreLayout>
      <div className="container mx-auto max-w-2xl px-4 pb-28 pt-6 sm:pt-10 md:pb-12">
        <h1 className="font-display text-2xl font-bold text-primary-600 sm:text-3xl">أسعار التوصيل</h1>
        <p className="mt-1.5 text-sm text-ink-500 dark:text-gray-400">
          سعر التوصيل حسب مدينتك، وهو نفسه الذي يُضاف عند إتمام الطلب. اختر مدينتك ليظهر سعرها في السلة والطلب.
        </p>

        <div className="relative mt-5">
          <Search size={18} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن مدينتك"
            aria-label="ابحث عن مدينتك"
            className="input ps-10"
            autoComplete="off"
          />
        </div>

        <div className="card mt-4 overflow-hidden">
          {isLoading ? (
            <div className="py-10"><LoadingSpinner /></div>
          ) : isError ? (
            <p className="px-4 py-10 text-center text-sm text-ink-500">تعذّر تحميل الأسعار حالياً، حاول مرة أخرى بعد قليل.</p>
          ) : shown.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-ink-500">لا توجد مدينة مطابقة للبحث</p>
          ) : (
            <ul className="divide-y divide-ink-100 dark:divide-gray-700" aria-label="المدن وأسعار التوصيل">
              {shown.map((c) => {
                const mine = String(c.id) === cityId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setCityId(c.id)}
                      aria-pressed={mine}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3.5 text-start transition hover:bg-tertiary-100 dark:hover:bg-gray-800 ${
                        mine ? 'bg-primary-50 dark:bg-primary-900/30' : ''
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={`truncate ${mine ? 'font-bold text-primary-700 dark:text-primary-200' : 'font-medium text-ink-800 dark:text-gray-100'}`}>
                          {c.name_ar}
                        </span>
                        {mine ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                            <Check size={12} aria-hidden /> مدينتك
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-bold tabular-nums text-ink-800 dark:text-gray-100">
                        {c.shipping_price != null ? `${formatShippingAmount(c.shipping_price)} د.ل` : '—'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <section className="card mt-6 p-5" aria-labelledby="delivery-times">
          <h2 id="delivery-times" className="flex items-center gap-2 font-bold text-ink-800 dark:text-gray-100">
            <Truck size={18} className="text-primary-600" aria-hidden />
            مدة التوصيل
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 ps-5 text-sm leading-relaxed text-ink-600 dark:text-gray-300">
            {DELIVERY_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-ink-600 dark:text-gray-300">الدفع عند الاستلام.</p>
        </section>

        <Link to="/products" className="btn-primary mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl font-bold sm:w-auto sm:px-8">
          تسوّق الآن
        </Link>
      </div>
    </StoreLayout>
  );
}

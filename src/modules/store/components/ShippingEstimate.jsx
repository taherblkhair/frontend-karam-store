import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { SearchableSelect } from '@modules/store/components/SearchableSelect';
import {
  cityPriceOptions,
  formatShippingAmount,
  useShippingCity,
} from '@modules/store/hooks/useShippingCity';

/** Inline city picker reused by the product page and the cart (same list as checkout). */
export function ShippingCityPicker({ cities, cityId, onChange, disabled }) {
  return (
    <SearchableSelect
      variant="inline"
      options={cityPriceOptions(cities)}
      value={cityId}
      onChange={onChange}
      disabled={disabled}
      placeholder="اختر مدينتك"
      searchPlaceholder="ابحث عن مدينتك"
      emptyText="لا توجد مدينة مطابقة للبحث"
      ariaLabel="مدينة التوصيل"
    />
  );
}

/**
 * Product page: "سعر التوصيل إلى [مدينتك ▾] 25 د.ل" under availability / packaging.
 * Always one line tall (also while cities load) so nothing below moves.
 */
export function ProductShippingLine() {
  const { cities, cityId, price, setCityId, isLoading, isError } = useShippingCity();
  if (isError) return null;

  return (
    <div className="relative mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-600 dark:text-gray-300">
      <Truck size={16} className="shrink-0 text-ink-400 dark:text-gray-400" aria-hidden />
      <span>سعر التوصيل إلى</span>
      <ShippingCityPicker cities={cities} cityId={cityId} onChange={setCityId} disabled={isLoading} />
      {price != null ? (
        <strong className="font-semibold tabular-nums text-ink-800 dark:text-gray-100" aria-live="polite">
          {formatShippingAmount(price)} د.ل
        </strong>
      ) : null}
      <Link to="/shipping" className="ms-auto text-xs font-medium text-primary-600 hover:underline underline-offset-2 dark:text-primary-300">
        كل الأسعار
      </Link>
    </div>
  );
}

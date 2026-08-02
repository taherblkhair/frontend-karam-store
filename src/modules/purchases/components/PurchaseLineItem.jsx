import { Trash2, Loader2 } from 'lucide-react';
import { formatPrice } from '@core/constants';
import { FieldError } from '@shared/ui';

function variantLabel(v) {
  const parts = [v.color_name, v.size_name].filter(Boolean);
  const label = parts.join(' / ') || `متغير #${v.id}`;
  const sku = v.sku ? ` — ${v.sku}` : '';
  return `${label}${sku}`;
}

/**
 * One purchase invoice line: product + optional variant + qty + unit cost.
 */
export function PurchaseLineItem({
  item,
  index,
  products,
  items = [],
  canRemove,
  getFieldError,
  onChangeProduct,
  onChangeField,
  onRemove,
}) {
  const qty = parseFloat(item.quantity) || 0;
  const cost = parseFloat(item.unit_cost) || 0;
  const lineTotal = qty * cost;

  const takenProductIds = new Set(
    items
      .filter((row, i) => i !== index && row.product_id && !row.has_variants)
      .map((row) => String(row.product_id))
  );
  const takenVariantIds = new Set(
    items
      .filter((row, i) => i !== index && row.variant_id)
      .map((row) => String(row.variant_id))
  );

  return (
    <div className="border rounded-xl p-3 sm:p-4 space-y-3 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-500">بند #{index + 1}</p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="btn-outline text-red-500 px-2 py-1.5 text-xs"
            title="حذف البند"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
          المنتج
        </label>
        <div className="relative">
          <select
            className="input"
            required
            value={item.product_id}
            onChange={(e) => onChangeProduct(e.target.value)}
            disabled={item.loadingVariants}
          >
            <option value="">اختر المنتج</option>
            {products.map((p) => {
              const disabled = !p.has_variants && takenProductIds.has(String(p.id));
              return (
                <option key={p.id} value={p.id} disabled={disabled}>
                  {p.name_ar}
                  {p.sku ? ` — ${p.sku}` : ''}
                  {p.has_variants ? ' (بمتغيرات)' : ''}
                  {disabled ? ' — مضاف' : ''}
                </option>
              );
            })}
          </select>
          {item.loadingVariants && (
            <Loader2
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
            />
          )}
        </div>
        <FieldError
          message={
            getFieldError(`items[${index}].product_id`)
            || getFieldError('items.0.product_id')
          }
        />
      </div>

      {item.has_variants && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
            المتغير (لون / مقاس)
          </label>
          <select
            className="input"
            required
            value={item.variant_id}
            onChange={(e) => onChangeField('variant_id', e.target.value)}
            disabled={item.loadingVariants || !item.variants?.length}
          >
            <option value="">اختر المتغير</option>
            {(item.variants || []).map((v) => {
              const disabled = takenVariantIds.has(String(v.id));
              return (
                <option key={v.id} value={v.id} disabled={disabled}>
                  {variantLabel(v)}
                  {disabled ? ' — مضاف' : ''}
                </option>
              );
            })}
          </select>
          <FieldError message={getFieldError(`items[${index}].variant_id`)} />
          {!item.loadingVariants && item.product_id && !(item.variants || []).length && (
            <p className="text-xs text-amber-600 mt-1">هذا المنتج بلا متغيرات نشطة</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
            الكمية
          </label>
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            required
            value={item.quantity}
            onChange={(e) => onChangeField('quantity', e.target.value)}
          />
          <FieldError message={getFieldError(`items[${index}].quantity`)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
            تكلفة الوحدة
          </label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            required
            value={item.unit_cost}
            onChange={(e) => onChangeField('unit_cost', e.target.value)}
            placeholder="0.00"
          />
          <FieldError message={getFieldError(`items[${index}].unit_cost`)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
            إجمالي البند
          </label>
          <div className="input bg-white dark:bg-gray-800 font-semibold flex items-center">
            {formatPrice(lineTotal)}
          </div>
        </div>
      </div>
    </div>
  );
}

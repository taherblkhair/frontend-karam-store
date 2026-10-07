import { CreditCard, Loader2 } from 'lucide-react';
import { formatPrice } from '@core/constants';

export function PaymentSection({
  discount,
  setDiscount,
  subtotal,
  total,
  itemCount = 0,
  onSale,
  isPending,
  cartEmpty,
}) {
  return (
    <div className="shrink-0 space-y-2.5 border-t bg-white p-3 sm:p-4 dark:border-gray-700 dark:bg-gray-800 safe-pb">
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>المجموع{itemCount ? ` (${itemCount} قطعة)` : ''}</span>
          <span className="tabular-nums">{formatPrice(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="pos-discount" className="text-gray-600 dark:text-gray-300">خصم</label>
          <input
            id="pos-discount"
            type="number"
            inputMode="decimal"
            min="0"
            max={subtotal}
            className="input h-9 w-28 py-1.5 text-left text-sm tabular-nums"
            value={discount || ''}
            placeholder="0"
            disabled={cartEmpty}
            onChange={(e) => setDiscount(Math.min(subtotal, Math.max(0, parseFloat(e.target.value) || 0)))}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onSale}
        disabled={isPending || cartEmpty}
        className="btn-primary w-full justify-between py-3.5 text-base"
      >
        <span className="inline-flex items-center gap-2">
          {isPending ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
          {isPending ? 'جاري الدفع...' : 'دفع نقداً'}
        </span>
        <span className="text-lg font-bold tabular-nums text-secondary-400">{formatPrice(total)}</span>
      </button>
    </div>
  );
}

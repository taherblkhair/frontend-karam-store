import { CreditCard } from 'lucide-react';
import { formatPrice } from '@core/constants';

export function PaymentSection({
  customerName,
  setCustomerName,
  customerPhone,
  setCustomerPhone,
  discount,
  setDiscount,
  subtotal,
  total,
  onSale,
  isPending,
  cartEmpty,
}) {
  return (
    <div className="border-t dark:border-gray-700 p-4 space-y-3 bg-white dark:bg-gray-800">
      <div className="grid grid-cols-2 gap-2">
        <input
          className="input text-sm"
          placeholder="اسم العميل"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
        />
        <input
          className="input text-sm"
          placeholder="الهاتف"
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
        />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-600 dark:text-gray-300">
          <span>المجموع</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between items-center gap-3">
          <span className="text-gray-600 dark:text-gray-300">خصم</span>
          <input
            type="number"
            min="0"
            max={subtotal}
            className="input w-28 text-left text-sm py-1.5"
            value={discount}
            onChange={(e) => setDiscount(Math.min(subtotal, Math.max(0, parseFloat(e.target.value) || 0)))}
          />
        </div>
        <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
          <span className="font-bold text-base">الإجمالي</span>
          <span className="font-bold text-xl text-primary-600">{formatPrice(total)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onSale}
        disabled={isPending || cartEmpty}
        className="btn-primary w-full py-3.5 text-base"
      >
        <CreditCard size={20} />
        {isPending ? 'جاري الدفع...' : 'دفع نقداً'}
      </button>
    </div>
  );
}

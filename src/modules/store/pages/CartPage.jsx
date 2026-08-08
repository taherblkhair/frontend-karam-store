import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import StoreLayout from '@shared/layouts/StoreLayout';
import { useCart } from '@modules/store/context/CartContext';
import { formatPrice } from '@core/constants';
import { EmptyState } from '@shared/ui';
import { OptimizedThumb } from '@shared/components/OptimizedImage';

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">سلة التسوق</h1>

        {items.length === 0 ? (
          <EmptyState message="السلة فارغة" />
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.key} className="card p-4 flex gap-4">
                  <div className="w-24 h-24 bg-tertiary-100 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <OptimizedThumb src={item.image} alt={item.name} className="w-full h-full" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">لا صورة</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{item.name}</h3>
                    {item.variant_info && <p className="text-sm text-gray-500">{item.variant_info}</p>}
                    <p className="text-primary-600 font-bold mt-1">{formatPrice(item.price)}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center border rounded-lg">
                        <button onClick={() => updateQuantity(item.key, item.quantity - 1)} className="p-2"><Minus size={16} /></button>
                        <span className="px-3">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.key, Math.min(item.stock, item.quantity + 1))} className="p-2"><Plus size={16} /></button>
                      </div>
                      <span className="text-xs font-medium">
                        {item.stock > 0 ? (
                          <span className="text-green-600">متوفر</span>
                        ) : (
                          <span className="text-red-600">غير متوفر</span>
                        )}
                      </span>
                      <button onClick={() => removeItem(item.key)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="text-left font-bold">{formatPrice(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>

            <div className="card p-6 h-fit">
              <h2 className="text-lg font-bold mb-4">ملخص الطلب</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span>المجموع الفرعي</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>الشحن</span>
                  <span>يُحسب عند إتمام الطلب</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold text-lg">
                  <span>الإجمالي</span>
                  <span className="text-primary-600">{formatPrice(subtotal)}</span>
                </div>
              </div>
              <Link to="/checkout" className="btn-primary w-full text-center">إتمام الطلب</Link>
            </div>
          </div>
        )}
      </div>
    </StoreLayout>
  );
}

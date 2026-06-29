import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Plus, Minus, Trash2, CreditCard } from 'lucide-react';
import { notifySuccess, notifyError } from '../../utils/notify';
import api from '../../api/axios';
import { formatPrice } from '../../utils/constants';

function getCartKey(item) {
  return item.variant_id ? `${item.product_id}-${item.variant_id}` : `${item.product_id}`;
}

export default function POSPage() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const searchRef = useRef(null);

  const { data: searchResults } = useQuery({
    queryKey: ['pos-search', search],
    queryFn: () => api.get('/products', { params: { search, limit: 10, admin: 'true' } }),
    enabled: search.length >= 2,
  });

  const saleMutation = useMutation({
    mutationFn: (data) => api.post('/pos/sale', data),
    onSuccess: (res) => {
      notifySuccess(res);
      setCart([]);
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      searchRef.current?.focus();
    },
    onError: notifyError,
  });

  const addToCart = (product, variantId = null, stock = null, price = null, variantInfo = null) => {
    const availableStock = stock ?? product.total_stock ?? 0;
    if (availableStock <= 0) {
      notifyError({ message: 'المنتج غير متوفر في المخزون' });
      return;
    }

    setCart((prev) => {
      const key = variantId ? `${product.id}-${variantId}` : `${product.id}`;
      const existing = prev.find((i) => getCartKey(i) === key);

      if (existing) {
        if (existing.quantity >= existing.stock) {
          notifyError({ message: `الحد الأقصى للمخزون: ${existing.stock}` });
          return prev;
        }
        return prev.map((i) =>
          getCartKey(i) === key ? { ...i, quantity: i.quantity + 1 } : i
        );
      }

      return [...prev, {
        product_id: product.id,
        variant_id: variantId,
        name: product.name_ar,
        variant_info: variantInfo,
        price: parseFloat(price ?? product.price),
        quantity: 1,
        stock: availableStock,
      }];
    });
    setSearch('');
  };

  const updateQty = (item, delta) => {
    setCart((prev) => prev.map((i) => {
      if (getCartKey(i) !== getCartKey(item)) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > i.stock) {
        notifyError({ message: `الحد الأقصى للمخزون: ${i.stock}` });
        return i;
      }
      return { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  const searchByBarcode = async (barcode) => {
    try {
      const res = await api.get(`/products/barcode/${barcode}`);
      const p = res.data;
      addToCart(
        p,
        p.variant_id || null,
        p.variant_stock ?? p.total_stock,
        p.variant_price ?? p.price,
        [p.color_name, p.size_name].filter(Boolean).join(' - ') || null
      );
    } catch {
      notifyError({ message: 'المنتج غير موجود' });
    }
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  const handleSale = () => {
    if (cart.length === 0) return notifyError({ message: 'السلة فارغة' });
    if (discount > subtotal) return notifyError({ message: 'الخصم أكبر من المجموع' });

    saleMutation.mutate({
      customer_name: customerName || 'عميل POS',
      customer_phone: customerPhone || '0000000000',
      discount,
      items: cart.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity: i.quantity,
      })),
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)]">
      <h1 className="text-2xl font-bold mb-4">نقطة البيع (POS)</h1>

      <div className="grid lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-2 flex flex-col">
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              ref={searchRef}
              className="input pr-10 text-lg"
              placeholder="بحث بالاسم أو Barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.length >= 8) searchByBarcode(search);
              }}
              autoFocus
            />
          </div>

          {searchResults?.data?.length > 0 && (
            <div className="card mb-4 max-h-48 overflow-auto">
              {searchResults.data.map((p) => {
                const outOfStock = (p.total_stock ?? 0) <= 0;
                return (
                  <button
                    key={p.id}
                    disabled={outOfStock}
                    onClick={() => addToCart(p)}
                    className={`w-full text-right p-3 border-b dark:border-gray-700 flex justify-between items-center ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                  >
                    <span>{p.name_ar} {outOfStock ? '(نفذ)' : `(${p.total_stock} متوفر)`}</span>
                    <span className="text-primary-600">{formatPrice(p.price)}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="card flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="text-right p-3">المنتج</th>
                  <th className="text-right p-3">السعر</th>
                  <th className="text-right p-3">الكمية</th>
                  <th className="text-right p-3">المخzون</th>
                  <th className="text-right p-3">الإجمالي</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={getCartKey(item)} className="border-t dark:border-gray-700">
                    <td className="p-3">
                      {item.name}
                      {item.variant_info && <span className="text-xs text-gray-500 block">{item.variant_info}</span>}
                    </td>
                    <td className="p-3">{formatPrice(item.price)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQty(item, -1)} className="p-1"><Minus size={14} /></button>
                        <span className="px-2">{item.quantity}</span>
                        <button onClick={() => updateQty(item, 1)} className="p-1"><Plus size={14} /></button>
                      </div>
                    </td>
                    <td className="p-3">{item.stock}</td>
                    <td className="p-3">{formatPrice(item.price * item.quantity)}</td>
                    <td className="p-3">
                      <button onClick={() => setCart(cart.filter((i) => getCartKey(i) !== getCartKey(item)))} className="text-red-500"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cart.length === 0 && <p className="text-center text-gray-500 py-12">ابحث عن منتج لإضافته</p>}
          </div>
        </div>

        <div className="card p-6 flex flex-col">
          <h2 className="font-bold text-lg mb-4">الدفع</h2>
          <input className="input mb-3" placeholder="اسم العميل (اختياري)" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input className="input mb-4" placeholder="الهاتف (اختياري)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />

          <div className="space-y-2 mb-4 flex-1">
            <div className="flex justify-between"><span>المجموع</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between items-center">
              <span>خصم</span>
              <input type="number" min="0" max={subtotal} className="input w-24 text-left" value={discount} onChange={(e) => setDiscount(Math.min(subtotal, Math.max(0, parseFloat(e.target.value) || 0)))} />
            </div>
            <div className="flex justify-between font-bold text-xl border-t pt-3">
              <span>الإجمالي</span>
              <span className="text-primary-600">{formatPrice(total)}</span>
            </div>
          </div>

          <button onClick={handleSale} disabled={saleMutation.isPending || cart.length === 0} className="btn-primary w-full py-4 text-lg">
            <CreditCard size={20} /> دفع نقداً
          </button>
        </div>
      </div>
    </div>
  );
}

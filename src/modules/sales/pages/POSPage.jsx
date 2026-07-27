import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, Clock } from 'lucide-react';
import { notifyError } from '@shared/services/toast.service';
import { useConfirm } from '@shared/hooks/useConfirm';
import { salesApi } from '@modules/sales/api/sales.api';
import { usePosReadyProducts, usePosSearch } from '@modules/sales/hooks/usePosProducts';
import { useCreateSale } from '@modules/sales/hooks/useCreateSale';
import { formatPrice } from '@core/constants';
import { getCartKey } from '@modules/sales/utils/cart';
import { VariantPickerModal } from '@modules/sales/components/VariantPickerModal';
import { ProductSelector } from '@modules/sales/components/ProductSelector';
import { CartTable } from '@modules/sales/components/CartTable';
import { PaymentSection } from '@modules/sales/components/PaymentSection';
import { RecentPosOrders } from '@modules/sales/components/RecentPosOrders';

export default function POSPage() {
  const confirm = useConfirm();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cityId, setCityId] = useState('');
  const [areaText, setAreaText] = useState('');
  const [pickingId, setPickingId] = useState(null);
  const [variantProduct, setVariantProduct] = useState(null);
  const [recentOpen, setRecentOpen] = useState(false);
  const searchRef = useRef(null);

  const isSearching = search.trim().length >= 2;

  const { data: readyProducts, isLoading: readyLoading } = usePosReadyProducts();
  const { data: searchResults, isFetching: searchLoading } = usePosSearch(search);
  const { data: citiesData } = useQuery({
    queryKey: ['pos-cities'],
    queryFn: () => salesApi.cities(),
    staleTime: 5 * 60 * 1000,
  });

  const saleMutation = useCreateSale({
    onSuccess: () => {
      setCart([]);
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      setCityId('');
      setAreaText('');
      setSearch('');
      searchRef.current?.focus();
    },
  });

  const addToCart = (product, options = {}) => {
    const {
      variantId = null,
      stock = null,
      price = null,
      variantInfo = null,
      image = null,
    } = options;

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
        image: image || product.primary_image || product.variant_image || product.image || null,
        variant_info: variantInfo,
        price: parseFloat(price ?? product.price),
        quantity: 1,
        stock: availableStock,
      }];
    });
    setSearch('');
    setVariantProduct(null);
  };

  const handleSelectProduct = async (product) => {
    setPickingId(product.id);
    try {
      const res = await salesApi.getProduct(product.id);
      const full = res.data;
      const variants = full.variants || [];

      if (variants.length > 0) {
        setVariantProduct({
          ...full,
          primary_image: full.images?.find((i) => i.is_primary)?.url
            || full.images?.[0]?.url
            || product.primary_image,
        });
      } else {
        addToCart(full, {
          stock: full.total_stock,
          price: full.price,
          image: product.primary_image
            || full.images?.find((i) => i.is_primary)?.url
            || full.images?.[0]?.url,
        });
      }
    } catch {
      notifyError({ message: 'تعذر تحميل المنتج' });
    } finally {
      setPickingId(null);
    }
  };

  const confirmVariant = (variant) => {
    if (!variantProduct) return;
    addToCart(variantProduct, {
      variantId: variant.id,
      stock: variant.stock,
      price: variant.price || variantProduct.price,
      variantInfo: [variant.color_name, variant.size_name].filter(Boolean).join(' - ') || null,
      image: variant.image
        || variantProduct.primary_image
        || variantProduct.images?.[0]?.url,
    });
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

  const removeFromCart = (item) => {
    setCart((prev) => prev.filter((i) => getCartKey(i) !== getCartKey(item)));
  };

  const searchByBarcode = async (barcode) => {
    try {
      const res = await salesApi.getByBarcode(barcode);
      const p = res.data;

      if (p.variant_id) {
        addToCart(p, {
          variantId: p.variant_id,
          stock: p.variant_stock ?? p.total_stock,
          price: p.variant_price ?? p.price,
          variantInfo: [p.color_name, p.size_name].filter(Boolean).join(' - ') || null,
          image: p.variant_image || p.primary_image || p.image,
        });
        return;
      }

      await handleSelectProduct(p);
    } catch {
      notifyError({ message: 'المنتج غير موجود' });
    }
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const handleSale = async () => {
    if (cart.length === 0) return notifyError({ message: 'السلة فارغة' });
    if (discount > subtotal) return notifyError({ message: 'الخصم أكبر من المجموع' });

    const ok = await confirm({
      title: 'تأكيد الدفع',
      message: `تأكيد بيع ${itemCount} قطعة بإجمالي ${formatPrice(total)}؟`,
      confirmText: 'دفع نقداً',
      variant: 'warning',
    });
    if (!ok) return;

    const payload = {
      customer_name: customerName || 'عميل POS',
      customer_phone: customerPhone || '0000000000',
      discount,
      shipping_cost: 0,
      items: cart.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity: i.quantity,
      })),
    };

    if (cityId) payload.city_id = parseInt(cityId, 10);
    if (areaText.trim()) payload.address = areaText.trim();

    saleMutation.mutate(payload);
  };

  const displayProducts = isSearching ? (searchResults?.data || []) : (readyProducts?.data || []);
  const listLoading = isSearching ? searchLoading : readyLoading;

  return (
    <div className="h-[calc(100vh-4.5rem)] flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            ref={searchRef}
            className="input pr-10 pl-10 text-base h-12"
            placeholder="ابحث بالاسم أو امسح الباركود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim().length >= 8) searchByBarcode(search.trim());
            }}
            autoFocus
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="مسح البحث"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setRecentOpen(true)}
          className="btn-secondary h-12 whitespace-nowrap"
        >
          <Clock size={18} />
          آخر الطلبات
        </button>
        <div className="text-sm text-gray-500 whitespace-nowrap">
          {itemCount > 0 ? `${itemCount} قطعة في السلة` : 'السلة فارغة'}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-3 flex-1 min-h-0">
        <ProductSelector
          isSearching={isSearching}
          listLoading={listLoading}
          displayProducts={displayProducts}
          pickingId={pickingId}
          onSelectProduct={handleSelectProduct}
        />

        <aside className="lg:col-span-4 flex flex-col min-h-0 card overflow-hidden">
          <div className="px-4 py-3 border-b dark:border-gray-700">
            <h2 className="font-semibold">السلة</h2>
          </div>

          <CartTable
            cart={cart}
            onUpdateQty={updateQty}
            onRemove={removeFromCart}
          />

          <PaymentSection
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            cityId={cityId}
            setCityId={setCityId}
            areaText={areaText}
            setAreaText={setAreaText}
            cities={citiesData?.data || []}
            discount={discount}
            setDiscount={setDiscount}
            subtotal={subtotal}
            total={total}
            onSale={handleSale}
            isPending={saleMutation.isPending}
            cartEmpty={cart.length === 0}
          />
        </aside>
      </div>

      <VariantPickerModal
        product={variantProduct}
        open={Boolean(variantProduct)}
        onClose={() => setVariantProduct(null)}
        onConfirm={confirmVariant}
      />

      <RecentPosOrders open={recentOpen} onClose={() => setRecentOpen(false)} />
    </div>
  );
}

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Clock, ShoppingCart, ChevronUp } from 'lucide-react';
import { notifyError } from '@shared/services/toast.service';
import { useConfirm } from '@shared/hooks/useConfirm';
import { useAuth } from '@core/auth/AuthContext';
import { salesApi } from '@modules/sales/api/sales.api';
import { usePosReadyProducts, usePosSearch } from '@modules/sales/hooks/usePosProducts';
import { useCreateSale } from '@modules/sales/hooks/useCreateSale';
import { usePosRecipient } from '@modules/sales/hooks/usePosRecipient';
import { formatPrice } from '@core/constants';
import { getCartKey } from '@modules/sales/utils/cart';
import { VariantPickerModal } from '@modules/sales/components/VariantPickerModal';
import { ProductSelector } from '@modules/sales/components/ProductSelector';
import { CartTable } from '@modules/sales/components/CartTable';
import { PaymentSection } from '@modules/sales/components/PaymentSection';
import { RecipientForm } from '@modules/sales/components/RecipientForm';
import { RecentPosOrders } from '@modules/sales/components/RecentPosOrders';

const DESKTOP_QUERY = '(min-width: 1024px)';
const isDesktop = () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches;

export default function POSPage() {
  const confirm = useConfirm();
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [pickingId, setPickingId] = useState(null);
  const [variantProduct, setVariantProduct] = useState(null);
  const [recentOpen, setRecentOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const searchRef = useRef(null);
  const recipientForm = usePosRecipient({ canLookupCustomers: hasPermission('customers.manage') });

  const isSearching = search.trim().length >= 2;

  const readyList = usePosReadyProducts();
  const searchList = usePosSearch(search);

  useEffect(() => {
    if (!sheetOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setSheetOpen(false);
    const mq = window.matchMedia(DESKTOP_QUERY);
    const onResize = () => mq.matches && setSheetOpen(false);
    window.addEventListener('keydown', onKey);
    mq.addEventListener('change', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onResize);
    };
  }, [sheetOpen]);

  const saleMutation = useCreateSale({
    onSuccess: () => {
      setCart([]);
      setDiscount(0);
      recipientForm.reset();
      setSearch('');
      setSheetOpen(false);
      if (isDesktop()) searchRef.current?.focus();
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
      variantInfo:
        [variant.color_name && `اللون: ${variant.color_name}`, variant.size_name && `المقاس: ${variant.size_name}`]
          .filter(Boolean)
          .join(' · ') || null,
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
  const cartQtyByProduct = useMemo(
    () => cart.reduce((acc, i) => ({ ...acc, [i.product_id]: (acc[i.product_id] || 0) + i.quantity }), {}),
    [cart]
  );

  const handleSale = async () => {
    if (cart.length === 0) return notifyError({ message: 'السلة فارغة' });
    if (discount > subtotal) return notifyError({ message: 'الخصم أكبر من المجموع' });

    const problem = recipientForm.validate();
    if (problem) {
      notifyError({ message: problem.message });
      setSheetOpen(true);
      setTimeout(() => recipientForm.focusField(problem.field), isDesktop() ? 0 : 320);
      return;
    }

    const { recipient, cityLabel, areaLabel } = recipientForm;
    const destination = [cityLabel, areaLabel].filter(Boolean).join(' — ');
    const ok = await confirm({
      title: 'تأكيد الدفع',
      message: [
        `تأكيد بيع ${itemCount} قطعة بإجمالي ${formatPrice(total)}؟`,
        `المستلم: ${recipient.name.trim() || 'عميل POS'} · ${recipient.phone}`,
        destination ? `التوصيل: ${destination}` : 'استلام من المحل',
      ].join('\n'),
      confirmText: 'دفع نقداً',
      variant: 'warning',
    });
    if (!ok) return;

    saleMutation.mutate({
      ...recipientForm.toPayload(),
      discount,
      shipping_cost: 0,
      items: cart.map((i) => ({
        product_id: i.product_id,
        variant_id: i.variant_id ?? null,
        quantity: i.quantity,
      })),
    });
  };

  const activeList = isSearching ? searchList : readyList;

  return (
    <div className="flex flex-col gap-2 pb-24 sm:gap-3 lg:h-full lg:min-h-0 lg:pb-0">
      <div className="sticky top-0 z-20 -mx-2 -mt-2 flex items-center gap-2 bg-gray-100/95 px-2 py-2 backdrop-blur sm:-mx-4 sm:-mt-4 sm:px-4 sm:py-3 lg:static lg:m-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none dark:bg-gray-900/95 lg:dark:bg-transparent">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            ref={searchRef}
            type="search"
            enterKeyHint="search"
            className="input h-11 pl-10 pr-10 text-base sm:h-12"
            placeholder="ابحث بالاسم أو امسح الباركود..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && search.trim().length >= 8) searchByBarcode(search.trim());
            }}
            autoFocus={isDesktop()}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute left-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
              aria-label="مسح البحث"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setRecentOpen(true)}
          className="btn-secondary h-11 shrink-0 whitespace-nowrap px-3 sm:h-12 sm:px-4"
          aria-label="آخر الطلبات"
        >
          <Clock size={18} />
          <span className="hidden sm:inline">آخر الطلبات</span>
        </button>
        <div className="hidden whitespace-nowrap text-sm text-gray-500 lg:block">
          {itemCount > 0 ? `${itemCount} قطعة في السلة` : 'السلة فارغة'}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-12">
        <ProductSelector
          isSearching={isSearching}
          list={activeList}
          pickingId={pickingId}
          onSelectProduct={handleSelectProduct}
          cartQtyByProduct={cartQtyByProduct}
        />

        {sheetOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] lg:hidden"
            onClick={() => setSheetOpen(false)}
            aria-hidden
          />
        )}
        <aside
          aria-label="السلة والدفع"
          className={`card fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col overflow-hidden rounded-b-none rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out lg:static lg:z-auto lg:col-span-4 lg:max-h-none lg:min-h-0 lg:translate-y-0 lg:rounded-2xl lg:shadow-sm ${
            sheetOpen ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="relative shrink-0 border-b px-4 pb-2.5 pt-3 dark:border-gray-700 lg:py-3">
            <span className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-gray-300 dark:bg-gray-600 lg:hidden" aria-hidden />
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">
                السلة
                {itemCount > 0 && <span className="mr-1.5 text-sm font-normal text-gray-500">({itemCount} قطعة)</span>}
              </h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 lg:hidden"
                aria-label="إغلاق السلة"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3 sm:p-4">
            <CartTable cart={cart} onUpdateQty={updateQty} onRemove={removeFromCart} />
            <div className="border-t pt-4 dark:border-gray-700">
              <RecipientForm form={recipientForm} />
            </div>
          </div>

          <PaymentSection
            discount={discount}
            setDiscount={setDiscount}
            subtotal={subtotal}
            total={total}
            itemCount={itemCount}
            onSale={handleSale}
            isPending={saleMutation.isPending}
            cartEmpty={cart.length === 0}
          />
        </aside>
      </div>

      {!sheetOpen && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 px-3 pt-2.5 shadow-[0_-6px_20px_rgba(0,0,0,0.08)] backdrop-blur pb-[max(0.625rem,env(safe-area-inset-bottom))] dark:border-gray-700 dark:bg-gray-800/95 lg:hidden">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl bg-primary-600 px-3 py-2.5 text-white shadow-sm active:bg-primary-700"
            aria-label={`فتح السلة والدفع — ${itemCount} قطعة`}
          >
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <ShoppingCart size={20} />
              {itemCount > 0 && (
                <span
                  key={itemCount}
                  className="absolute -left-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-secondary-400 px-1 text-[11px] font-bold text-primary-900 animate-[karam-pop_300ms_ease-out]"
                >
                  {itemCount}
                </span>
              )}
            </span>
            <span className="flex-1 text-start">
              <span className="block text-sm font-bold">{itemCount ? 'السلة والدفع' : 'السلة فارغة'}</span>
              <span className="block text-[11px] text-white/75">
                {recipientForm.phoneValid ? `المستلم: ${recipientForm.recipient.name || recipientForm.recipient.phone}` : 'أضف بيانات المستلم'}
              </span>
            </span>
            <span className="text-lg font-bold tabular-nums text-secondary-400">{formatPrice(total)}</span>
            <ChevronUp size={18} className="opacity-80" />
          </button>
        </div>
      )}

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

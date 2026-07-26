import { useEffect, useMemo, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Minus, Trash2, CreditCard, Package, X } from 'lucide-react';
import { notifySuccess, notifyError } from '../../utils/notify';
import api from '../../api/axios';
import { formatPrice } from '../../utils/constants';
import { LoadingSpinner, Modal } from '../../components/ui';

function getCartKey(item) {
  return item.variant_id ? `${item.product_id}-${item.variant_id}` : `${item.product_id}`;
}

function ProductThumb({ src, alt, className = '' }) {
  if (src) {
    return <img src={src} alt={alt} className={`object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400 ${className}`}>
      <Package size={28} />
    </div>
  );
}

function ProductTile({ product, onSelect, loading }) {
  const stock = product.total_stock ?? 0;
  const outOfStock = stock <= 0;

  return (
    <button
      type="button"
      disabled={outOfStock || loading}
      onClick={() => onSelect(product)}
      className={`group text-right rounded-xl border overflow-hidden transition bg-white dark:bg-gray-800 ${
        outOfStock
          ? 'opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-700'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary-400 hover:shadow-md active:scale-[0.98]'
      }`}
    >
      <div className="aspect-square relative overflow-hidden bg-gray-50 dark:bg-gray-700">
        <ProductThumb
          src={product.primary_image}
          alt={product.name_ar}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
        {loading && (
          <div className="absolute inset-0 bg-white/60 dark:bg-black/40 flex items-center justify-center">
            <div className="w-7 h-7 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        )}
        {outOfStock ? (
          <span className="absolute top-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-md bg-red-600 text-white">
            نفذ
          </span>
        ) : (
          <span className="absolute top-2 left-2 text-[11px] font-medium px-2 py-0.5 rounded-md bg-black/60 text-white">
            {stock}
          </span>
        )}
      </div>
      <div className="p-2.5 space-y-1">
        <p className="text-sm font-medium line-clamp-2 min-h-[2.5rem] leading-snug">{product.name_ar}</p>
        <p className="text-primary-600 font-bold text-sm">{formatPrice(product.price)}</p>
      </div>
    </button>
  );
}

function VariantPickerModal({ product, open, onClose, onConfirm }) {
  const variants = product?.variants || [];
  const [selectedColorId, setSelectedColorId] = useState(null);
  const [selectedSizeId, setSelectedSizeId] = useState(null);

  const uniqueColors = useMemo(
    () => [...new Map(
      variants.filter((v) => v.color_id).map((v) => [v.color_id, {
        id: v.color_id,
        name: v.color_name,
        hex: v.hex_code,
      }])
    ).values()],
    [variants]
  );

  const uniqueSizes = useMemo(
    () => [...new Map(
      variants.filter((v) => v.size_id).map((v) => [v.size_id, {
        id: v.size_id,
        name: v.size_name,
      }])
    ).values()],
    [variants]
  );

  const availableSizes = useMemo(() => {
    if (!selectedColorId) return uniqueSizes;
    const sizeIds = new Set(
      variants.filter((v) => v.color_id === selectedColorId).map((v) => v.size_id).filter(Boolean)
    );
    return uniqueSizes.filter((s) => sizeIds.has(s.id));
  }, [selectedColorId, uniqueSizes, variants]);

  const availableColors = useMemo(() => {
    if (!selectedSizeId) return uniqueColors;
    const colorIds = new Set(
      variants.filter((v) => v.size_id === selectedSizeId).map((v) => v.color_id).filter(Boolean)
    );
    return uniqueColors.filter((c) => colorIds.has(c.id));
  }, [selectedSizeId, uniqueColors, variants]);

  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;

    return variants.find((v) => {
      const colorOk = !uniqueColors.length || v.color_id === selectedColorId;
      const sizeOk = !uniqueSizes.length || v.size_id === selectedSizeId;
      return colorOk && sizeOk;
    }) || null;
  }, [variants, selectedColorId, selectedSizeId, uniqueColors.length, uniqueSizes.length]);

  const displayImage = selectedVariant?.image
    || product?.images?.find((i) => i.is_primary)?.url
    || product?.images?.[0]?.url
    || product?.primary_image;

  const stock = selectedVariant?.stock ?? 0;
  const price = selectedVariant?.price ?? product?.price;
  const canAdd = Boolean(selectedVariant) && stock > 0;

  const handleColor = (colorId) => {
    setSelectedColorId(colorId);
    if (selectedSizeId) {
      const match = variants.find((v) => v.color_id === colorId && v.size_id === selectedSizeId);
      if (!match) setSelectedSizeId(null);
    }
  };

  const handleSize = (sizeId) => {
    setSelectedSizeId(sizeId);
    if (selectedColorId) {
      const match = variants.find((v) => v.size_id === sizeId && v.color_id === selectedColorId);
      if (!match) setSelectedColorId(null);
    }
  };

  const pickVariantDirect = (variant) => {
    setSelectedColorId(variant.color_id || null);
    setSelectedSizeId(variant.size_id || null);
  };

  const handleConfirm = () => {
    if (!selectedVariant) {
      notifyError({ message: 'يرجى اختيار اللون والمقاس' });
      return;
    }
    if (stock <= 0) {
      notifyError({ message: 'هذا المتغير غير متوفر' });
      return;
    }
    onConfirm(selectedVariant);
  };

  useEffect(() => {
    if (open) {
      setSelectedColorId(null);
      setSelectedSizeId(null);
    }
  }, [open, product?.id]);

  if (!product) return null;

  return (
    <Modal open={open} onClose={onClose} title="اختر المتغير" size="lg">
      <div className="grid sm:grid-cols-[140px_1fr] gap-4">
        <ProductThumb
          src={displayImage}
          alt={product.name_ar}
          className="w-full aspect-square rounded-xl"
        />
        <div>
          <h3 className="font-bold text-lg mb-1">{product.name_ar}</h3>
          <p className="text-primary-600 font-bold text-xl mb-4">{formatPrice(price)}</p>

          {uniqueColors.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">اللون</p>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleColor(c.id)}
                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                      selectedColorId === c.id
                        ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                    }`}
                  >
                    {c.hex && (
                      <span
                        className="w-4 h-4 rounded-full border border-black/10"
                        style={{ backgroundColor: c.hex }}
                      />
                    )}
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {uniqueSizes.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium mb-2">المقاس</p>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSize(s.id)}
                    className={`min-w-[3rem] px-3 py-2 rounded-lg border text-sm transition ${
                      selectedSizeId === s.id
                        ? 'border-primary-600 bg-primary-50 text-primary-700 dark:bg-primary-900/30'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <p className="text-sm mb-4">
            المخزون:{' '}
            {!selectedVariant ? (
              <span className="text-gray-500">اختر اللون والمقاس</span>
            ) : stock > 0 ? (
              <span className="text-green-600 font-medium">{stock} متوفر</span>
            ) : (
              <span className="text-red-600 font-medium">نفذ</span>
            )}
          </p>
        </div>
      </div>

      {variants.length > 0 && (
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <p className="text-sm font-medium mb-2">اختيار سريع</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-auto">
            {variants.map((v) => {
              const label = [v.color_name, v.size_name].filter(Boolean).join(' · ') || `متغير #${v.id}`;
              const active = selectedVariant?.id === v.id;
              const empty = (v.stock ?? 0) <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={empty}
                  onClick={() => pickVariantDirect(v)}
                  className={`text-right px-3 py-2 rounded-lg border text-sm transition ${
                    empty
                      ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700'
                      : active
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-400'
                  }`}
                >
                  <span className="font-medium">{label}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    {formatPrice(v.price || product.price)} · {empty ? 'نفذ' : `${v.stock} متوفر`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-6">
        <button type="button" onClick={onClose} className="btn-outline flex-1">
          إلغاء
        </button>
        <button type="button" onClick={handleConfirm} disabled={!canAdd} className="btn-primary flex-1">
          إضافة للسلة
        </button>
      </div>
    </Modal>
  );
}

export default function POSPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickingId, setPickingId] = useState(null);
  const [variantProduct, setVariantProduct] = useState(null);
  const searchRef = useRef(null);

  const isSearching = search.trim().length >= 2;

  const { data: readyProducts, isLoading: readyLoading } = useQuery({
    queryKey: ['pos-ready-products'],
    queryFn: () => api.get('/products', { params: { admin: 'true', limit: 10 } }),
  });

  const { data: searchResults, isFetching: searchLoading } = useQuery({
    queryKey: ['pos-search', search],
    queryFn: () => api.get('/products', { params: { search: search.trim(), limit: 5, admin: 'true' } }),
    enabled: isSearching,
  });

  const saleMutation = useMutation({
    mutationFn: (data) => api.post('/pos/sale', data),
    onSuccess: (res) => {
      notifySuccess(res);
      setCart([]);
      setDiscount(0);
      setCustomerName('');
      setCustomerPhone('');
      setSearch('');
      queryClient.invalidateQueries(['pos-ready-products']);
      searchRef.current?.focus();
    },
    onError: notifyError,
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
      const res = await api.get(`/products/${product.id}`);
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
      const res = await api.get(`/products/barcode/${barcode}`);
      const p = res.data;

      // Barcode matched a specific variant — add directly
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

      // Product-level barcode — open variant picker if needed
      await handleSelectProduct(p);
    } catch {
      notifyError({ message: 'المنتج غير موجود' });
    }
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

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
        <div className="text-sm text-gray-500 whitespace-nowrap">
          {itemCount > 0 ? `${itemCount} قطعة في السلة` : 'السلة فارغة'}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-3 flex-1 min-h-0">
        <section className="lg:col-span-8 flex flex-col min-h-0 card overflow-hidden">
          <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between">
            <h2 className="font-semibold">
              {isSearching ? 'نتائج البحث' : 'منتجات جاهزة'}
            </h2>
            <span className="text-xs text-gray-500">
              {isSearching ? 'حتى 5 نتائج' : '10 منتجات'}
            </span>
          </div>

          <div className="flex-1 overflow-auto p-3">
            {listLoading ? (
              <LoadingSpinner />
            ) : displayProducts.length === 0 ? (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-gray-500 gap-2">
                <Package size={40} className="opacity-40" />
                <p>{isSearching ? 'لا توجد نتائج' : 'لا توجد منتجات'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {displayProducts.map((p) => (
                  <ProductTile
                    key={p.id}
                    product={p}
                    onSelect={handleSelectProduct}
                    loading={pickingId === p.id}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="lg:col-span-4 flex flex-col min-h-0 card overflow-hidden">
          <div className="px-4 py-3 border-b dark:border-gray-700">
            <h2 className="font-semibold">السلة</h2>
          </div>

          <div className="flex-1 overflow-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-gray-500 gap-2 text-sm">
                <Package size={32} className="opacity-40" />
                <p>اضغط على منتج لإضافته</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={getCartKey(item)}
                  className="flex gap-3 p-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40"
                >
                  <ProductThumb
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-14 rounded-lg shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.variant_info && (
                          <p className="text-xs text-primary-600 font-medium">{item.variant_info}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatPrice(item.price)} · متوفر {item.stock}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item)}
                        className="text-red-500 p-1 shrink-0 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        aria-label="حذف"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="inline-flex items-center gap-1 rounded-lg border dark:border-gray-600 bg-white dark:bg-gray-800">
                        <button type="button" onClick={() => updateQty(item, -1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-r-lg">
                          <Minus size={14} />
                        </button>
                        <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                        <button type="button" onClick={() => updateQty(item, 1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-l-lg">
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-primary-600">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

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
              onClick={handleSale}
              disabled={saleMutation.isPending || cart.length === 0}
              className="btn-primary w-full py-3.5 text-base"
            >
              <CreditCard size={20} />
              {saleMutation.isPending ? 'جاري الدفع...' : 'دفع نقداً'}
            </button>
          </div>
        </aside>
      </div>

      <VariantPickerModal
        product={variantProduct}
        open={Boolean(variantProduct)}
        onClose={() => setVariantProduct(null)}
        onConfirm={confirmVariant}
      />
    </div>
  );
}

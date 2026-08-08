import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Minus, Plus, Link2, Check, Zap } from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner } from '@shared/ui';
import { ProductImageGallery } from '@modules/store/components/ProductImageGallery';
import { StoreProductSection } from '@modules/store/components/StoreProductCard';
import { useCart } from '@modules/store/context/CartContext';
import { formatPrice } from '@core/constants';
import { startBuyNow } from '@modules/store/utils/buyNow';
import {
  decodeProductSlug,
  productAbsoluteUrl,
  productPath,
} from '@modules/store/utils/productPaths';

const PICKS_LIMIT = 8;

/**
 * Featured picks first; if few results, fill with same-category products.
 * Always excludes the current product.
 */
async function fetchPicksForYou(product) {
  const excludeId = String(product.id);
  const seen = new Set([excludeId]);
  const picks = [];

  const pushAll = (list = []) => {
    for (const p of list) {
      if (!p?.id) continue;
      const id = String(p.id);
      if (seen.has(id)) continue;
      seen.add(id);
      picks.push(p);
      if (picks.length >= PICKS_LIMIT) break;
    }
  };

  const featuredRes = await storeApi.products({
    featured: 'true',
    limit: PICKS_LIMIT + 4,
    page: 1,
  });
  pushAll(featuredRes?.data || []);

  if (picks.length < PICKS_LIMIT && product.category_id) {
    const catRes = await storeApi.products({
      category: product.category_id,
      limit: PICKS_LIMIT + 4,
      page: 1,
    });
    pushAll(catRes?.data || []);
  }

  if (picks.length < PICKS_LIMIT) {
    const latestRes = await storeApi.products({
      limit: PICKS_LIMIT + 4,
      page: 1,
      sortBy: 'created_at',
      sortOrder: 'DESC',
    });
    pushAll(latestRes?.data || []);
  }

  return picks.slice(0, PICKS_LIMIT);
}

export default function ProductDetailPage() {
  const { slug: slugParam } = useParams();
  const slug = decodeProductSlug(slugParam);
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [linkCopied, setLinkCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => storeApi.productBySlug(slug),
    enabled: Boolean(slug),
  });

  const product = data?.data;

  const { data: picks = [] } = useQuery({
    queryKey: ['picks-for-you', product?.id, product?.category_id],
    queryFn: () => fetchPicksForYou(product),
    enabled: Boolean(product?.id),
    staleTime: 60_000,
  });

  // Canonical clean URL: /product/human-slug (rewrites old numeric ids)
  useEffect(() => {
    if (!product?.slug) return;
    if (product.slug !== slug) {
      navigate(productPath(product), { replace: true });
    }
  }, [product, slug, navigate]);

  useEffect(() => {
    setSelectedVariant(null);
    setQuantity(1);
    setLinkCopied(false);
  }, [slug]);

  const handleVariantImageSelect = useCallback(
    (slide) => {
      if (!product || !slide?.variant_id) return;
      const variant =
        product.variants?.find((v) => v.id === slide.variant_id) ||
        product.variants?.find((v) => v.color_id && v.color_id === slide.color_id);
      if (variant) setSelectedVariant(variant);
    },
    [product]
  );

  const handleCopyLink = async () => {
    const url = productAbsoluteUrl(product || slug);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setLinkCopied(true);
      notifySuccess({ message: 'تم نسخ رابط المنتج' });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      notifyError({ message: 'تعذر نسخ الرابط' });
    }
  };

  if (isLoading) {
    return (
      <StoreLayout>
        <LoadingSpinner />
      </StoreLayout>
    );
  }
  if (!product) {
    return (
      <StoreLayout>
        <div className="text-center py-20">المنتج غير موجود</div>
      </StoreLayout>
    );
  }

  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  const currentPrice = selectedVariant?.price || product.price;
  const currentStock = selectedVariant?.stock ?? product.total_stock;

  const ensureVariant = () => {
    if (hasVariants && !selectedVariant) {
      notifyError({ message: 'يرجى اختيار اللون والمقاس' });
      return false;
    }
    if (currentStock <= 0) {
      notifyError({ message: 'المنتج غير متوفر' });
      return false;
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!ensureVariant()) return;
    const result = addItem(product, selectedVariant, quantity);
    if (!result?.ok) {
      notifyError({ message: result?.message });
      return;
    }
    notifySuccess({ message: result?.message || 'تمت الإضافة للسلة' });
  };

  const handleOrderNow = () => {
    if (!ensureVariant()) return;
    const result = startBuyNow(product, selectedVariant, quantity);
    if (!result?.ok) {
      notifyError({ message: result?.message });
      return;
    }
    navigate('/checkout?mode=buy-now');
  };

  const selectColor = (colorId) => {
    const variant =
      variants.find(
        (v) =>
          v.color_id === colorId &&
          (!selectedVariant?.size_id || v.size_id === selectedVariant.size_id)
      ) || variants.find((v) => v.color_id === colorId);
    setSelectedVariant(variant || null);
  };

  const selectSize = (sizeId) => {
    const variant =
      variants.find(
        (v) =>
          v.size_id === sizeId &&
          (!selectedVariant?.color_id || v.color_id === selectedVariant.color_id)
      ) || variants.find((v) => v.size_id === sizeId);
    setSelectedVariant(variant || null);
  };

  const uniqueColors = [
    ...new Map(
      variants
        .filter((v) => v.color_id)
        .map((v) => [
          v.color_id,
          { id: v.color_id, name: v.color_name, hex: v.hex_code },
        ])
    ).values(),
  ];
  const uniqueSizes = [
    ...new Map(
      variants
        .filter((v) => v.size_id)
        .map((v) => [v.size_id, { id: v.size_id, name: v.size_name }])
    ).values(),
  ];

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <ProductImageGallery
            product={product}
            selectedVariant={selectedVariant}
            onVariantImageSelect={handleVariantImageSelect}
          />

          <div>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold flex-1">{product.name_ar}</h1>
              <button
                type="button"
                onClick={handleCopyLink}
                className="btn-outline shrink-0 text-sm rounded-full inline-flex items-center gap-1.5"
                title="نسخ رابط المنتج"
              >
                {linkCopied ? <Check size={16} className="text-primary-600" /> : <Link2 size={16} />}
                {linkCopied ? 'تم النسخ' : 'نسخ الرابط'}
              </button>
            </div>

            {product.category_name && (
              <p className="text-gray-500 mb-4">{product.category_name}</p>
            )}

            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-primary-600">
                {formatPrice(currentPrice)}
              </span>
              {product.compare_price &&
                parseFloat(product.compare_price) > parseFloat(currentPrice) && (
                  <span className="text-xl text-gray-400 line-through">
                    {formatPrice(product.compare_price)}
                  </span>
                )}
            </div>

            {product.description && (
              <div className="mb-6">
                <h3 className="font-bold mb-2">الوصف</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {uniqueColors.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold mb-2">اللون</h3>
                <div className="flex gap-2 flex-wrap">
                  {uniqueColors.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => selectColor(c.id)}
                      className={`px-4 py-2 rounded-lg border inline-flex items-center gap-2 ${
                        selectedVariant?.color_id === c.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-300'
                      }`}
                    >
                      {c.hex && (
                        <span
                          className="inline-block w-4 h-4 rounded-full border border-black/10"
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
                <h3 className="font-bold mb-2">المقاس</h3>
                <div className="flex gap-2 flex-wrap">
                  {uniqueSizes.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectSize(s.id)}
                      className={`px-4 py-2 rounded-lg border ${
                        selectedVariant?.size_id === s.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-300'
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm mb-4">
              الحالة:{' '}
              {currentStock > 0 ? (
                <span className="text-green-600 font-medium">متوفر</span>
              ) : (
                <span className="text-red-600 font-medium">غير متوفر</span>
              )}
            </p>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border rounded-lg">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 hover:bg-gray-100"
                >
                  <Minus size={18} />
                </button>
                <span className="px-4 font-medium">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                  className="p-3 hover:bg-gray-100"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleOrderNow}
                disabled={currentStock <= 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-secondary-400 hover:bg-secondary-500 text-ink-800 font-bold text-lg py-3.5 px-8 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                <Zap size={20} strokeWidth={2.25} />
                اطلب الآن
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={currentStock <= 0}
                className="btn-primary text-lg py-3.5 px-8 flex-1"
              >
                <ShoppingCart size={20} /> أضف للسلة
              </button>
            </div>
            <p className="mt-3 text-xs text-ink-400">
              «اطلب الآن» ينقلك مباشرة لإتمام الطلب لهذا المنتج فقط دون التأثير على محتويات السلة.
            </p>
          </div>
        </div>
      </div>

      {picks.length > 0 && (
        <div className="border-t border-ink-100 dark:border-gray-800 bg-tertiary-100/60 dark:bg-ink-900/40">
          <StoreProductSection
            title="عروض اخترنا لك"
            to="/products?featured=true"
            linkLabel="عرض الكل"
            products={picks}
            badge="اخترنا لك"
            limit={PICKS_LIMIT}
            className="!py-10 sm:!py-12"
          />
        </div>
      )}
    </StoreLayout>
  );
}

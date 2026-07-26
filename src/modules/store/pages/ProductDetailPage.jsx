import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Minus, Plus } from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { storeApi } from '@modules/store/api/store.api';
import StoreLayout from '@shared/layouts/StoreLayout';
import { LoadingSpinner } from '@shared/ui';
import { useCart } from '@modules/store/context/CartContext';
import { formatPrice } from '@core/constants';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => storeApi.productBySlug(slug),
  });

  const product = data?.data;

  if (isLoading) return <StoreLayout><LoadingSpinner /></StoreLayout>;
  if (!product) return <StoreLayout><div className="text-center py-20">المنتج غير موجود</div></StoreLayout>;

  const variants = product.variants || [];
  const hasVariants = variants.length > 0;
  const currentPrice = selectedVariant?.price || product.price;
  const currentStock = selectedVariant?.stock ?? product.total_stock;

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) {
      notifyError({ message: 'يرجى اختيار اللون والمقاس' });
      return;
    }
    if (currentStock <= 0) {
      notifyError({ message: 'المنتج غير متوفر' });
      return;
    }
    const result = addItem(product, selectedVariant, quantity);
    if (!result?.ok) {
      notifyError({ message: result?.message });
      return;
    }
    notifySuccess({ message: result?.message || 'تمت الإضافة للسلة' });
  };

  const selectColor = (colorId) => {
    const variant = variants.find((v) => v.color_id === colorId && (!selectedVariant?.size_id || v.size_id === selectedVariant.size_id))
      || variants.find((v) => v.color_id === colorId);
    setSelectedVariant(variant || null);
  };

  const selectSize = (sizeId) => {
    const variant = variants.find((v) => v.size_id === sizeId && (!selectedVariant?.color_id || v.color_id === selectedVariant.color_id))
      || variants.find((v) => v.size_id === sizeId);
    setSelectedVariant(variant || null);
  };

  const displayImage = selectedVariant?.image
    || product.images?.[selectedImage]?.url
    || product.images?.[0]?.url;

  const uniqueColors = [...new Map(variants.filter((v) => v.color_id).map((v) => [v.color_id, { id: v.color_id, name: v.color_name, hex: v.hex_code }])).values()];
  const uniqueSizes = [...new Map(variants.filter((v) => v.size_id).map((v) => [v.size_id, { id: v.size_id, name: v.size_name }])).values()];

  return (
    <StoreLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Images */}
          <div>
            <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-4">
              {displayImage ? (
                <img src={displayImage} alt={product.name_ar} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">لا توجد صورة</div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)} className={`w-20 h-20 rounded-lg overflow-hidden border-2 ${selectedImage === i ? 'border-primary-600' : 'border-transparent'}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name_ar}</h1>
            {product.category_name && <p className="text-gray-500 mb-4">{product.category_name}</p>}

            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl font-bold text-primary-600">{formatPrice(currentPrice)}</span>
              {product.compare_price && parseFloat(product.compare_price) > parseFloat(currentPrice) && (
                <span className="text-xl text-gray-400 line-through">{formatPrice(product.compare_price)}</span>
              )}
            </div>

            {product.description && (
              <div className="mb-6">
                <h3 className="font-bold mb-2">الوصف</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{product.description}</p>
              </div>
            )}

            {uniqueColors.length > 0 && (
              <div className="mb-4">
                <h3 className="font-bold mb-2">اللون</h3>
                <div className="flex gap-2 flex-wrap">
                  {uniqueColors.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectColor(c.id)}
                      className={`px-4 py-2 rounded-lg border ${selectedVariant?.color_id === c.id ? 'border-primary-600 bg-primary-50' : 'border-gray-300'}`}
                    >
                      {c.hex && <span className="inline-block w-4 h-4 rounded-full mr-2" style={{ backgroundColor: c.hex }} />}
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
                      onClick={() => selectSize(s.id)}
                      className={`px-4 py-2 rounded-lg border ${selectedVariant?.size_id === s.id ? 'border-primary-600 bg-primary-50' : 'border-gray-300'}`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm mb-4">
              المخزون: {currentStock > 0 ? (
                <span className="text-green-600">{currentStock} متوفر</span>
              ) : (
                <span className="text-red-600">نفذ المخزون</span>
              )}
            </p>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border rounded-lg">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-gray-100"><Minus size={18} /></button>
                <span className="px-4 font-medium">{quantity}</span>
                <button onClick={() => setQuantity(Math.min(currentStock, quantity + 1))} className="p-3 hover:bg-gray-100"><Plus size={18} /></button>
              </div>
            </div>

            <button onClick={handleAddToCart} disabled={currentStock <= 0} className="btn-primary w-full md:w-auto text-lg py-3 px-8">
              <ShoppingCart size={20} /> أضف للسلة
            </button>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}

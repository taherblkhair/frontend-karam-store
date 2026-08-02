import { useEffect, useMemo, useState } from 'react';
import { notifyError } from '@shared/services/toast.service';
import { formatPrice } from '@core/constants';
import { Modal } from '@shared/ui';
import { ProductThumb } from './ProductThumb';

export function VariantPickerModal({ product, open, onClose, onConfirm }) {
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

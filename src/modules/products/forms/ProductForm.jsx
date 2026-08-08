import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy, X } from 'lucide-react';
import { ImageUpload } from '@shared/components/ImageUpload';
import { FieldError, FormAlert } from '@shared/ui';
import { notifyError, notifySuccess } from '@shared/services/toast.service';
import { productsApi } from '@modules/products/api/products.api';
import { productKeys } from '@modules/products/hooks/useProducts';

const emptyVariant = () => ({
  color_id: '',
  size_id: '',
  sku: '',
  barcode: '',
  price: '',
  stock: '',
  image: '',
});

const defaultForm = {
  name_ar: '',
  name_en: '',
  price: '',
  compare_price: '',
  cost_price: '',
  sku: '',
  barcode: '',
  description: '',
  category_id: '',
  brand_id: '',
  stock: '',
  status: 'active',
  is_featured: false,
  is_new: false,
  has_variants: false,
  images: [],
  variants: [emptyVariant()],
};

function isNegativeNumber(value) {
  if (value === '' || value === null || value === undefined) return false;
  const num = Number(value);
  return !Number.isNaN(num) && num < 0;
}

/** Small inline create form for lookup entities */
function InlineCreatePanel({ title, onClose, children }) {
  return (
    <div className="mt-2 rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/40 dark:bg-primary-900/10 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary-800 dark:text-primary-200">{title}</p>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/60" aria-label="إغلاق">
          <X size={16} />
        </button>
      </div>
      {children}
    </div>
  );
}

export function ProductForm({
  initial,
  categories,
  colors: colorsProp,
  sizes: sizesProp,
  brands: brandsProp,
  onSubmit,
  loading,
  getFieldError = () => '',
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(defaultForm);
  const [clientError, setClientError] = useState('');
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [brands, setBrands] = useState([]);

  const [showNewBrand, setShowNewBrand] = useState(false);
  const [colorCreateFor, setColorCreateFor] = useState(null); // variant index or null
  const [sizeCreateFor, setSizeCreateFor] = useState(null);
  const [creating, setCreating] = useState(false);

  const [newBrand, setNewBrand] = useState({ name_ar: '', name_en: '' });
  const [newColor, setNewColor] = useState({ name_ar: '', hex_code: '#000000' });
  const [newSize, setNewSize] = useState({ name: '' });

  // Which fields to copy from first variant → all
  const [applyFields, setApplyFields] = useState({
    stock: true,
    size_id: true,
    price: true,
  });

  useEffect(() => {
    setColors(Array.isArray(colorsProp) ? colorsProp : []);
  }, [colorsProp]);

  useEffect(() => {
    setSizes(Array.isArray(sizesProp) ? sizesProp : []);
  }, [sizesProp]);

  useEffect(() => {
    setBrands(Array.isArray(brandsProp) ? brandsProp : []);
  }, [brandsProp]);

  useEffect(() => {
    if (initial) {
      setForm({
        name_ar: initial.name_ar || '',
        name_en: initial.name_en || '',
        price: initial.price || '',
        compare_price: initial.compare_price || '',
        cost_price: initial.cost_price || '',
        sku: initial.sku || '',
        barcode: initial.barcode || '',
        description: initial.description || '',
        category_id: initial.category_id || '',
        brand_id: initial.brand_id || '',
        stock: initial.total_stock ?? '',
        status: initial.status || 'active',
        is_featured: !!initial.is_featured,
        is_new: !!initial.is_new,
        has_variants: !!initial.has_variants,
        images: initial.images?.map((i) => i.url) || [],
        variants: initial.variants?.length
          ? initial.variants.map((v) => ({
              id: v.id,
              color_id: v.color_id || '',
              size_id: v.size_id || '',
              sku: v.sku || '',
              barcode: v.barcode || '',
              price: v.price || '',
              stock: v.stock ?? '',
              image: v.image || '',
            }))
          : [emptyVariant()],
      });
    } else {
      setForm(defaultForm);
    }
    setClientError('');
    setShowNewBrand(false);
    setColorCreateFor(null);
    setSizeCreateFor(null);
  }, [initial]);

  const updateVariant = (index, field, value) => {
    const variants = [...form.variants];
    variants[index] = { ...variants[index], [field]: value };
    setForm({ ...form, variants });
  };

  const applyFirstVariantToAll = () => {
    if (!form.variants.length) return;
    const first = form.variants[0];
    const variants = form.variants.map((v, i) => {
      if (i === 0) return v;
      const next = { ...v };
      if (applyFields.stock) next.stock = first.stock;
      if (applyFields.size_id) next.size_id = first.size_id;
      if (applyFields.price) next.price = first.price;
      return next;
    });
    setForm({ ...form, variants });
    notifySuccess({ message: 'تم تطبيق بيانات المتغير الأول على الباقي' });
  };

  const createBrand = async () => {
    if (!newBrand.name_ar.trim()) {
      return notifyError({ message: 'أدخل اسم العلامة التجارية' });
    }
    setCreating(true);
    try {
      const res = await productsApi.createBrand({
        name_ar: newBrand.name_ar.trim(),
        name_en: newBrand.name_en.trim() || undefined,
      });
      const brand = res.data;
      setBrands((prev) => {
        if (prev.some((b) => b.id === brand.id)) return prev;
        return [...prev, brand].sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'));
      });
      setForm((f) => ({ ...f, brand_id: String(brand.id) }));
      setNewBrand({ name_ar: '', name_en: '' });
      setShowNewBrand(false);
      queryClient.invalidateQueries({ queryKey: productKeys.meta.brands });
      notifySuccess(res);
    } catch (err) {
      notifyError(err);
    } finally {
      setCreating(false);
    }
  };

  const createColor = async () => {
    if (!newColor.name_ar.trim()) {
      return notifyError({ message: 'أدخل اسم اللون' });
    }
    setCreating(true);
    try {
      const res = await productsApi.createColor({
        name_ar: newColor.name_ar.trim(),
        hex_code: newColor.hex_code || undefined,
      });
      const color = res.data;
      setColors((prev) => {
        if (prev.some((c) => c.id === color.id)) return prev;
        return [...prev, color].sort((a, b) => a.name_ar.localeCompare(b.name_ar, 'ar'));
      });
      if (colorCreateFor != null) {
        const index = colorCreateFor;
        setForm((f) => {
          const variants = [...f.variants];
          if (!variants[index]) return f;
          variants[index] = { ...variants[index], color_id: String(color.id) };
          return { ...f, variants };
        });
      }
      setNewColor({ name_ar: '', hex_code: '#000000' });
      setColorCreateFor(null);
      queryClient.invalidateQueries({ queryKey: productKeys.meta.colors });
      notifySuccess(res);
    } catch (err) {
      notifyError(err);
    } finally {
      setCreating(false);
    }
  };

  const createSize = async () => {
    if (!newSize.name.trim()) {
      return notifyError({ message: 'أدخل اسم المقاس' });
    }
    setCreating(true);
    try {
      const res = await productsApi.createSize({ name: newSize.name.trim() });
      const size = res.data;
      setSizes((prev) => {
        if (prev.some((s) => s.id === size.id)) return prev;
        return [...prev, size];
      });
      if (sizeCreateFor != null) {
        const index = sizeCreateFor;
        setForm((f) => {
          const variants = [...f.variants];
          if (!variants[index]) return f;
          variants[index] = { ...variants[index], size_id: String(size.id) };
          return { ...f, variants };
        });
      }
      setNewSize({ name: '' });
      setSizeCreateFor(null);
      queryClient.invalidateQueries({ queryKey: productKeys.meta.sizes });
      notifySuccess(res);
    } catch (err) {
      notifyError(err);
    } finally {
      setCreating(false);
    }
  };

  const validateNonNegative = () => {
    if (isNegativeNumber(form.price)) return 'السعر لا يمكن أن يكون سالباً';
    if (isNegativeNumber(form.compare_price)) return 'سعر قبل الخصم لا يمكن أن يكون سالباً';
    if (isNegativeNumber(form.cost_price)) return 'سعر التكلفة لا يمكن أن يكون سالباً';
    if (!form.has_variants && isNegativeNumber(form.stock)) return 'الكمية لا يمكن أن تكون سالبة';

    if (form.has_variants) {
      for (const v of form.variants) {
        if (isNegativeNumber(v.stock)) return 'كمية المتغير لا يمكن أن تكون سالبة';
        if (isNegativeNumber(v.price)) return 'سعر المتغير لا يمكن أن يكون سالباً';
      }
    }
    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const error = validateNonNegative();
    if (error) {
      setClientError(error);
      notifyError({ message: error });
      return;
    }
    setClientError('');

    const payload = {
      name_ar: form.name_ar,
      name_en: form.name_en || null,
      price: parseFloat(form.price),
      compare_price: form.compare_price !== '' ? parseFloat(form.compare_price) : null,
      cost_price: form.cost_price !== '' ? parseFloat(form.cost_price) : 0,
      sku: form.sku || null,
      barcode: form.barcode || null,
      description: form.description || null,
      category_id: form.category_id ? parseInt(form.category_id, 10) : null,
      brand_id: form.brand_id ? parseInt(form.brand_id, 10) : null,
      status: form.status,
      is_featured: form.is_featured,
      is_new: form.is_new,
      has_variants: form.has_variants,
      images: form.images.map((url, i) => ({ url, is_primary: i === 0 })),
    };

    if (form.has_variants) {
      payload.variants = form.variants
        .filter((v) => v.color_id || v.size_id || v.stock !== '')
        .map((v) => ({
          id: v.id,
          color_id: v.color_id ? parseInt(v.color_id, 10) : null,
          size_id: v.size_id ? parseInt(v.size_id, 10) : null,
          sku: v.sku || null,
          barcode: v.barcode || null,
          price: v.price !== '' ? parseFloat(v.price) : parseFloat(form.price),
          stock: v.stock !== '' ? parseInt(v.stock, 10) : 0,
          image: v.image || null,
        }));
    } else {
      payload.stock = form.stock !== '' ? parseInt(form.stock, 10) : 0;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 px-0.5">
      <FormAlert message={clientError} />

      <input
        className="input"
        placeholder="اسم المنتج *"
        required
        value={form.name_ar}
        onChange={(e) => setForm({ ...form, name_ar: e.target.value })}
      />
      <FieldError message={getFieldError('name_ar')} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="السعر *"
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
          <FieldError message={getFieldError('price')} />
        </div>
        <div>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="سعر قبل الخصم"
            value={form.compare_price}
            onChange={(e) => setForm({ ...form, compare_price: e.target.value })}
          />
          <FieldError message={getFieldError('compare_price')} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <input
            className="input"
            placeholder="SKU"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
          <FieldError message={getFieldError('sku')} />
        </div>
        <input
          className="input"
          placeholder="Barcode"
          value={form.barcode}
          onChange={(e) => setForm({ ...form, barcode: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <select
            className="input"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          >
            <option value="">الفئة</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_ar}
              </option>
            ))}
          </select>
          <FieldError message={getFieldError('category_id')} />
        </div>

        <div>
          <div className="flex gap-2">
            <select
              className="input flex-1"
              value={form.brand_id}
              onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
            >
              <option value="">العلامة التجارية (اختياري)</option>
              {brands?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name_ar}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-outline shrink-0 px-3"
              title="إضافة علامة تجارية"
              onClick={() => setShowNewBrand((v) => !v)}
            >
              <Plus size={16} />
            </button>
          </div>
          {showNewBrand && (
            <InlineCreatePanel title="إضافة علامة تجارية" onClose={() => setShowNewBrand(false)}>
              <input
                className="input text-sm"
                placeholder="اسم العلامة *"
                value={newBrand.name_ar}
                onChange={(e) => setNewBrand({ ...newBrand, name_ar: e.target.value })}
              />
              <input
                className="input text-sm"
                placeholder="الاسم بالإنجليزية (اختياري)"
                value={newBrand.name_en}
                onChange={(e) => setNewBrand({ ...newBrand, name_en: e.target.value })}
              />
              <button
                type="button"
                className="btn-primary text-sm w-full"
                disabled={creating}
                onClick={createBrand}
              >
                {creating ? 'جاري الإضافة...' : 'حفظ العلامة واختيارها'}
              </button>
            </InlineCreatePanel>
          )}
          <FieldError message={getFieldError('brand_id')} />
        </div>
      </div>

      <textarea
        className="input"
        placeholder="الوصف"
        rows={3}
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />

      <ImageUpload
        label="صور المنتج"
        multiple
        value={form.images}
        onChange={(images) => setForm({ ...form, images })}
      />

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_featured}
            onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
          />{' '}
          مميز
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_new}
            onChange={(e) => setForm({ ...form, is_new: e.target.checked })}
          />{' '}
          جديد
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.has_variants}
            onChange={(e) => setForm({ ...form, has_variants: e.target.checked })}
          />{' '}
          له متغيرات
        </label>
      </div>

      <select
        className="input"
        value={form.status}
        onChange={(e) => setForm({ ...form, status: e.target.value })}
      >
        <option value="active">نشط</option>
        <option value="draft">مسودة</option>
        <option value="archived">مؤرشف</option>
      </select>

      {!form.has_variants ? (
        <div>
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            placeholder="المخزون"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
          />
          <FieldError message={getFieldError('stock')} />
        </div>
      ) : (
        <div className="space-y-4 border rounded-lg p-3 sm:p-4 dark:border-gray-600">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-bold">المتغيرات (لون / مقاس / صورة)</h3>
            <button
              type="button"
              onClick={() => setForm({ ...form, variants: [...form.variants, emptyVariant()] })}
              className="btn-outline text-sm py-1.5"
            >
              <Plus size={14} /> إضافة متغير
            </button>
          </div>

          {/* Apply first variant template */}
          {form.variants.length > 1 && (
            <div className="rounded-xl bg-tertiary-100 dark:bg-gray-800/80 border border-ink-100 dark:border-gray-700 p-3 space-y-2">
              <p className="text-sm font-medium">
                تطبيق بيانات <span className="text-primary-600">المتغير الأول</span> على الباقي
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={applyFields.stock}
                    onChange={(e) => setApplyFields((f) => ({ ...f, stock: e.target.checked }))}
                  />
                  الكمية
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={applyFields.size_id}
                    onChange={(e) => setApplyFields((f) => ({ ...f, size_id: e.target.checked }))}
                  />
                  المقاس
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={applyFields.price}
                    onChange={(e) => setApplyFields((f) => ({ ...f, price: e.target.checked }))}
                  />
                  السعر
                </label>
              </div>
              <button
                type="button"
                onClick={applyFirstVariantToAll}
                className="btn-secondary text-sm py-1.5"
              >
                <Copy size={14} /> تطبيق على جميع المتغيرات
              </button>
              <p className="text-xs text-ink-400">
                بعد التطبيق يمكنك تعديل أي متغير على حدة.
              </p>
            </div>
          )}

          {form.variants.map((v, idx) => (
            <div
              key={v.id || idx}
              className="border rounded-lg p-3 dark:border-gray-700 space-y-3 bg-white dark:bg-gray-900/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-600">
                  متغير {idx + 1}
                  {idx === 0 ? (
                    <span className="ms-2 text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                      المرجع
                    </span>
                  ) : null}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="sm:col-span-2 space-y-1">
                  <div className="flex gap-2">
                    <select
                      className="input text-sm flex-1"
                      value={v.color_id}
                      onChange={(e) => updateVariant(idx, 'color_id', e.target.value)}
                    >
                      <option value="">اللون</option>
                      {colors?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name_ar}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-outline shrink-0 px-2.5 text-sm"
                      title="إضافة لون"
                      onClick={() => {
                        setColorCreateFor((cur) => (cur === idx ? null : idx));
                        setSizeCreateFor(null);
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  {colorCreateFor === idx && (
                    <InlineCreatePanel title="إضافة لون" onClose={() => setColorCreateFor(null)}>
                      <div className="flex gap-2">
                        <input
                          className="input text-sm flex-1"
                          placeholder="اسم اللون *"
                          value={newColor.name_ar}
                          onChange={(e) => setNewColor({ ...newColor, name_ar: e.target.value })}
                        />
                        <input
                          type="color"
                          className="h-10 w-12 rounded-lg border border-ink-200 cursor-pointer"
                          value={newColor.hex_code || '#000000'}
                          onChange={(e) => setNewColor({ ...newColor, hex_code: e.target.value })}
                          title="اللون"
                        />
                      </div>
                      <button
                        type="button"
                        className="btn-primary text-sm w-full"
                        disabled={creating}
                        onClick={createColor}
                      >
                        {creating ? 'جاري الإضافة...' : 'حفظ اللون واختياره'}
                      </button>
                    </InlineCreatePanel>
                  )}
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <div className="flex gap-2">
                    <select
                      className="input text-sm flex-1"
                      value={v.size_id}
                      onChange={(e) => updateVariant(idx, 'size_id', e.target.value)}
                    >
                      <option value="">المقاس</option>
                      {sizes?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-outline shrink-0 px-2.5 text-sm"
                      title="إضافة مقاس"
                      onClick={() => {
                        setSizeCreateFor((cur) => (cur === idx ? null : idx));
                        setColorCreateFor(null);
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  {sizeCreateFor === idx && (
                    <InlineCreatePanel title="إضافة مقاس" onClose={() => setSizeCreateFor(null)}>
                      <input
                        className="input text-sm"
                        placeholder="المقاس * (مثال: M أو 42)"
                        value={newSize.name}
                        onChange={(e) => setNewSize({ name: e.target.value })}
                      />
                      <button
                        type="button"
                        className="btn-primary text-sm w-full"
                        disabled={creating}
                        onClick={createSize}
                      >
                        {creating ? 'جاري الإضافة...' : 'حفظ المقاس واختياره'}
                      </button>
                    </InlineCreatePanel>
                  )}
                </div>

                <input
                  className="input text-sm"
                  placeholder="SKU"
                  value={v.sku}
                  onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                />
                <div>
                  <input
                    className="input text-sm"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="الكمية"
                    value={v.stock}
                    onChange={(e) => updateVariant(idx, 'stock', e.target.value)}
                  />
                  <FieldError message={getFieldError(`variants.${idx}.stock`)} />
                </div>
                <div className="sm:col-span-2">
                  <input
                    className="input text-sm"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="سعر المتغير (اختياري — الافتراضي سعر المنتج)"
                    value={v.price}
                    onChange={(e) => updateVariant(idx, 'price', e.target.value)}
                  />
                  <FieldError message={getFieldError(`variants.${idx}.price`)} />
                </div>
              </div>

              <ImageUpload
                label="صورة المتغير"
                value={v.image}
                onChange={(url) => updateVariant(idx, 'image', url)}
              />
              {form.variants.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      variants: form.variants.filter((_, i) => i !== idx),
                    })
                  }
                  className="text-red-500 text-sm flex items-center gap-1"
                >
                  <Trash2 size={14} /> حذف المتغير
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <button type="submit" disabled={loading} className="btn-primary w-full sticky bottom-0">
        {loading ? 'جاري الحفظ...' : 'حفظ المنتج'}
      </button>
    </form>
  );
}

export { defaultForm as emptyProductForm };

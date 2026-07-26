import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import { FieldError } from './ui';

const emptyVariant = () => ({
  color_id: '', size_id: '', sku: '', barcode: '', price: '', stock: '', image: '',
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

export function ProductForm({ initial, categories, colors, sizes, brands, onSubmit, loading, getFieldError = () => '' }) {
  const [form, setForm] = useState(defaultForm);

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
        stock: initial.total_stock || '',
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
              stock: v.stock || '',
              image: v.image || '',
            }))
          : [emptyVariant()],
      });
    } else {
      setForm(defaultForm);
    }
  }, [initial]);

  const updateVariant = (index, field, value) => {
    const variants = [...form.variants];
    variants[index] = { ...variants[index], [field]: value };
    setForm({ ...form, variants });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name_ar: form.name_ar,
      name_en: form.name_en || null,
      price: parseFloat(form.price),
      compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : 0,
      sku: form.sku || null,
      barcode: form.barcode || null,
      description: form.description || null,
      category_id: form.category_id ? parseInt(form.category_id) : null,
      brand_id: form.brand_id ? parseInt(form.brand_id) : null,
      status: form.status,
      is_featured: form.is_featured,
      is_new: form.is_new,
      has_variants: form.has_variants,
      images: form.images.map((url, i) => ({ url, is_primary: i === 0 })),
    };

    if (form.has_variants) {
      payload.variants = form.variants
        .filter((v) => v.color_id || v.size_id || v.stock)
        .map((v) => ({
          id: v.id,
          color_id: v.color_id ? parseInt(v.color_id) : null,
          size_id: v.size_id ? parseInt(v.size_id) : null,
          sku: v.sku || null,
          barcode: v.barcode || null,
          price: v.price ? parseFloat(v.price) : parseFloat(form.price),
          stock: parseInt(v.stock) || 0,
          image: v.image || null,
        }));
    } else {
      payload.stock = parseInt(form.stock) || 0;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-h-[70vh] overflow-y-auto px-1">
      <input className="input" placeholder="اسم المنتج *" required value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
      <FieldError message={getFieldError('name_ar')} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <input className="input" type="number" step="0.01" placeholder="السعر *" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
          <FieldError message={getFieldError('price')} />
        </div>
        <input className="input" type="number" step="0.01" placeholder="سعر قبل الخصم" value={form.compare_price} onChange={(e) => setForm({ ...form, compare_price: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <input className="input" placeholder="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          <FieldError message={getFieldError('sku')} />
        </div>
        <input className="input" placeholder="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <select className="input" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">الفئة</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
          </select>
          <FieldError message={getFieldError('category_id')} />
        </div>
        <div>
          <select className="input" value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}>
            <option value="">العلامة التجارية (اختياري)</option>
            {brands?.map((b) => <option key={b.id} value={b.id}>{b.name_ar}</option>)}
          </select>
          <FieldError message={getFieldError('brand_id')} />
        </div>
      </div>

      <textarea className="input" placeholder="الوصف" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

      <ImageUpload label="صور المنتج" multiple value={form.images} onChange={(images) => setForm({ ...form, images })} />

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> مميز</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_new} onChange={(e) => setForm({ ...form, is_new: e.target.checked })} /> جديد</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.has_variants} onChange={(e) => setForm({ ...form, has_variants: e.target.checked })} /> له متغيرات</label>
      </div>

      <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
        <option value="active">نشط</option>
        <option value="draft">مسودة</option>
        <option value="archived">مؤرشف</option>
      </select>

      {!form.has_variants ? (
        <input className="input" type="number" placeholder="المخzون" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
      ) : (
        <div className="space-y-4 border rounded-lg p-4 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">المتغيرات (لون / مقاس / صورة)</h3>
            <button type="button" onClick={() => setForm({ ...form, variants: [...form.variants, emptyVariant()] })} className="btn-outline text-sm py-1">
              <Plus size={14} /> إضافة
            </button>
          </div>
          {form.variants.map((v, idx) => (
            <div key={idx} className="border rounded-lg p-3 dark:border-gray-700 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <select className="input text-sm" value={v.color_id} onChange={(e) => updateVariant(idx, 'color_id', e.target.value)}>
                  <option value="">اللون</option>
                  {colors?.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
                </select>
                <select className="input text-sm" value={v.size_id} onChange={(e) => updateVariant(idx, 'size_id', e.target.value)}>
                  <option value="">المقاس</option>
                  {sizes?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input className="input text-sm" placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(idx, 'sku', e.target.value)} />
                <input className="input text-sm" type="number" placeholder="الكمية" value={v.stock} onChange={(e) => updateVariant(idx, 'stock', e.target.value)} />
                <input className="input text-sm" type="number" step="0.01" placeholder="سعر (اختياري)" value={v.price} onChange={(e) => updateVariant(idx, 'price', e.target.value)} />
              </div>
              <ImageUpload label="صورة المتغير" value={v.image} onChange={(url) => updateVariant(idx, 'image', url)} />
              {form.variants.length > 1 && (
                <button type="button" onClick={() => setForm({ ...form, variants: form.variants.filter((_, i) => i !== idx) })} className="text-red-500 text-sm flex items-center gap-1">
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

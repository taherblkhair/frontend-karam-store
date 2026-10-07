import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit } from 'lucide-react';
import { notifySuccess, notifyError } from '@shared/services/toast.service';
import { uploadFile } from '@shared/services/upload.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { useConfirm } from '@shared/hooks/useConfirm';
import { LoadingSpinner, Modal, FieldError, EmptyState } from '@shared/ui';
import { SearchInput } from '@shared/components/ListControls';
import { TableScroll } from '@shared/components/TableScroll';
import { BrandLogo } from '@shared/components/BrandLogo';
import { brandNames, filterBrands } from '@modules/store/components/BrandTile';
import { brandsApi } from '@modules/brands/api/brands.api';
import { BrandImageField } from '@modules/brands/components/BrandImageField';

const emptyBrand = { name_ar: '', name_en: '', logo: '', is_active: true, sort_order: 0 };

function StatusToggle({ brand, onToggle, busy }) {
  const active = Boolean(brand.is_active);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={busy}
      onClick={() => onToggle(brand)}
      title={active ? 'اضغط لإخفائه من المتجر' : 'اضغط لإظهاره في المتجر'}
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50 ${
        active
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
      }`}
    >
      <span className={`relative h-4 w-7 rounded-full transition ${active ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-500'}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${active ? 'start-3.5' : 'start-0.5'}`} />
      </span>
      {active ? 'متاح' : 'غير متاح'}
    </button>
  );
}

function BrandActions({ brand, onEdit, onDelete }) {
  return (
    <div className="flex gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onEdit(brand)}
        className="text-blue-500 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
        aria-label={`تعديل ${brand.name_ar}`}
      >
        <Edit size={16} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(brand)}
        className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
        aria-label={`حذف ${brand.name_ar}`}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function BrandName({ brand }) {
  const { primary, secondary } = brandNames(brand);
  return (
    <div className="min-w-0">
      <div className="font-medium truncate">{primary}</div>
      {secondary && <div className="text-xs text-gray-500 truncate">{secondary}</div>}
    </div>
  );
}

export default function BrandsPage() {
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyBrand);
  const [pendingFile, setPendingFile] = useState(null);
  const [imageError, setImageError] = useState('');
  const [nameError, setNameError] = useState('');
  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const { data, isLoading } = useQuery({
    queryKey: ['brands', 'admin'],
    queryFn: () => brandsApi.list(),
  });
  const brands = data?.data || [];
  const visible = useMemo(() => filterBrands(brands, search), [brands, search]);
  const activeCount = brands.filter((b) => b.is_active).length;

  const refresh = () => {
    // ['brands'] also refreshes the product form dropdown
    queryClient.invalidateQueries({ queryKey: ['brands'] });
    queryClient.invalidateQueries({ queryKey: ['store-brands'] });
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setPendingFile(null);
    setImageError('');
    setNameError('');
    clearErrors();
  };

  const openForm = (brand = null) => {
    setEditing(brand);
    setForm(
      brand
        ? {
            name_ar: brand.name_ar || '',
            name_en: brand.name_en || '',
            logo: brand.logo || '',
            is_active: Boolean(brand.is_active),
            sort_order: brand.sort_order || 0,
          }
        : emptyBrand
    );
    setPendingFile(null);
    setImageError('');
    setNameError('');
    clearErrors();
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async ({ id, values, file }) => {
      let logo = values.logo || '';
      if (file) {
        try {
          const res = await uploadFile(file);
          logo = res?.data?.url || '';
        } catch (err) {
          throw { ...err, isUploadError: true };
        }
        // Keep the uploaded URL so a retry after a save error doesn't upload again.
        setForm((f) => ({ ...f, logo }));
        setPendingFile(null);
      }
      return brandsApi.save({
        id,
        data: {
          name_ar: values.name_ar.trim(),
          name_en: values.name_en.trim(),
          logo,
          is_active: values.is_active,
          sort_order: Number(values.sort_order) || 0,
        },
      });
    },
    onSuccess: (res) => {
      refresh();
      closeModal();
      notifySuccess(res);
    },
    onError: (err) => {
      if (err?.isUploadError) {
        setImageError(`فشل رفع الصورة: ${err.message || 'حاول مرة أخرى'} — لم يتم حفظ البراند`);
      } else {
        applyApiError(err);
      }
      notifyError(err);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (brand) => brandsApi.update(brand.id, { is_active: !brand.is_active }),
    onSuccess: (res) => {
      refresh();
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const deleteMutation = useMutation({
    mutationFn: brandsApi.remove,
    onSuccess: (res) => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      notifySuccess(res);
    },
    onError: notifyError,
  });

  const handleDelete = async (brand) => {
    const { primary } = brandNames(brand);
    const count = brand.products_count || 0;
    const ok = await confirm({
      title: 'حذف البراند',
      message: count
        ? `هذا البراند «${primary}» مرتبط بـ ${count} منتج. هل أنت متأكد من حذفه؟ لن تُحذف المنتجات ولا صورها، لكنها ستصبح بدون براند. إذا أردت إخفاءه من المتجر فقط، استخدم «غير متاح» بدلاً من الحذف.`
        : `هل أنت متأكد من حذف البراند «${primary}»؟`,
      confirmText: count ? `حذف وإزالته من ${count} منتج` : 'حذف',
      variant: 'danger',
    });
    if (ok) deleteMutation.mutate(brand.id);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name_ar.trim()) {
      setNameError('اسم البراند مطلوب');
      document.getElementById('brand-name-ar')?.focus();
      return;
    }
    setImageError('');
    saveMutation.mutate({ id: editing?.id, values: form, file: pendingFile });
  };

  const saving = saveMutation.isPending;

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">البراندات</h1>
          {brands.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">
              {brands.length} براند · {activeCount} متاح في المتجر
            </p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث باسم البراند..." />
          <button type="button" onClick={() => openForm()} className="btn-primary w-full sm:w-auto">
            <Plus size={18} /> إضافة براند
          </button>
        </div>
      </div>

      <p className="card p-3 mb-4 text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        يظهر البراند في المتجر عندما يكون «متاحاً» ومرتبطاً بمنتج نشط واحد على الأقل. ترتيب الظهور: 1 أولاً، ثم 2…،
        والبراندات بترتيب 0 تأتي بعدها حسب عدد المنتجات.
      </p>

      {isLoading ? (
        <LoadingSpinner />
      ) : brands.length === 0 ? (
        <EmptyState message="لا توجد براندات — أضف براندًا جديدًا" />
      ) : visible.length === 0 ? (
        <EmptyState message="لا يوجد براند مطابق للبحث" />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {visible.map((b) => (
              <article key={b.id} className="card p-3 flex items-center gap-3">
                <BrandLogo brand={b} className="h-14 w-14 text-lg border border-gray-100 dark:border-gray-700" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <BrandName brand={b} />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span>{b.products_count} منتج</span>
                    <span>· ترتيب {b.sort_order || 'تلقائي'}</span>
                  </div>
                  <StatusToggle brand={b} onToggle={toggleMutation.mutate} busy={toggleMutation.isPending} />
                </div>
                <BrandActions brand={b} onEdit={openForm} onDelete={handleDelete} />
              </article>
            ))}
          </div>

          <div className="hidden md:block">
            <TableScroll>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>الصورة</th>
                    <th>اسم البراند</th>
                    <th>عدد المنتجات</th>
                    <th>الترتيب</th>
                    <th>الحالة</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <BrandLogo brand={b} className="h-12 w-12 text-base border border-gray-100 dark:border-gray-700" />
                      </td>
                      <td className="max-w-[16rem]">
                        <BrandName brand={b} />
                      </td>
                      <td className="whitespace-nowrap">{b.products_count} منتج</td>
                      <td>{b.sort_order || <span className="text-gray-400">تلقائي</span>}</td>
                      <td>
                        <StatusToggle brand={b} onToggle={toggleMutation.mutate} busy={toggleMutation.isPending} />
                      </td>
                      <td>
                        <BrandActions brand={b} onEdit={openForm} onDelete={handleDelete} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && closeModal()}
        title={editing ? `تعديل البراند «${brandNames(editing).primary}»` : 'إضافة براند'}
        alert={formError}
      >
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="brand-name-ar" className="block text-sm font-medium mb-1">
              اسم البراند <span className="text-red-500">*</span>
            </label>
            <input
              id="brand-name-ar"
              className={`input ${nameError || getFieldError('name_ar') ? 'border-red-400' : ''}`}
              placeholder="مثال: كوتش"
              value={form.name_ar}
              maxLength={100}
              onChange={(e) => {
                setForm({ ...form, name_ar: e.target.value });
                if (e.target.value.trim()) setNameError('');
              }}
            />
            <FieldError message={nameError || getFieldError('name_ar')} />
          </div>

          <div>
            <label htmlFor="brand-name-en" className="block text-sm font-medium mb-1">
              الاسم بالإنجليزية <span className="text-gray-400 font-normal">(اختياري)</span>
            </label>
            <input
              id="brand-name-en"
              className="input"
              dir="ltr"
              placeholder="Coach"
              value={form.name_en}
              maxLength={100}
              onChange={(e) => setForm({ ...form, name_en: e.target.value })}
            />
            <p className="text-xs text-gray-400 mt-1">
              يظهر للعميل ويُستخدم في رابط البراند (مثل /brand/coach) وفي البحث بالإنجليزية.
            </p>
            <FieldError message={getFieldError('name_en')} />
          </div>

          <BrandImageField
            value={form.logo}
            file={pendingFile}
            onFileChange={setPendingFile}
            onRemove={() => setForm({ ...form, logo: '' })}
            error={imageError || getFieldError('logo')}
            onError={setImageError}
            disabled={saving}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="brand-status" className="block text-sm font-medium mb-1">الحالة</label>
              <select
                id="brand-status"
                className="input"
                value={form.is_active ? '1' : '0'}
                onChange={(e) => setForm({ ...form, is_active: e.target.value === '1' })}
              >
                <option value="1">متاح</option>
                <option value="0">غير متاح</option>
              </select>
            </div>
            <div>
              <label htmlFor="brand-sort" className="block text-sm font-medium mb-1">ترتيب الظهور</label>
              <input
                id="brand-sort"
                className="input"
                type="number"
                inputMode="numeric"
                min={0}
                max={9999}
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              />
              <FieldError message={getFieldError('sort_order')} />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">0 = ترتيب تلقائي حسب عدد المنتجات.</p>

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? (pendingFile ? 'جاري رفع الصورة...' : 'جاري الحفظ...') : 'حفظ'}
          </button>
        </form>
      </Modal>
    </div>
  );
}

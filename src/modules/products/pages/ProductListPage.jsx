import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { notifyError } from '@shared/services/toast.service';
import { useFormErrors } from '@shared/hooks/useFormErrors';
import { useListParams } from '@shared/hooks/useListParams';
import { useConfirm } from '@shared/hooks/useConfirm';
import {
  useProducts,
  useProductMeta,
  useSaveProduct,
  useDeleteProduct,
  useSeedDemoProducts,
  useSeedHandbags,
  fetchProduct,
} from '@modules/products/hooks/useProducts';
import { LoadingSpinner, Modal, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { TableScroll } from '@shared/components/TableScroll';
import { ImagePreview } from '@shared/components/ImageUpload';
import { ProductForm } from '@modules/products/forms/ProductForm';
import { formatPrice } from '@core/constants';

function statusBadge(status) {
  return (
    <span
      className={`badge ${status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
    >
      {status}
    </span>
  );
}

function ProductActions({ product, onEdit, onDelete }) {
  return (
    <div className="flex gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onEdit(product.id)}
        className="text-blue-500 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
        aria-label="تعديل"
      >
        <Edit size={16} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(product)}
        className="text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
        aria-label="حذف"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export default function AdminProductsPage() {
  const confirm = useConfirm();
  const { search, setSearch, page, setPage, withExtra } = useListParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const listParams = withExtra({ admin: 'true' });

  const { data, isLoading } = useProducts(listParams);
  const { categories: categoriesData, colors: colorsData, sizes: sizesData, brands: brandsData } = useProductMeta();

  const { formError, clearErrors, applyApiError, getFieldError } = useFormErrors();

  const saveMutation = useSaveProduct({
    onSuccess: () => {
      setModalOpen(false);
      setEditing(null);
      clearErrors();
    },
    onError: applyApiError,
  });

  const deleteMutation = useDeleteProduct();
  // kept for optional seed tools (see commented UI)
  useSeedDemoProducts();
  useSeedHandbags();

  const openCreate = () => {
    setEditing(null);
    clearErrors();
    setModalOpen(true);
  };

  const openEdit = async (id) => {
    try {
      const product = await fetchProduct(id);
      setEditing(product);
      clearErrors();
      setModalOpen(true);
    } catch (err) {
      notifyError(err);
    }
  };

  const handleDelete = async (p) => {
    const ok = await confirm({
      title: 'حذف المنتج',
      message: `هل أنت متأكد من حذف «${p.name_ar}»؟ لا يمكن التراجع عن هذه العملية.`,
      confirmText: 'حذف',
      variant: 'danger',
    });
    if (ok) deleteMutation.mutate(p.id);
  };

  const products = data?.data || [];
  const pagination = data?.pagination;
  const lookup = {
    categories: categoriesData?.data?.data,
    colors: colorsData?.data?.data,
    sizes: sizesData?.data?.data,
    brands: brandsData?.data?.data,
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold">المنتجات</h1>
        <div className="flex flex-col xs:flex-row sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو SKU..." />
          <button type="button" onClick={openCreate} className="btn-primary w-full sm:w-auto">
            <Plus size={18} /> إضافة منتج
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState message="لا توجد منتجات — أضف منتجاً جديداً" />
      ) : (
        <>
          {/* Mobile / iPhone: card list */}
          <div className="md:hidden space-y-3">
            {products.map((p) => (
              <article key={p.id} className="card p-3 flex gap-3 items-start">
                <div className="shrink-0">
                  <ImagePreview url={p.primary_image} size="md" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-semibold text-sm leading-snug line-clamp-2">{p.name_ar}</h2>
                      {p.has_variants ? (
                        <span className="text-xs text-gray-500">متغيرات</span>
                      ) : null}
                    </div>
                    <ProductActions product={p} onEdit={openEdit} onDelete={handleDelete} />
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <div>
                      <dt className="text-gray-400">SKU</dt>
                      <dd className="font-medium truncate">{p.sku || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">السعر</dt>
                      <dd className="font-medium text-primary-600">{formatPrice(p.price)}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">المخزون</dt>
                      <dd className="font-medium">{p.total_stock ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">الحالة</dt>
                      <dd className="mt-0.5">{statusBadge(p.status)}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>

          {/* Tablet / desktop: scrollable table */}
          <div className="hidden md:block">
            <TableScroll>
              <table className="admin-table sticky-cols">
                <thead>
                  <tr>
                    <th>صورة</th>
                    <th>المنتج</th>
                    <th>SKU</th>
                    <th>السعر</th>
                    <th>المخزون</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <ImagePreview url={p.primary_image} />
                      </td>
                      <td>
                        <div className="font-medium max-w-[14rem] truncate">{p.name_ar}</div>
                        {p.has_variants ? <span className="text-xs text-gray-500">متغيرات</span> : null}
                      </td>
                      <td className="whitespace-nowrap">{p.sku || '—'}</td>
                      <td className="whitespace-nowrap">{formatPrice(p.price)}</td>
                      <td>{p.total_stock}</td>
                      <td>{statusBadge(p.status)}</td>
                      <td>
                        <ProductActions product={p} onEdit={openEdit} onDelete={handleDelete} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          </div>

          <Pagination pagination={pagination} page={page} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          clearErrors();
        }}
        title={editing ? 'تعديل منتج' : 'إضافة منتج'}
        size="xl"
        alert={formError}
      >
        <ProductForm
          initial={editing}
          categories={lookup.categories}
          colors={lookup.colors}
          sizes={lookup.sizes}
          brands={lookup.brands}
          loading={saveMutation.isPending}
          onSubmit={(payload) => saveMutation.mutate({ id: editing?.id, data: payload })}
          getFieldError={getFieldError}
        />
      </Modal>
    </div>
  );
}

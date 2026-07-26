import { useState } from 'react';
import { Plus, Edit, Trash2, Sparkles } from 'lucide-react';
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
  fetchProduct,
} from '@modules/products/hooks/useProducts';
import { LoadingSpinner, Modal, EmptyState } from '@shared/ui';
import { SearchInput, Pagination } from '@shared/components/ListControls';
import { ImagePreview } from '@shared/components/ImageUpload';
import { ProductForm } from '@modules/products/forms/ProductForm';
import { formatPrice } from '@core/constants';

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
  const seedMutation = useSeedDemoProducts();

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

  const products = data?.data || [];
  const pagination = data?.pagination;
  const lookup = {
    categories: categoriesData?.data?.data,
    colors: colorsData?.data?.data,
    sizes: sizesData?.data?.data,
    brands: brandsData?.data?.data,
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">المنتجات</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو SKU..." />
          <button
            onClick={async () => {
              const ok = await confirm({
                title: 'منتجات تجريبية',
                message: 'سيتم إضافة منتجات تجريبية إلى قاعدة البيانات. هل تريد المتابعة؟',
                confirmText: 'إضافة',
                variant: 'warning',
              });
              if (ok) seedMutation.mutate();
            }}
            disabled={seedMutation.isPending}
            className="btn-secondary"
          >
            <Sparkles size={16} /> منتجات تجريبية
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus size={18} /> إضافة
          </button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : products.length === 0 ? (
        <EmptyState message="لا توجد منتجات — أضف منتجاً أو استخدم «منتجات تجريبية»" />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="text-right p-4">صورة</th>
                  <th className="text-right p-4">المنتج</th>
                  <th className="text-right p-4">SKU</th>
                  <th className="text-right p-4">السعر</th>
                  <th className="text-right p-4">المخزون</th>
                  <th className="text-right p-4">الحالة</th>
                  <th className="text-right p-4">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t dark:border-gray-700">
                    <td className="p-4">
                      <ImagePreview url={p.primary_image} />
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{p.name_ar}</div>
                      {p.has_variants ? <span className="text-xs text-gray-500">متغيرات</span> : null}
                    </td>
                    <td className="p-4">{p.sku || '-'}</td>
                    <td className="p-4">{formatPrice(p.price)}</td>
                    <td className="p-4">{p.total_stock}</td>
                    <td className="p-4">
                      <span
                        className={`badge ${p.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(p.id)} className="text-blue-500 p-2 hover:bg-blue-50 rounded-lg">
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'حذف المنتج',
                              message: `هل أنت متأكد من حذف «${p.name_ar}»؟ لا يمكن التراجع عن هذه العملية.`,
                              confirmText: 'حذف',
                              variant: 'danger',
                            });
                            if (ok) deleteMutation.mutate(p.id);
                          }}
                          className="text-red-500 p-2 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
